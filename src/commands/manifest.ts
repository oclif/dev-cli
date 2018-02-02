import {Command, flags, parse} from '@anycli/command'
import cli from 'cli-ux'
import * as fs from 'fs-extra'
import * as path from 'path'

export default class Manifest extends Command {
  static title = 'generates plugin manifest json'
  static flags = {
    out: flags.string({char: 'o', description: 'output to file at path'}),
  }
  static args = [
    {name: 'path', description: 'path to plugin', default: '.'}
  ]

  options = parse(this.argv, Manifest)

  async run() {
    const root = path.resolve(this.options.args.path)
    const plugin = await this.config.engine.loadPlugin({root, type: 'dev'})
    if (!plugin) throw new Error(`${this.config.name} plugin not found`)
    if (process.env.ANYCLI_NEXT_VERSION) {
      plugin.manifest.version = process.env.ANYCLI_NEXT_VERSION
    }
    if (this.options.flags.out) {
      await fs.outputJSON(this.options.flags.out, plugin.manifest)
    } else {
      cli.styledJSON(plugin.manifest)
    }
  }
}
