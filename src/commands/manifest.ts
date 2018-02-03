import {Command, Config} from '@anycli/command'
import cli from 'cli-ux'
import * as fs from 'fs-extra'
import * as path from 'path'

export default class Manifest extends Command {
  static title = 'generates plugin manifest json'
  static args = [
    {name: 'path', description: 'path to plugin', default: '.'}
  ]

  async run() {
    const {args} = this.parse(Manifest)
    const root = path.resolve(args.path)
    const plugin = new Config.Plugin({root, type: 'dev', ignoreManifest: true})
    if (!plugin) throw new Error('plugin not found')
    if (process.env.ANYCLI_NEXT_VERSION) {
      plugin.manifest.version = process.env.ANYCLI_NEXT_VERSION
    }
    const file = path.join(plugin.root, '.anycli.manifest.json')
    await fs.outputJSON(file, plugin.manifest)
    cli.info(`wrote manifest to ${file}`)
  }
}
