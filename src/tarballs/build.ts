import * as path from 'path'
import * as qq from 'qqjs'

import {writeBinScripts} from './bin'
import {buildConfig, ITarget} from './config'
import {log} from './log'
import {fetchNodeBinary} from './node'

export interface Manifest {
  version: string
  channel: string
  sha256gz: string
  sha256xz?: string
}

const pack = async (from: string, to: string, type: 'gz' | 'xz') => {
  const prevCwd = qq.cwd()
  qq.cd(path.dirname(from))
  await qq.mkdirp(path.dirname(to))
  log(`packing tarball from ${qq.prettifyPaths(from)} to ${qq.prettifyPaths(to)}`)
  await (type === 'gz'
    ? qq.x('tar', ['czf', to, path.basename(from)])
    : qq.x(`tar c ${path.basename(from)} | xz > ${to}`))
  qq.cd(prevCwd)
}

export async function build(root: string, channel = 'stable'): ReturnType<typeof buildConfig> {
  const t = await buildConfig(root, channel)
  const {config, baseWorkspace, nodeVersion, version, xz} = t
  const prevCwd = qq.cwd()
  const packCLI = async () => {
    qq.cd(t.root)
    if (t.config.pjson.scripts.prepublishOnly) await qq.x('npm', ['run', 'prepublishOnly'])
    return qq.x.stdout('npm', ['pack'])
  }
  const extractCLI = async (tarball: string) => {
    await qq.emptyDir(t.baseWorkspace)
    await qq.mv(tarball, t.baseWorkspace)
    tarball = qq.join([t.baseWorkspace, tarball])
    qq.cd(t.baseWorkspace)
    await qq.x(`tar -xzf ${tarball}`)
    for (let f of await qq.ls('package', {fullpath: true})) await qq.mv(f, '.')
    await qq.rm('package', tarball, 'bin/run.cmd')
  }
  const updatePJSON = async () => {
    qq.cd(t.baseWorkspace)
    const pjson = await qq.readJSON('package.json')
    pjson.version = t.version
    pjson.channel = t.channel
    await qq.writeJSON('package.json', pjson)
  }
  const addDependencies = async () => {
    qq.cd(t.baseWorkspace)
    const yarn = await qq.exists.sync([t.root, 'yarn.lock'])
    if (yarn) {
      await qq.cp([t.root, 'yarn.lock'], '.')
      await qq.x('yarn --no-progress --production --non-interactive')
    } else {
      await qq.cp([t.root, 'package-lock.json'], '.')
      await qq.x('npm install --production')
    }
  }
  const prune = async () => {
    // removes unnecessary files to make the tarball smaller
    qq.cd(t.baseWorkspace)
    const toRemove = await qq.globby([
      'node_modules/**/README*',
      '**/CHANGELOG*',
      '**/*.ts',
    ], {nocase: true})
    await qq.rm(...toRemove)
    await qq.rmIfEmpty('.')
  }
  const buildTarget = async (target: ITarget) => {
    const {platform, arch} = target
    const targetWorkspace = t.targetWorkspace(platform, arch)
    const base = t.base(platform, arch)
    log(`building ${base}`)
    await qq.rm(targetWorkspace)
    await qq.cp(baseWorkspace, targetWorkspace)
    await fetchNodeBinary({
      nodeVersion,
      output: path.join(targetWorkspace, 'bin', 'node'),
      platform,
      arch,
      tmp: qq.join([config.root, 'tmp']),
    })
    await pack(targetWorkspace, target.tarball('gz'), 'gz')
    const manifest: Manifest = {
      channel,
      version,
      sha256gz: await qq.hash('sha256', target.tarball('gz')),
    }
    if (xz) manifest.sha256xz = await qq.hash('sha256', target.tarball('xz'))
    await qq.writeJSON(target.manifest, manifest)
  }
  log(`packing ${t.config.bin} to ${t.baseWorkspace}`)
  await extractCLI(await packCLI())
  await updatePJSON()
  await addDependencies()
  await prune()
  await writeBinScripts(t)
  await pack(baseWorkspace, t.baseTarball('gz'), 'gz')
  for (let target of t.targets) await buildTarget(target)
  qq.cd(prevCwd)
  return t
}
