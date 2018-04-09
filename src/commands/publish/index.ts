import {Command, flags} from '@oclif/command'
import * as qq from 'qqjs'

import {log} from '../../log'
import * as s3 from '../../s3'
import * as Tarballs from '../../tarballs'

export default class Publish extends Command {
  static description = 'publish an oclif CLI to S3'

  static flags = {
    root: flags.string({char: 'r', description: 'path to oclif CLI root', default: '.', required: true}),
  }

  buildConfig!: ReturnType<typeof Tarballs.buildConfig> extends Promise<infer U> ? U : never

  async run() {
    const {flags} = this.parse(Publish)
    if (process.platform === 'win32') throw new Error('publish does not function on windows')
    this.buildConfig = await Tarballs.buildConfig(flags.root)
    const {s3Config, targets, vanilla, dist, version} = this.buildConfig
    if (!await qq.exists(dist(vanilla.tarball.gz))) this.error('run "oclif-dev pack" before publishing')
    const S3Options = {
      Bucket: s3Config.bucket!,
      ACL: 'public-read',
    }
    // for (let target of targets) await this.uploadNodeBinary(target)
    const ManifestS3Options = {...S3Options, CacheControl: 'max-age=86400', ContentType: 'application/json'}
    const uploadTarball = async (tarball: {gz: string, xz?: string}) => {
      const TarballS3Options = {...S3Options, CacheControl: 'max-age=604800'}
      await s3.uploadFile(dist(tarball.gz), {...TarballS3Options, ContentType: 'application/gzip', Key: tarball.gz})
      if (tarball.xz) await s3.uploadFile(dist(tarball.xz), {...TarballS3Options, ContentType: 'application/x-xz', Key: tarball.xz})
    }
    log('uploading vanilla')
    await uploadTarball(vanilla.tarball)
    if (targets.length) log('uploading targets')
    for (const target of targets) {
      await uploadTarball(target.keys.tarball)
      await s3.uploadFile(dist(target.keys.manifest), {...ManifestS3Options, Key: target.keys.manifest})
    }
    log('uploading main manifest')
    await s3.uploadFile(dist(vanilla.manifest), {...ManifestS3Options, Key: vanilla.manifest})
    log(`published ${version}`)
  }

  // private async uploadNodeBinary(target: Tarballs.ITarget) {
  //   const {platform, arch} = target
  //   log('checking for node binary %s-%s in S3', platform, arch)
  //   const {nodeVersion, dist, tmp, s3Config} = this.buildConfig
  //   let key = path.join('node', `node-v${nodeVersion}`, `node-v${nodeVersion}-${platform}-${arch}`)
  //   let Key = (platform === 'win32' ? `${key}.exe` : key) + '.gz'
  //   try {
  //     await s3.headObject({Bucket: s3Config.bucket!, Key})
  //   } catch (err) {
  //     if (err.code !== 'NotFound') throw err
  //     log('uploading node binary %s-%s', target.platform, target.arch)
  //     let output = dist(key)
  //     output = await Tarballs.fetchNodeBinary({nodeVersion, platform, arch, output, tmp})
  //     await qq.x('gzip', ['-f', output])
  //     await s3.uploadFile(output + '.gz', {Bucket: s3Config.bucket!, Key})
  //   }
  // }
}
