import {Command, flags} from '@oclif/command'
import * as path from 'path'
import * as qq from 'qqjs'

import * as S3 from '../s3'
import * as Tarballs from '../tarballs'
import {log as action} from '../tarballs/log'

export type Manifest = {
  version: string
  channel: string
  sha256gz: string
  sha256xz?: string
}

export default class Publish extends Command {
  static description = `publish an oclif CLI

Can publish either to S3 or as GitHub releases.
`

  static flags = {
    root: flags.string({char: 'r', description: 'path to oclif CLI root', default: '.', required: true}),
    targets: flags.string({char: 't', description: 'comma-separated targets to build for (e.g. darwin-x64, win32-x86)', required: true}),
    'node-version': flags.string({description: 'node version of binary to get', default: process.versions.node, required: true}),
    channel: flags.string({char: 'c', description: 'channel to publish (e.g. "stable" or "beta")', required: true}),
    bucket: flags.string({char: 'b', description: 's3 bucket to use'}),
    xz: flags.boolean({description: 'also create xz tarballs'}),
  }

  async run() {
    const {flags} = this.parse(Publish)
    if (process.platform === 'win32') throw new Error('pack does not function on windows')
    const {channel, 'node-version': nodeVersion} = flags
    const root = path.resolve(flags.root)
    const config = await Tarballs.config(root)
    const version = await Tarballs.version(config)
    const baseWorkspace = qq.join([config.root, 'tmp', 'base'])

    // first create the generic base workspace that will be copied later
    await Tarballs.build({config, channel, output: baseWorkspace, version})

    const tarballs: [string, string][] = []
    for (let [platform, arch] of flags.targets.split(',').map(t => t.split('-'))) {
      const base = await Tarballs.base(config, platform, arch, version)
      action(`building ${base}`)
      const targetWorkspace = qq.join([config.root, 'tmp', base])
      await qq.rm(targetWorkspace)
      await qq.cp(baseWorkspace, targetWorkspace)
      await Tarballs.writeBinScripts({config, output: targetWorkspace, platform})
      await Tarballs.fetchNodeBinary({
        nodeVersion,
        output: path.join(targetWorkspace, 'bin', 'node'),
        platform,
        arch,
        tmp: qq.join([config.root, 'tmp']),
      })
      const tarball = path.join(config.root, 'dist', base)
      const target = path.join(config.root, 'dist', [platform, arch].join('-'))
      tarballs.push([tarball, target])
      await Tarballs.pack({from: targetWorkspace, to: tarball, as: config.bin, xz: flags.xz})
      const manifest: Manifest = {
        channel,
        version,
        sha256gz: await qq.hash('sha256', `${tarball}.tar.gz`),
      }
      if (flags.xz) manifest.sha256xz = await qq.hash('sha256', `${tarball}.tar.xz`)
      await qq.writeJSON(target, manifest)
    }
    if (flags.bucket) {
      const prefix = `${config.bin}/channels/${channel}`
      const Bucket = flags.bucket
      const upload = async (local: string, remote: string) => {
        await S3.uploadFile(local, {Bucket, Key: remote, ACL: 'public-read'})
      }
      for (let [t, target] of tarballs) {
        action(`uploading ${t}`)
        const base = path.basename(t)
        await upload(`${t}.tar.gz`, `${prefix}/${base}/${base}.tar.gz`)
        if (flags.xz) await upload(`${t}.tar.xz`, `${prefix}/${base}/${base}.tar.xz`)
        await upload(target, `${prefix}/${path.basename(target)}`)
      }
      action('uploading manifest')
      const versionPath = path.join(config.root, 'dist', version)
      await qq.writeJSON(versionPath, {
        channel,
        version,
      })
      await upload(versionPath, `${prefix}/version`)
    }
    if (config.pjson.scripts.postpublish) {
      await qq.x('npm', ['run', 'postpublish'])
    }
  }
}
