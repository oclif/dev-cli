import * as Config from '@oclif/config'
import {CLIError} from '@oclif/errors'
import * as _ from 'lodash'
import * as path from 'path'
import * as qq from 'qqjs'
import {URL} from 'url'

export interface IConfig {
  root: string
  gitSha: string
  config: Config.IConfig
  baseWorkspace: string
  nodeVersion: string
  version: string
  tmp: string
  updateConfig: IConfig['config']['pjson']['oclif']['update']
  s3Config: IConfig['updateConfig']['s3']
  channel: string
  xz: boolean
  vanilla: {
    tarball: Tarball
    urls: Tarball
    manifest: string
    baseDir: string
  }
  targets: ITarget[]
  targetWorkspace(platform: string, arch: string): string
  dist(input: string): string
}

export interface ITarget {
  platform: string
  arch: string
  urls: {
    tarball: Tarball
  }
  keys: {
    tarball: Tarball
    manifest: string
    baseDir: string
  }
  manifest?: ITargetManifest
}

export type Tarball = {gz: string, xz?: string}

export interface ITargetManifest {
  version: string
  channel: string
  gz: string
  xz?: string
  sha256gz: string
  sha256xz?: string
  baseDir: string
}

export interface IManifest extends ITargetManifest {
  rollout?: number
  node: {
    compatible: string
    recommended: string
  }
  targets?: {
    [target: string]: Pick<IManifest, 'gz' | 'xz' | 'sha256gz' | 'sha256xz'>
  }
}

export function gitSha(cwd: string, options: {short?: boolean} = {}) {
  const args = options.short ? ['rev-parse', '--short', 'HEAD'] : ['rev-parse', 'HEAD']
  return qq.x.stdout('git', args, {cwd})
}

async function Tmp(config: Config.IConfig) {
  const tmp = path.join(config.root, 'tmp')
  await qq.mkdirp(tmp)
  return tmp
}

export async function buildConfig(root: string): Promise<IConfig> {
  const config = await Config.load({root: path.resolve(root), devPlugins: false, userPlugins: false})
  const channel = config.channel
  root = config.root
  const _gitSha = await gitSha(root, {short: true})
  const version = config.version.includes('-') ? `${config.version}.${_gitSha}` : config.version
  const tmp = await Tmp(config)
  const updateConfig = config.pjson.oclif.update
  const s3Host = updateConfig.s3.host!
  if (!s3Host) throw new CLIError('must set oclif.update.s3.bucket in package.json')
  const templateOpts = {...config, version}
  const vanillaTarball: {gz: string, xz?: string} = {gz: _.template(updateConfig.s3.templates.vanillaTarball)(templateOpts) + '.tar.gz'}
  const gzUrl = new URL(s3Host)
  gzUrl.pathname = path.join(gzUrl.pathname, vanillaTarball.gz)
  const vanillaUrls: {gz: string, xz?: string} = {gz: gzUrl.toString()}
  const xz = !!updateConfig.s3.xz
  const vanillaBaseDir = _.template(updateConfig.s3.templates.vanillaBaseDir)(templateOpts)
  if (xz) {
    vanillaTarball.xz = vanillaTarball.gz.replace(/\.gz$/, '.xz')
    vanillaUrls.xz = vanillaUrls.gz.replace(/\.gz$/, '.xz')
  }
  const tConfig: IConfig = {
    root,
    gitSha: _gitSha,
    config,
    vanilla: {
      tarball: vanillaTarball,
      urls: vanillaUrls,
      baseDir: vanillaBaseDir,
      manifest: _.template(updateConfig.s3.templates.vanillaManifest)(templateOpts),
    },
    tmp,
    updateConfig,
    version,
    channel,
    xz,
    dist: (...args: string[]) => path.join(config.root, 'dist', ...args),
    s3Config: updateConfig.s3,
    nodeVersion: updateConfig.node.version || process.versions.node,
    baseWorkspace: path.join(config.root, 'tmp', vanillaBaseDir),
    targetWorkspace(platform: string, arch: string) {
      const baseDir = _.template(updateConfig.s3.templates.platformBaseDir)({...templateOpts, platform, arch})
      return qq.join([config.root, 'tmp', [config.bin, platform, arch].join('-'), baseDir])
    },
    targets: (updateConfig.node.targets || []).map((t): ITarget => {
      const [platform, arch] = t.split('-')
      const key = _.template(updateConfig.s3.templates.platformTarball)({...templateOpts, platform, arch})
      const manifest = _.template(updateConfig.s3.templates.platformManifest)({...templateOpts, platform, arch})
      const keys: ITarget['keys'] = {
        manifest,
        tarball: {gz: key + '.tar.gz'},
        baseDir: _.template(updateConfig.s3.templates.vanillaBaseDir)(templateOpts),
      }
      const gzUrl = new URL(s3Host)
      gzUrl.pathname = path.join(gzUrl.pathname, keys.tarball.gz)
      const urls: ITarget['urls'] = {
        tarball: {gz: gzUrl.toString()}
      }
      if (xz) {
        keys.tarball.xz = keys.tarball.gz.replace(/\.gz$/, '.xz')
        urls.tarball.xz = urls.tarball.gz.replace(/\.gz$/, '.xz')
      }
      return {
        platform,
        arch,
        keys,
        urls,
      }
    }),
  }
  return tConfig
}
