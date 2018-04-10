import {ArchTypes, PlatformTypes} from '@oclif/config'
import * as path from 'path'
import * as qq from 'qqjs'

import {log} from '../log'

import {writeBinScripts} from './bin'
import {IConfig, IManifest} from './config'
import {fetchNodeBinary} from './node'

const pack = async (from: string, to: string) => {
  const prevCwd = qq.cwd()
  qq.cd(path.dirname(from))
  await qq.mkdirp(path.dirname(to))
  log(`packing tarball from ${qq.prettifyPaths(from)} to ${qq.prettifyPaths(to)}`)
  await (to.endsWith('gz')
    ? qq.x('tar', ['czf', to, path.basename(from)])
    : qq.x(`tar c ${path.basename(from)} | xz > ${to}`))
  qq.cd(prevCwd)
}

export async function build(c: IConfig) {
  const {xz, config} = c
  const prevCwd = qq.cwd()
  const packCLI = async () => {
    const stdout = await qq.x.stdout('npm', ['pack'], {cwd: c.root})
    return path.join(c.root, stdout.split('\n').pop()!)
  }
  const extractCLI = async (tarball: string) => {
    await qq.emptyDir(c.workspace())
    await qq.mv(tarball, c.workspace())
    tarball = path.basename(tarball)
    tarball = qq.join([c.workspace(), tarball])
    qq.cd(c.workspace())
    await qq.x(`tar -xzf ${tarball}`)
    for (let f of await qq.ls('package', {fullpath: true})) await qq.mv(f, '.')
    await qq.rm('package', tarball, 'bin/run.cmd')
  }
  const updatePJSON = async () => {
    qq.cd(c.workspace())
    const pjson = await qq.readJSON('package.json')
    pjson.version = c.version
    pjson.oclif.update.s3.bucket = c.s3Config.bucket
    await qq.writeJSON('package.json', pjson)
  }
  const addDependencies = async () => {
    qq.cd(c.workspace())
    const yarn = await qq.exists.sync([c.root, 'yarn.lock'])
    if (yarn) {
      await qq.cp([c.root, 'yarn.lock'], '.')
      await qq.x('yarn --no-progress --production --non-interactive')
    } else {
      await qq.cp([c.root, 'package-lock.json'], '.')
      await qq.x('npm install --production')
    }
  }
  const prune = async () => {
    // removes unnecessary files to make the tarball smaller
    qq.cd(c.workspace())
    const toRemove = await qq.globby([
      'node_modules/**/README*',
      '**/CHANGELOG*',
      '**/*.ts',
    ], {nocase: true})
    await qq.rm(...toRemove)
    await qq.rmIfEmpty('.')
  }
  const buildTarget = async (target: {platform: PlatformTypes, arch: ArchTypes}) => {
    const workspace = c.workspace(target)
    const key = config.s3Key('versioned', '.tar.gz', target)
    const base = path.basename(key)
    log(`building target ${base}`)
    await qq.rm(workspace)
    await qq.cp(c.workspace(), workspace)
    await fetchNodeBinary({
      nodeVersion: c.nodeVersion,
      output: path.join(workspace, 'bin', 'node'),
      platform: target.platform,
      arch: target.arch,
      tmp: qq.join(config.root, 'tmp'),
    })
    await pack(workspace, c.dist(key))
    if (xz) await pack(workspace, c.dist(config.s3Key('versioned', '.tar.xz', target)))
    const manifest: IManifest = {
      rollout: (typeof c.updateConfig.autoupdate === 'object' && c.updateConfig.autoupdate.rollout) as number,
      version: c.version,
      channel: c.channel,
      baseDir: config.s3Key('baseDir', target),
      gz: config.s3Url(config.s3Key('versioned', '.tar.gz', target)),
      xz: xz ? config.s3Url(config.s3Key('versioned', '.tar.xz', target)) : undefined,
      sha256gz: await qq.hash('sha256', c.dist(config.s3Key('versioned', '.tar.gz', target))),
      sha256xz: xz ? await qq.hash('sha256', c.dist(config.s3Key('versioned', '.tar.xz', target))) : undefined,
      node: {
        compatible: config.pjson.engines.node,
        recommended: c.nodeVersion,
      }
    }
    await qq.writeJSON(c.dist(config.s3Key('manifest', target)), manifest)
  }
  const buildBaseTarball = async () => {
    await pack(c.workspace(), c.dist(config.s3Key('versioned', '.tar.gz')))
    if (xz) await pack(c.workspace(), c.dist(config.s3Key('versioned', '.tar.xz')))
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
  await prune()
  await writeBinScripts({config, baseWorkspace: c.workspace(), nodeVersion: c.nodeVersion})
  await buildBaseTarball()
  for (let target of c.targets) await buildTarget(target)
  qq.cd(prevCwd)
}
