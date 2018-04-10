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
  const buildTarget = async (target: {platform: string, arch: string}) => {
    const workspace = c.workspace(target)
    const key = c.path('versioned', {ext: '.tar.gz', ...target})
    const base = path.basename(key)
    log(`building target ${base}`)
    await qq.rm(workspace)
    await qq.cp(c.workspace(), workspace)
    await fetchNodeBinary({
      nodeVersion: c.nodeVersion,
      output: path.join(workspace, 'bin', 'node'),
      platform: target.platform,
      arch: target.arch,
      tmp: qq.join(c.config.root, 'tmp'),
    })
    await pack(workspace, c.dist(key))
    if (c.xz) await pack(workspace, c.dist(c.path('versioned', {ext: '.tar.xz', ...target})))
    const manifest: IManifest = {
      rollout: (typeof c.updateConfig.autoupdate === 'object' && c.updateConfig.autoupdate.rollout) as number,
      version: c.version,
      channel: c.channel,
      baseDir: c.path('baseDir', target),
      gz: c.s3Url(c.path('versioned', {ext: '.tar.gz', ...target})),
      xz: c.xz ? c.s3Url(c.path('versioned', {ext: '.tar.xz', ...target})) : undefined,
      sha256gz: await qq.hash('sha256', c.dist(c.path('versioned', {ext: '.tar.gz', ...target}))),
      sha256xz: c.xz ? await qq.hash('sha256', c.dist(c.path('versioned', {ext: '.tar.xz', ...target}))) : undefined,
      node: {
        compatible: c.config.pjson.engines.node,
        recommended: c.nodeVersion,
      }
    }
    await qq.writeJSON(c.dist(c.path('manifest', target)), manifest)
  }
  const buildBaseTarball = async () => {
    await pack(c.workspace(), c.dist(c.path('versioned', {ext: '.tar.gz'})))
    if (c.xz) await pack(c.workspace(), c.dist(c.path('versioned', {ext: '.tar.xz'})))
    const manifest: IManifest = {
      version: c.version,
      baseDir: c.path('baseDir'),
      channel: c.config.channel,
      gz: c.s3Url(c.path('versioned', {ext: '.tar.gz'})),
      xz: c.s3Url(c.path('versioned', {ext: '.tar.xz'})),
      sha256gz: await qq.hash('sha256', c.dist(c.path('versioned', {ext: '.tar.gz'}))),
      sha256xz: c.xz ? await qq.hash('sha256', c.dist(c.path('versioned', {ext: '.tar.xz'}))) : undefined,
      rollout: (typeof c.updateConfig.autoupdate === 'object' && c.updateConfig.autoupdate.rollout) as number,
      node: {
        compatible: c.config.pjson.engines.node,
        recommended: c.nodeVersion,
      },
    }
    await qq.writeJSON(c.dist(c.path('manifest')), manifest)
  }
  log(`gathering workspace for ${c.config.bin} to ${c.workspace()}`)
  await extractCLI(await packCLI())
  await updatePJSON()
  await addDependencies()
  await prune()
  await writeBinScripts({config: c.config, baseWorkspace: c.workspace(), nodeVersion: c.nodeVersion})
  await buildBaseTarball()
  for (let target of c.targets) await buildTarget(target)
  qq.cd(prevCwd)
}
