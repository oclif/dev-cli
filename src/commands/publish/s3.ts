import {Command, flags} from '@oclif/command'
import * as path from 'path'
import * as qq from 'qqjs'

import * as S3 from '../../s3'
import * as Tarballs from '../../tarballs'
import {log as action} from '../../tarballs/log'

export type Manifest = {
  version: string
  channel: string
  sha256gz: string
  sha256xz?: string
}

export default class Publish extends Command {
  static description = 'publish an oclif CLI to S3'

  static flags = {
    root: flags.string({char: 'r', description: 'path to oclif CLI root', default: '.', required: true}),
    'node-version': flags.string({description: 'node version of binary to get', default: process.versions.node, required: true}),
    channel: flags.string({char: 'c', description: 'channel to publish (e.g. "stable" or "beta")', default: 'stable', required: true}),
    bucket: flags.string({char: 'b', description: 's3 bucket to use'}),
    xz: flags.boolean({description: 'also create xz tarballs'}),
  }

  async run() {
    const {flags} = this.parse(Publish)
    if (process.platform === 'win32') throw new Error('pack does not function on windows')
    const {channel, 'node-version': nodeVersion} = flags
    const root = path.resolve(flags.root)
    const config = await Tarballs.config(root)
    const version = channel === 'stable' ? config.version : `${config.version}-${channel}.${await Tarballs.gitSha(config.root, {short: true})}`
    const baseWorkspace = qq.join([config.root, 'tmp', 'base'])
    const targets = config.pjson.oclif.targets
    if (!targets) throw new Error('specify oclif.targets in package.json')

    // first create the generic base workspace that will be copied later
    await Tarballs.build({config, channel, output: baseWorkspace, version})

    const tarballs: {target: string, tarball: string}[] = []
    for (let [platform, arch] of targets.map(t => t.split('-'))) {
      const t = await Tarballs.target({config, platform, arch, channel, version, baseWorkspace, nodeVersion, xz: flags.xz})
      tarballs.push(t)
    }
    const prefix = `${config.bin}/channels/${channel}`
    const Bucket = flags.bucket || process.env.AWS_S3_BUCKET
    if (!Bucket) throw new Error('must pass --bucket or set AWS_S3_BUCKET')
    const upload = async (local: string, remote: string) => {
      await S3.uploadFile(local, {Bucket, Key: remote, ACL: 'public-read'})
    }
    for (let {tarball, target} of tarballs) {
      action(`uploading ${tarball}`)
      const base = path.basename(tarball)
      await upload(`${tarball}.tar.gz`, `${prefix}/${base}/${base}.tar.gz`)
      if (flags.xz) await upload(`${tarball}.tar.xz`, `${prefix}/${base}/${base}.tar.xz`)
      await upload(target, `${prefix}/${path.basename(target)}`)
    }
    action('uploading manifest')
    const versionPath = path.join(config.root, 'dist', version)
    await qq.writeJSON(versionPath, {
      channel,
      version,
    })
    await upload(versionPath, `${prefix}/version`)
    if (config.pjson.scripts.postpublish) {
      await qq.x('npm', ['run', 'postpublish'])
    }
  }
}
