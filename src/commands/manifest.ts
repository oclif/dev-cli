// tslint:disable no-implicit-dependencies

import {Command} from '@anycli/command'
import * as Config from '@anycli/config'
import * as fs from 'fs'
import * as path from 'path'

export default class Manifest extends Command {
  static title = 'generates plugin manifest json'
  static args = [
    {name: 'path', description: 'path to plugin', default: '.'}
  ]

  async run() {
    const {args} = this.parse(Manifest)
    const root = path.resolve(args.path)
    let plugin = new Config.Plugin({root, type: 'dev', ignoreManifest: true})
    if (!plugin) throw new Error('plugin not found')
    if (!plugin.valid) {
      delete Config.Plugin.loadedPlugins[plugin.root]
      const {PluginLegacy} = require('@anycli/plugin-legacy')
      delete plugin.name
      plugin = new PluginLegacy(this.config, plugin)
    }
    if (process.env.ANYCLI_NEXT_VERSION) {
      plugin.manifest.version = process.env.ANYCLI_NEXT_VERSION
    }
    const file = path.join(plugin.root, '.anycli.manifest.json')
    fs.writeFileSync(file, JSON.stringify(plugin.manifest))
    this.log(`wrote manifest to ${file}`)
  }
}
