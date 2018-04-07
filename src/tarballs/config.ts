import * as Config from '@oclif/config'
import * as path from 'path'
import * as qq from 'qqjs'

export async function version(config: Config.IConfig) {
  if (!await qq.exists('.git')) return config.version
  // add git sha to version if in a git repo
  const sha = (await qq.x.stdout('git', ['rev-parse', '--short', 'HEAD'], {cwd: config.root}))
  return `${config.version}-${sha}`
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
