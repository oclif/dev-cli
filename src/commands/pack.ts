import {Command, flags} from '@oclif/command'
import * as path from 'path'
import * as qq from 'qqjs'

import * as Tarballs from '../tarballs'

export default class Manifest extends Command {
  static description = `
packages oclif cli into tarballs

This can be used to create oclif CLIs that use the system node or that come preloaded with a node binary.
The default output will be ./dist/mycli-v0.0.0.tar.gz for tarballs without node or ./dist/mycli-v0.0.0-darwin-x64.tar.gz when node is included.

By default it will not include node. To include node, pass in the --platform and --arch flags.
`
  static examples = [
    `$ oclif-dev pack
outputs tarball of CLI in current directory to ./dist/mycli-v0.0.0.tar.gz`,
    `$ oclif-dev pack --platform win32 --arch x64
outputs tarball of CLI including a windows-x64 binary to ./dist/mycli-v0.0.0-win32-x64.tar.gz`,
  ]

  static flags = {
    output: flags.string({char: 'o', description: 'output location'}),
    root: flags.string({char: 'r', description: 'path to oclif CLI root', default: '.', required: true}),
    'node-version': flags.string({description: 'node version of binary to get', default: process.versions.node, required: true}),
    platform: flags.string({char: 'p', description: 'OS to use for node binary', options: ['darwin', 'linux', 'win32']}),
    arch: flags.string({char: 'a', description: 'arch to use for node binary', options: ['x64', 'x86', 'arm']}),
    channel: flags.string({char: 'c', description: 'channel to publish (e.g. "stable" or "beta")', required: true}),
    xz: flags.boolean({description: 'also create xz tarballs'}),
  }

  async run() {
    const prevCwd = qq.cwd()
    if (process.platform === 'win32') throw new Error('pack does not function on windows')
    const {flags} = this.parse(Manifest)
    const {channel, platform, arch} = flags
    const root = path.resolve(flags.root)
    if (platform && !arch) throw new Error('--platform and --arch must be specified together')

    const config = await Tarballs.config(root)
    const version = channel === 'stable' ? config.version : `${config.version}-${channel}.${await Tarballs.gitSha(config.root)}`
    const base = await Tarballs.base(config, platform, arch, version)
    const tmp = await Tarballs.tmp(config)
    const workspace = path.join(tmp, base)

    await Tarballs.build({config, channel, output: workspace, version})
    await Tarballs.writeBinScripts({config, output: workspace, platform})
    if (platform && arch) {
      await Tarballs.fetchNodeBinary({
        nodeVersion: flags['node-version'],
        output: path.join(workspace, 'bin', 'node'),
        platform,
        arch,
        tmp,
      })
    }

    const tarball = flags.output ? path.resolve(flags.output) : path.join(process.cwd(), 'dist', base)
    await Tarballs.pack({from: workspace, to: tarball, as: config.bin, xz: flags.xz})
    qq.cd(prevCwd)
  }
}
