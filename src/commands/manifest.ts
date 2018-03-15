// tslint:disable no-implicit-dependencies

import {Command} from '@oclif/command'
import * as Config from '@oclif/config'
import * as fs from 'fs'
import * as path from 'path'

export default class Manifest extends Command {
  static description = 'generates plugin manifest json'
  static args = [
    {name: 'path', description: 'path to plugin', default: '.'}
  ]

  capturePluginWarning(warning: Error) {
    if (warning.name.match(/Plugin:/)) { throw warning }
  }

  async run() {
    try { fs.unlinkSync('.oclif.manifest.json') } catch {}
    const {args} = this.parse(Manifest)
    const root = path.resolve(args.path)
    let plugin = new Config.Plugin({root, type: 'core', ignoreManifest: true})
    if (!plugin) throw new Error('plugin not found')
    process.addListener('warning', this.capturePluginWarning)
    try {
      await plugin.load()
      // Wait for event queue to flush so we get any potential warning.
      await new Promise(resolve => process.nextTick(resolve))
    } finally {
      // Clean up
      process.removeListener('warning', this.capturePluginWarning)
    }
    if (!plugin.valid) {
      // @ts-ignore
      let p = require.resolve('@oclif/plugin-legacy', {paths: [process.cwd()]})
      const {PluginLegacy} = require(p)
      delete plugin.name
      plugin = new PluginLegacy(this.config, plugin)
      await plugin.load()
    }
    if (process.env.OCLIF_NEXT_VERSION) {
      plugin.manifest.version = process.env.OCLIF_NEXT_VERSION
    }
    const file = path.join(plugin.root, '.oclif.manifest.json')
    fs.writeFileSync(file, JSON.stringify(plugin.manifest))
    this.log(`wrote manifest to ${file}`)
  }
}
