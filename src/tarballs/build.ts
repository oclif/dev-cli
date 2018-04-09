import * as path from 'path'
import * as qq from 'qqjs'

import {log} from '../log'

import {writeBinScripts} from './bin'
import {IConfig, IManifest, ITarget} from './config'
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

export async function build({
  config,
  baseWorkspace,
  nodeVersion,
  version,
  dist,
  targetWorkspace,
  vanilla,
  targets,
  updateConfig,
  root,
  s3Config
}: IConfig) {
  const prevCwd = qq.cwd()
  const packCLI = async () => {
    const stdout = await qq.x.stdout('npm', ['pack'], {cwd: root})
    return path.join(root, stdout.split('\n').pop()!)
  }
  const extractCLI = async (tarball: string) => {
    await qq.emptyDir(baseWorkspace)
    await qq.mv(tarball, baseWorkspace)
    tarball = path.basename(tarball)
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
    pjson.oclif.update.s3.bucket = s3Config.bucket
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
    if (target.keys.tarball.xz) await pack(workspace, dist(target.keys.tarball.xz))
    target.manifest = {
      version,
      gz: target.urls.tarball.gz,
      xz: target.urls.tarball.xz,
      sha256gz: await qq.hash('sha256', dist(target.keys.tarball.gz)),
      sha256xz: target.keys.tarball.xz ? (await qq.hash('sha256', dist(target.keys.tarball.xz))) : undefined,
    }
    await qq.writeJSON(dist(target.keys.manifest), target.manifest)
  }
  const buildBaseTarball = async () => {
    await pack(baseWorkspace, dist(vanilla.tarball.gz))
    if (vanilla.tarball.xz) await pack(baseWorkspace, dist(vanilla.tarball.xz))
  }
  const buildBaseManifest = async () => {
    const manifest: IManifest = {
      version,
      gz: vanilla.urls.gz,
      xz: vanilla.urls.xz,
      sha256gz: await qq.hash('sha256', dist(vanilla.tarball.gz)),
      sha256xz: vanilla.tarball.xz ? await qq.hash('sha256', dist(vanilla.tarball.xz)) : undefined,
      rollout: (typeof updateConfig.autoupdate === 'object' && updateConfig.autoupdate.rollout) as number,
      node: {
        compatible: config.pjson.engines.node,
        recommended: nodeVersion,
      },
      targets: targets.reduce((targets, t) => {
        targets![`${t.platform}-${t.arch}`] = {
          gz: t.urls.tarball.gz,
          xz: t.urls.tarball.xz,
          sha256gz: t.manifest!.sha256gz,
          sha256xz: t.manifest!.sha256xz,
        }
        return targets
      }, {} as IManifest['targets'])
    }
    await qq.writeJSON(dist(vanilla.manifest), manifest)
  }
  log(`gathering workspace for ${config.bin} to ${baseWorkspace}`)
  await extractCLI(await packCLI())
  await updatePJSON()
  await addDependencies()
  await prune()
  await writeBinScripts({config, baseWorkspace, nodeVersion})
  await buildBaseTarball()
  for (let target of targets) await buildTarget(target)
  await buildBaseManifest()
  qq.cd(prevCwd)
}
