import * as Config from '@oclif/config'
import * as _ from 'lodash'
import * as path from 'path'
import * as qq from 'qqjs'

export interface ITarget {
  platform: string
  arch: string
  keys: {
    tarball: { gz: string, xz: string }
    manifest: string
  }
}

function gitSha(cwd: string, options: {short?: boolean} = {}) {
  const args = options.short ? ['rev-parse', '--short', 'HEAD'] : ['rev-parse', 'HEAD']
  return qq.x.stdout('git', args, {cwd})
}

async function Tmp(config: Config.IConfig) {
  const tmp = path.join(config.root, 'tmp')
  await qq.mkdirp(tmp)
  return tmp
}

export async function buildConfig(root: string, channel: string) {
  const config = await Config.load({root, devPlugins: false, userPlugins: false})
  const _gitSha = await gitSha(config.root, {short: true})
  const version = channel === 'stable' ? config.version : `${config.version}-${channel}.${_gitSha}`
  const tmp = await Tmp(config)
  const updateConfig = config.pjson.oclif.update
  const templateOpts = {
    config,
    channel,
    version,
    name: config.name,
    bin: config.bin,
  }
  const vanillaTarball = _.template(updateConfig.s3.templates.vanillaTarball)(templateOpts)
  const tConfig = {
    root,
    gitSha: _gitSha,
    config,
    vanilla: {
      tarball: {gz: vanillaTarball + '.tar.gz', xz: vanillaTarball + '.tar.xz'},
      manifest: _.template(updateConfig.s3.templates.vanillaManifest)(templateOpts),
    },
    tmp,
    updateConfig,
    version,
    channel,
    dist: (...args: string[]) => path.join(config.root, 'dist', ...args),
    s3Config: updateConfig.s3,
    gz: updateConfig.s3.gz === false,
    xz: updateConfig.s3.xz,
    nodeVersion: updateConfig.node.version || process.versions.node,
    baseWorkspace: path.join(config.root, 'tmp', config.bin),
    targetWorkspace(platform: string, arch: string) {
      return qq.join([config.root, 'tmp', [config.bin, platform, arch].join('-'), config.bin])
    },
    targets: (updateConfig.node.targets || []).map((t): ITarget => {
      const [platform, arch] = t.split('-')
      const key = _.template(updateConfig.s3.templates.platformTarball)({...templateOpts, platform, arch})
      const manifest = _.template(updateConfig.s3.templates.platformManifest)({...templateOpts, platform, arch})
      return {
        platform,
        arch,
        keys: {
          manifest,
          tarball: {gz: key + '.tar.gz', xz: key + '.tar.xz'},
        },
      }
    }),
  }
  return tConfig
}
