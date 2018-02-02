import {Command, parse} from '@anycli/command'
import cli from 'cli-ux'
import * as path from 'path'

export default class Manifest extends Command {
  static title = 'generates plugin manifest json'
  static args = [
    {name: 'path', description: 'path to plugin', default: '.'}
  ]

  options = parse(this.argv, Manifest)

  async run() {
    const root = path.resolve(this.options.args.path)
    const plugin = await this.config.engine.loadPlugin({root, type: 'dev'})
    if (!plugin) throw new Error(`${this.config.name} plugin not found`)
    cli.styledJSON(plugin.manifest)
  }
}
