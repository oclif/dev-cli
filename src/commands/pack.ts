import {Command, flags} from '@oclif/command'
import * as qq from 'qqjs'

import * as Tarballs from '../tarballs'

export default class Manifest extends Command {
  static description = `packages oclif cli into tarballs

This can be used to create oclif CLIs that use the system node or that come preloaded with a node binary.
`

  static flags = {
    root: flags.string({char: 'r', description: 'path to oclif CLI root', default: '.', required: true}),
    channel: flags.string({char: 'c', description: 'channel to publish (e.g. "stable" or "beta")', default: 'stable', required: true}),
  }

  async run() {
    const prevCwd = qq.cwd()
    if (process.platform === 'win32') throw new Error('pack does not function on windows')
    const {flags} = this.parse(Manifest)
    const {channel} = flags
    const buildConfig = await Tarballs.buildConfig(flags.root, channel)
    await Tarballs.build(buildConfig)
    qq.cd(prevCwd)
  }
}
