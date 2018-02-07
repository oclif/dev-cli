// tslint:disable no-implicit-dependencies

import {Command} from '@anycli/command'
import * as Config from '@anycli/config'
import * as fs from 'fs'
import * as path from 'path'

export default class Manifest extends Command {
  static description = 'generates plugin manifest json'
  static args = [
    {name: 'path', description: 'path to plugin', default: '.'}
  ]

  async run() {
    try { fs.unlinkSync('.anycli.manifest.json') } catch {}
    const {args} = this.parse(Manifest)
    const root = path.resolve(args.path)
    let plugin = new Config.Plugin({root, type: 'core', ignoreManifest: true})
    if (!plugin) throw new Error('plugin not found')
    if (!plugin.valid) {
      // @ts-ignore
      let p = require.resolve('@anycli/plugin-legacy', {paths: [process.cwd()]})
      const {PluginLegacy} = require(p)
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
