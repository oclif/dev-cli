import * as Config from '@oclif/config'
import * as path from 'path'
import * as qq from 'qqjs'

export interface ITarget {
  platform: string
  arch: string
  manifest: string
  tarball(type: 'xz' | 'gz'): string
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
  const updateConfig = config.pjson.oclif.update || {}
  const output = path.join(root, 'dist')
  const tConfig = {
    root,
    gitSha: _gitSha,
    base(platform: string | undefined, arch: string | undefined) {
      let base = [config.bin, `v${version}`].join('-')
      if (platform && arch) {
        base = [base, platform, arch].join('-')
      }
      return base
    },
    config,
    tmp,
    updateConfig,
    version,
    channel,
    output,
    baseTarball: (type: 'xz' | 'gz') => path.join(output, `${config.bin}-v${version}.tar.${type}`),
    gz: updateConfig.s3 && updateConfig.s3.gz === false,
    xz: updateConfig.s3 && updateConfig.s3.xz,
    nodeVersion: (updateConfig.node && updateConfig.node.version) || process.versions.node,
    baseWorkspace: path.join(config.root, 'tmp', config.bin),
    targetWorkspace(platform: string, arch: string) {
      return qq.join([config.root, 'tmp', this.base(platform, arch), config.bin])
    },
    s3Config: updateConfig.s3 || {},
    targets: (updateConfig.node && updateConfig.node.targets || []).map((t): ITarget => {
      const [platform, arch] = t.split('-')
      return {
        platform,
        arch,
        tarball: (type: 'gz' | 'xz') => path.join(output, tConfig.base(platform, arch) + `.tar.${type}`),
        manifest: path.join(output, [platform, arch].join('-')),
      }
    }),
  }
  return tConfig
}
