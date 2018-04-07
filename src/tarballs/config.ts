import * as Config from '@oclif/config'
import * as path from 'path'
import * as qq from 'qqjs'

export function gitSha(cwd: string, options: {short?: boolean} = {}) {
  const args = options.short ? ['rev-parse', '--short', 'HEAD'] : ['rev-parse', 'HEAD']
  return qq.x.stdout('git', args, {cwd})
}

export async function base(config: Config.IConfig, platform: string | undefined, arch: string | undefined, version: string) {
  let base = [config.bin, `v${version}`].join('-')
  if (platform && arch) {
    base = [base, platform, arch].join('-')
  }
  return base
}

export async function tmp(config: Config.IConfig) {
  const tmp = path.join(config.root, 'tmp')
  await qq.mkdirp(tmp)
  return tmp
}

export const config = (root: string) => Config.load({root, devPlugins: false, userPlugins: false})
