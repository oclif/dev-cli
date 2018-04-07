import {Command, flags} from '@oclif/command'
import * as path from 'path'

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
  }

  async run() {
    const {flags} = this.parse(Publish)
    if (process.platform === 'win32') throw new Error('publish:s3 does not function on windows')
    const {channel} = flags
    const root = path.resolve(flags.root)

    const {config, s3Config, targets, version, baseTarball, xz, versionPath} = await Tarballs.build(root, channel)

    // TODO: handle s3Prefix
    const prefix = `${config.bin}/channels/${channel}`
    if (!s3Config.bucket) throw new Error('must set oclif.update.s3.bucket in package.json')
    const S3Options = {
      Bucket: s3Config.bucket,
      ACL: 'public-read',
    }
    const uploadTarball = async (tarball: (type: 'gz' | 'xz') => string) => {
      const base = path.basename(tarball('gz'), '.tar.gz')
      const versionlessBase = base.replace(`-v${version}`, '')
      await S3.uploadFile(tarball('gz'), {...S3Options, Key: `${prefix}/${base}/${base}.tar.gz`, CacheControl: 'max-age=604800'})
      await S3.uploadFile(tarball('gz'), {...S3Options, Key: `${prefix}/${versionlessBase}.tar.gz`, CacheControl: 'max-age=86400'})
      if (xz) {
        await S3.uploadFile(tarball('xz'), {...S3Options, Key: `${prefix}/${base}/${base}.tar.xz`, CacheControl: 'max-age=604800'})
        await S3.uploadFile(tarball('xz'), {...S3Options, Key: `${prefix}/${versionlessBase}.tar.xz`, CacheControl: 'max-age=86400'})
      }
    }
    await uploadTarball(baseTarball)
    for (const target of targets) {
      await uploadTarball(target.tarball)
      await S3.uploadFile(target.manifest, {...S3Options, Key: `${prefix}/${path.basename(target.manifest)}`, CacheControl: 'max-age=86400'})
    }
    action('uploading manifest')
    await S3.uploadFile(versionPath, {...S3Options, Key: `${prefix}/version`, CacheControl: 'max-age=86400'})
  }
}
