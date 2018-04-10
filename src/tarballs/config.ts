import * as Config from '@oclif/config'
import {CLIError} from '@oclif/errors'
import * as _ from 'lodash'
import * as path from 'path'
import * as qq from 'qqjs'
import {URL} from 'url'

export namespace IConfig {
  export type PathTypes = 'manifest' | 'baseDir' | 'versioned' | 'unversioned'
  export type PathOptions = {
    platform?: string
    arch?: string
    [key: string]: any
  }
}

export interface IConfig {
  root: string
  gitSha: string
  config: Config.IConfig
  nodeVersion: string
  version: string
  tmp: string
  updateConfig: IConfig['config']['pjson']['oclif']['update']
  s3Config: IConfig['updateConfig']['s3']
  channel: string
  xz: boolean
  targets: {platform: string, arch: string}[]
  workspace(target?: {platform: string, arch: string}): string
  path(type: IConfig.PathTypes, options?: IConfig.PathOptions): string
  s3Url(key: string): string
  dist(input: string): string
}

export interface IManifest {
  version: string
  channel: string
  gz: string
  xz?: string
  sha256gz: string
  sha256xz?: string
  baseDir: string
  rollout?: number
  node: {
    compatible: string
    recommended: string
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
  return {
    root,
    gitSha: _gitSha,
    config,
    tmp,
    updateConfig,
    version,
    channel,
    xz: !!updateConfig.s3.xz,
    dist: (...args: string[]) => path.join(config.root, 'dist', ...args),
    s3Config: updateConfig.s3,
    nodeVersion: updateConfig.node.version || process.versions.node,
    workspace(target) {
      const base = qq.join(config.root, 'tmp')
      if (target && target.platform) return qq.join(base, [target.platform, target.arch].join('-'), this.path('baseDir', target))
      return qq.join(base, this.path('baseDir', target))
    },
    path(type, options = {}) {
      const t = this.s3Config.templates[options.platform ? 'target' : 'vanilla'][type]
      return _.template(t)({...config, version, ...options})
    },
    s3Url(key) {
      const url = new URL(s3Host)
      url.pathname = path.join(url.pathname, key)
      return url.toString()
    },
    targets: (updateConfig.node.targets || []).map(t => {
      const [platform, arch] = t.split('-')
      return {platform, arch}
    }),
  }
}
