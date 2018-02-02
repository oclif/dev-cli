import {Command, parse} from '@anycli/command'
import cli from 'cli-ux'

export default class Manifest extends Command {
  static title = 'generates plugin manifest json'

  options = parse(this.argv, Manifest)

  async run() {
    const plugin = this.config.engine.plugins.find(p => p.name === this.config.name)
    if (!plugin) throw new Error(`${this.config.name} plugin not found`)
    const commands = await this.config.engine.getPluginCommands(plugin)

    cli.styledJSON({
      version: plugin.version,
      commands,
    })
  }
}
