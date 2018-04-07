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

    const {s3Config, targets, vanilla, xz, dist} = await Tarballs.build(root, channel)

    //  dev-cli/channels/stable/oclif-dev-v1.7.12-darwin-x64/oclif-dev-v1.7.12-darwin-x64.tar.xz
    if (!s3Config.bucket) throw new Error('must set oclif.update.s3.bucket in package.json')
    const S3Options = {
      Bucket: s3Config.bucket,
      ACL: 'public-read',
    }
    const ManifestS3Options = {...S3Options, CacheControl: 'max-age=86400', ContentType: 'application/json'}
    const uploadTarball = async (tarball: {gz: string, xz: string}) => {
      const TarballS3Options = {...S3Options, CacheControl: 'max-age=604800'}
      await S3.uploadFile(dist(tarball.gz), {...TarballS3Options, ContentType: 'application/gzip', Key: tarball.gz})
      if (xz) await S3.uploadFile(dist(tarball.xz), {...TarballS3Options, ContentType: 'application/x-xz', Key: tarball.xz})
    }
    await uploadTarball(vanilla.tarball)
    for (const target of targets) {
      await uploadTarball(target.keys.tarball)
      await S3.uploadFile(dist(target.keys.manifest), {...ManifestS3Options, Key: target.keys.manifest})
    }
    action('uploading manifest')
    await S3.uploadFile(dist(vanilla.manifest), {...ManifestS3Options, Key: vanilla.manifest})
  }
}
