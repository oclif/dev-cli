import {ArchTypes, PlatformTypes} from '@oclif/config'
import * as Errors from '@oclif/errors'
import * as findYarnWorkspaceRoot from 'find-yarn-workspace-root'
import * as path from 'path'
import * as qq from 'qqjs'
import * as tar from 'tar'
import * as fs from 'fs-extra'
import streamPipeline = require('stream.pipeline-shim');
import {promisify} from 'util'
import {pool} from 'workerpool'

const pipeline = promisify(streamPipeline)

import {log} from '../log'

import {writeBinScripts} from './bin'
import {IConfig, IManifest} from './config'
import {fetchNodeBinary, downloadSHASums} from './node'

const gzipPool = pool(path.join(__dirname, './gzip-worker.js'))

async function gzip(filePath: string, target: string) {
  await gzipPool.exec('gzip', [filePath, target])
}

function targetNodeLocation(target: any, config: IConfig) {
  const workspace = config.workspace(target)
  return path.join(workspace, 'bin', 'node')
}

const pack = async (from: string, to: string) => {
  const toDir = path.dirname(to)
  const fromBase = path.basename(from)

  await qq.mkdirp(toDir)

  log(`packing tarball from ${qq.prettifyPaths(from)} to ${qq.prettifyPaths(to)}`)

  const tarStream = tar.c(
    {
      gzip: false,
      cwd: path.dirname(from),
    },
    [fromBase],
  )

  await pipeline(tarStream, fs.createWriteStream(to))
}

function tarballBasePath(c: IConfig) {
  const {config} = c
  return c.dist(config.s3Key('versioned', '.tar.gz')).replace('.tar.gz', '.tar')
}

async function doBuild(c: IConfig, options: {
  platform?: string;
  pack?: boolean;
} = {}) {
  const {xz, config} = c
  const baseTarballPath = tarballBasePath(c)
  const prevCwd = qq.cwd()
  const packCLI = async () => {
    const stdout = await qq.x.stdout('npm', ['pack', '--unsafe-perm'], {cwd: c.root})
    return path.join(c.root, stdout.split('\n').pop()!)
  }
  const extractCLI = async (tarball: string) => {
    await qq.emptyDir(c.workspace())
    await tar.x({
      file: tarball,
      stripComponents: 1,
      cwd: c.workspace()
    })
    await qq.mkdirp(path.dirname(baseTarballPath))
    await qq.mv(tarball, baseTarballPath)
    // await qq.rm('package', tarball, 'bin/run.cmd')
  }
  const updatePJSON = async () => {
    qq.cd(c.workspace())
    const pjson = await qq.readJSON('package.json')
    pjson.version = c.version
    pjson.oclif.update = pjson.oclif.update || {}
    pjson.oclif.update.s3 = pjson.oclif.update.s3 || {}
    pjson.oclif.update.s3.bucket = c.s3Config.bucket
    await qq.writeJSON('package.json', pjson)
  }
  const addDependencies = async () => {
    qq.cd(c.workspace())
    const yarnRoot = findYarnWorkspaceRoot(c.root) || c.root
    const yarn = await qq.exists([yarnRoot, 'yarn.lock'])
    if (yarn) {
      await qq.cp([yarnRoot, 'yarn.lock'], '.')
      await qq.x('yarn --no-progress --production --non-interactive')
    } else {
      let lockpath = qq.join(c.root, 'package-lock.json')
      if (!await qq.exists(lockpath)) {
        lockpath = qq.join(c.root, 'npm-shrinkwrap.json')
      }
      await qq.cp(lockpath, '.')
      await qq.x('npm install --production')
    }
  }
  const buildTarget = async (target: {platform: PlatformTypes; arch: ArchTypes}) => {
    const workspace = c.workspace(target)
    const key = config.s3Key('versioned', '.tar.gz', target)
    const tarballPath = key.replace('tar.gz', 'tar')

    const base = path.basename(key)
    const tarballDist = c.dist(tarballPath)
    const nodePath = targetNodeLocation(target, c)
    const workspaceParent = path.dirname(workspace)

    log(`building target ${base}`)
    if (xz) {
      const baseXZ = base.replace('.tar.gz', '.tar.xz')
      log(`building target ${baseXZ}`)
    }

    await qq.cp(baseTarballPath, tarballDist)

    await tar.replace({
      file: tarballDist,
      cwd: workspaceParent,
    }, [path.relative(workspaceParent, nodePath)])

    if (options.pack === false) return
    await compress(tarballDist, xz)
    if (!c.updateConfig.s3.host) return
    await writeManifest(target, c, config, xz)
  }
  const buildBaseTarball = async () => {
    await pack(c.workspace(), baseTarballPath)
    if (options.pack === false) return
    await compress(baseTarballPath, xz)
    if (!c.updateConfig.s3.host) {
      Errors.warn('No S3 bucket or host configured. CLI will not be able to update.')
      return
    }

    const manifest: IManifest = {
      version: c.version,
      baseDir: config.s3Key('baseDir'),
      channel: config.channel,
      gz: config.s3Url(config.s3Key('versioned', '.tar.gz')),
      xz: config.s3Url(config.s3Key('versioned', '.tar.xz')),
      sha256gz: await qq.hash('sha256', c.dist(config.s3Key('versioned', '.tar.gz'))),
      sha256xz: xz ? await qq.hash('sha256', c.dist(config.s3Key('versioned', '.tar.xz'))) : undefined,
      rollout: (typeof c.updateConfig.autoupdate === 'object' && c.updateConfig.autoupdate.rollout) as number,
      node: {
        compatible: config.pjson.engines.node,
        recommended: c.nodeVersion,
      },
    }

    await qq.writeJSON(c.dist(config.s3Key('manifest')), manifest)
  }
  log(`gathering workspace for ${config.bin} to ${c.workspace()}`)
  await extractCLI(await packCLI())
  await updatePJSON()
  await addDependencies()
  await writeBinScripts({config, baseWorkspace: c.workspace(), nodeVersion: c.nodeVersion})
  await buildBaseTarball()
  await writeManifest(undefined, c, config, xz)
  await downloadNodeBinaries(c)
  const targetsToBuild =
    options.platform ?
      c.targets.filter(t => options.platform === t.platform) :
      c.targets
  const buildPromises = targetsToBuild.map(buildTarget)
  await Promise.all(buildPromises)
  log('done building')

  qq.cd(prevCwd)
}

export async function build(c: IConfig, options: {
  platform?: string;
  pack?: boolean;
} = {}) {
  try {
    await doBuild(c, options)
  } finally {
    await gzipPool.terminate()
  }
}

async function writeManifest(target: any, c: IConfig, config: IConfig['config'], xz: boolean) {
  const rollout = (typeof c.updateConfig.autoupdate === 'object' && c.updateConfig.autoupdate.rollout)
  const gz = config.s3Key('versioned', '.tar.gz', target)

  let manifest: IManifest = {
    rollout: rollout === false ? undefined : rollout,
    version: c.version,
    channel: c.channel,
    baseDir: config.s3Key('baseDir', target),
    gz: config.s3Url(gz),
    sha256gz: await qq.hash('sha256', c.dist(gz)),
    node: {
      compatible: config.pjson.engines.node,
      recommended: c.nodeVersion,
    },
  }

  if (xz) {
    const s3XZ = config.s3Key('versioned', '.tar.xz', target)
    manifest = {
      ...manifest,
      xz: config.s3Url(s3XZ),
      sha256xz: await qq.hash('sha256', c.dist(s3XZ)),
    }
  }

  await qq.writeJSON(c.dist(config.s3Key('manifest', target)), manifest)
}

async function compress(tarballPath: string, xz: boolean) {
  const gzpath = tarballPath + '.gz'
  const gzipPromise = gzip(tarballPath, gzpath)
  const promises: Promise<any>[] = [gzipPromise]

  if (xz) {
    promises.push(qq.x(`xz -T0 --compress --force --keep ${tarballPath}`))
  }

  await Promise.all(promises)
}

async function downloadNodeBinaries(config: IConfig) {
  const shasums = await downloadSHASums(config.nodeVersion)
  const promises = config.targets.map(async target => {
    await fetchNodeBinary({
      nodeVersion: config.nodeVersion,
      output: targetNodeLocation(target, config),
      platform: target.platform,
      arch: target.arch,
      tmp: qq.join(config.root, 'tmp'),
      shasums,
    })
  })

  await Promise.all(promises)
}
