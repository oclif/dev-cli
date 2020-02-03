import * as Config from '@oclif/config'
import * as fs from 'fs'
import * as path from 'path'
import * as qq from 'qqjs'

import {compact} from '../util'

const TARGETS = [
  'linux-x64',
  'linux-arm',
  'win32-x64',
  'win32-x86',
  'darwin-x64',
]

// eslint-disable-next-line @typescript-eslint/interface-name-prefix
export interface IConfig {
  root: string;
  vcsRevision: string | null;
  config: Config.IConfig;
  nodeVersion: string;
  version: string;
  tmp: string;
  updateConfig: IConfig['config']['pjson']['oclif']['update'];
  s3Config: IConfig['updateConfig']['s3'];
  channel: string;
  xz: boolean;
  targets: {platform: Config.PlatformTypes; arch: Config.ArchTypes}[];
  workspace(target?: {platform: Config.PlatformTypes; arch: Config.ArchTypes}): string;
  dist(input: string): string;
}

// eslint-disable-next-line @typescript-eslint/interface-name-prefix
export interface IManifest {
  version: string;
  channel: string;
  gz: string;
  xz?: string;
  sha256gz: string;
  sha256xz?: string;
  baseDir: string;
  rollout?: number;
  node: {
    compatible: string;
    recommended: string;
  };
}

function isGitRepo(cwd: string): boolean {
  const dir = path.join(cwd, '.git')
  return fs.existsSync(dir) && fs.lstatSync(dir).isDirectory()
}

function gitSha(cwd: string, options: {short?: boolean} = {}): Promise<string> {
  const args = options.short ? ['rev-parse', '--short', 'HEAD'] : ['rev-parse', 'HEAD']
  return qq.x.stdout('git', args, {cwd})
}

export function getVcsRevision(cwd: string, options: {short?: boolean} = {}): Promise<string | null> {
  if (isGitRepo(cwd)) {
    return gitSha(cwd, options)
  }
  return Promise.resolve(null)
}

async function Tmp(config: Config.IConfig) {
  const tmp = path.join(config.root, 'tmp')
  await qq.mkdirp(tmp)
  return tmp
}

export async function buildConfig(root: string, options: {xz?: boolean; targets?: string[]} = {}): Promise<IConfig> {
  const config = await Config.load({root: path.resolve(root), devPlugins: false, userPlugins: false})
  const channel = config.channel
  root = config.root
  const _vcsRevision = await getVcsRevision(root, {short: true})
  const version = config.version.includes('-') && _vcsRevision !== null ? `${config.version}.${_vcsRevision}` : config.version
  // eslint-disable-next-line new-cap
  const tmp = await Tmp(config)
  const updateConfig = config.pjson.oclif.update || {}
  updateConfig.s3 = updateConfig.s3 || {}
  return {
    root,
    vcsRevision: _vcsRevision,
    config,
    tmp,
    updateConfig,
    version,
    channel,
    xz: typeof options.xz === 'boolean' ? options.xz : Boolean(updateConfig.s3.xz),
    dist: (...args: string[]) => path.join(config.root, 'dist', ...args),
    s3Config: updateConfig.s3,
    nodeVersion: updateConfig.node.version || process.versions.node,
    workspace(target) {
      const base = qq.join(config.root, 'tmp')
      if (target && target.platform) return qq.join(base, [target.platform, target.arch].join('-'), config.s3Key('baseDir', target))
      return qq.join(base, config.s3Key('baseDir', target))
    },
    targets: compact(options.targets || updateConfig.node.targets || TARGETS).map(t => {
      const [platform, arch] = t.split('-') as [Config.PlatformTypes, Config.ArchTypes]
      return {platform, arch}
    }),
  }
}
