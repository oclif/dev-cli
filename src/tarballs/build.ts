import * as path from 'path'
import * as qq from 'qqjs'

import {writeBinScripts} from './bin'
import {buildConfig, ITarget} from './config'
import {log} from './log'
import {fetchNodeBinary} from './node'

export interface IManifest {
  version: string
  channel: string
  sha256gz: string
  sha256xz?: string
}

export interface IVersionManifest extends IManifest {
  rollout?: number
  node: {
    compatible: string
    recommended: string
  }
}

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

export async function build(root: string, channel = 'stable'): ReturnType<typeof buildConfig> {
  const t = await buildConfig(root, channel)
  const {config, baseWorkspace, nodeVersion, version, xz, dist, targetWorkspace, vanilla, targets, updateConfig} = t
  const prevCwd = qq.cwd()
  const packCLI = async () => {
    qq.cd(root)
    if (config.pjson.scripts.prepublishOnly) await qq.x('npm', ['run', 'prepublishOnly'])
    return qq.x.stdout('npm', ['pack'])
  }
  const extractCLI = async (tarball: string) => {
    await qq.emptyDir(baseWorkspace)
    await qq.mv(tarball, baseWorkspace)
    tarball = qq.join([baseWorkspace, tarball])
    qq.cd(baseWorkspace)
    await qq.x(`tar -xzf ${tarball}`)
    for (let f of await qq.ls('package', {fullpath: true})) await qq.mv(f, '.')
    await qq.rm('package', tarball, 'bin/run.cmd')
  }
  const updatePJSON = async () => {
    qq.cd(baseWorkspace)
    const pjson = await qq.readJSON('package.json')
    pjson.version = version
    pjson.channel = channel
    await qq.writeJSON('package.json', pjson)
  }
  const addDependencies = async () => {
    qq.cd(baseWorkspace)
    const yarn = await qq.exists.sync([root, 'yarn.lock'])
    if (yarn) {
      await qq.cp([root, 'yarn.lock'], '.')
      await qq.x('yarn --no-progress --production --non-interactive')
    } else {
      await qq.cp([root, 'package-lock.json'], '.')
      await qq.x('npm install --production')
    }
  }
  const prune = async () => {
    // removes unnecessary files to make the tarball smaller
    qq.cd(baseWorkspace)
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
    const workspace = targetWorkspace(platform, arch)
    const base = path.basename(target.keys.tarball.gz, '.tar.gz')
    log(`building target ${base}`)
    await qq.rm(workspace)
    await qq.cp(baseWorkspace, workspace)
    await fetchNodeBinary({
      nodeVersion,
      output: path.join(workspace, 'bin', 'node'),
      platform,
      arch,
      tmp: qq.join([config.root, 'tmp']),
    })
    await pack(workspace, dist(target.keys.tarball.gz))
    if (xz) await pack(workspace, dist(target.keys.tarball.xz))
    const manifest: IManifest = {
      version,
      channel,
      sha256gz: await qq.hash('sha256', dist(target.keys.tarball.gz)),
      sha256xz: xz ? (await qq.hash('sha256', dist(target.keys.tarball.xz))) : undefined,
    }
    await qq.writeJSON(dist(target.keys.manifest), manifest)
  }
  const buildBaseTarball = async () => {
    await pack(baseWorkspace, dist(vanilla.tarball.gz))
    if (xz) await pack(baseWorkspace, dist(vanilla.tarball.xz))
    await qq.writeJSON(dist(vanilla.manifest), {
      version,
      channel,
      sha256gz: await qq.hash('sha256', dist(vanilla.tarball.gz)),
      sha256xz: xz ? await qq.hash('sha256', dist(vanilla.tarball.xz)) : undefined,
      rollout: typeof updateConfig.autoupdate === 'object' && updateConfig.autoupdate.rollout,
      node: {
        compatible: config.pjson.engines.node,
        recommended: nodeVersion,
      },
    } as IVersionManifest)
  }
  log(`packing ${config.bin} to ${baseWorkspace}`)
  await extractCLI(await packCLI())
  await updatePJSON()
  await addDependencies()
  await prune()
  await writeBinScripts(t)
  await buildBaseTarball()
  for (let target of targets) await buildTarget(target)
  qq.cd(prevCwd)
  return t
}
