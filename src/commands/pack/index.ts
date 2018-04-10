import {Command, flags} from '@oclif/command'
import * as qq from 'qqjs'

import * as Tarballs from '../../tarballs'

export default class Pack extends Command {
  static description = `packages oclif cli into tarballs

This can be used to create oclif CLIs that use the system node or that come preloaded with a node binary.
`

  static flags = {
    root: flags.string({char: 'r', description: 'path to oclif CLI root', default: '.', required: true}),
  }

  async run() {
    const prevCwd = qq.cwd()
    if (process.platform === 'win32') throw new Error('pack does not function on windows')
    const {flags} = this.parse(Pack)
    const buildConfig = await Tarballs.buildConfig(flags.root)
    await Tarballs.build(buildConfig)
    qq.cd(prevCwd)
  }
}
