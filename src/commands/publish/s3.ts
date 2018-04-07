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
    channel: flags.string({char: 'c', description: 'channel to publish (e.g. "stable" or "beta")', default: 'stable', required: true}),
    xz: flags.boolean({description: 'also create xz tarballs'}),
  }

  async run() {
    const {flags} = this.parse(Publish)
    if (process.platform === 'win32') throw new Error('publish:s3 does not function on windows')
    const {channel} = flags
    const root = path.resolve(flags.root)

    const {config, s3Config, targets, version, updateConfig, nodeVersion} = await Tarballs.build(root, channel)

    // TODO: handle s3Prefix
    const prefix = `${config.bin}/channels/${channel}`
    const Bucket = s3Config.bucket
    if (!Bucket) throw new Error('must set oclif.update.s3.bucket in package.json')
    const upload = async (local: string, remote: string) => {
      action(`uploading ${local} to s3://${Bucket}/${remote}`)
      await S3.uploadFile(local, {Bucket, Key: remote, ACL: 'public-read'})
    }
    for (const target of targets) {
      const base = path.basename(target.tarball('gz'))
      await upload(target.tarball('gz'), `${prefix}/${base}/${base}.tar.gz`)
      if (flags.xz) await upload(target.tarball('xz'), `${prefix}/${base}/${base}.tar.xz`)
      await upload(target.manifest, `${prefix}/${path.basename(target.manifest)}`)
    }
    action('uploading manifest')
    const versionPath = path.join(config.root, 'dist', version)
    await qq.writeJSON(versionPath, {
      channel,
      version,
      rollout: typeof updateConfig.autoupdate === 'object' && updateConfig.autoupdate.rollout,
      node: {
        compatible: config.pjson.engines.node,
        recommended: nodeVersion,
      },
    })
    await upload(versionPath, `${prefix}/version`)
  }
}
