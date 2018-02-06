// tslint:disable no-implicit-dependencies

import {Command} from '@anycli/command'
import * as Config from '@anycli/config'
import Help from '@anycli/plugin-help'
import * as fs from 'fs-extra'
import * as path from 'path'

import {compact, sortBy, uniqBy} from '../util'

const normalize = require('normalize-package-data')

export default class Readme extends Command {
  static description = 'adds commands to readme'

  static aliases = ['c', 'd']

  async run() {
    const config = Config.load({root: process.cwd()})
    try {
      let p = require.resolve('@anycli/plugin-legacy')
      config.plugins.push(new Config.Plugin({root: p}))
    } catch {}
    await config.runHook('init', {id: 'readme', argv: this.argv})
    let readme = await fs.readFile('README.md', 'utf8')
    // if (readme.includes('<!-- toc -->')) {
    // } else this.warn('<!-- toc --> not found in README')
    readme = this.commands(config, readme)

    console.log(readme)
  }

  commands(config: Config.IConfig, readme: string): string {
    const help = new Help(config, {stripAnsi: true, maxWidth: 120})
    const build = (): string => {
      let commands = this.config.commands
      commands = commands.filter(c => !c.hidden)
      commands = uniqBy(commands, c => c.id)
      commands = sortBy(commands, c => c.id)
      const renderCommand = (level: number) => (c: Config.Command): string => {
        const header = () => '#'.repeat(level) + ` ${c.id}`
        const code = () => {
          let pluginName = c.pluginName
          if (!pluginName) return
          let plugin = config.plugins.concat([config]).find(p => p.name === c.pluginName)
          if (!plugin) return
          normalize(plugin.pjson)
          let repo = plugin.pjson.repository
          let commandsDir = plugin.pjson.anycli.commands
          if (!repo || !repo.url || !commandsDir) return
          commandsDir = commandsDir.replace(/\.\//, '')
          if (plugin.name === this.config.name) pluginName = path.join(__dirname, '../..')
          let commandPath = require.resolve(`${pluginName}/${commandsDir}/${c.id.replace(/:/g, '/')}`)
          commandPath = commandPath.replace(path.dirname(require.resolve(`${pluginName}/package.json`)) + '/', '')
          if (plugin.pjson.devDependencies.typescript) {
            commandPath = commandPath.replace(/^lib\//, 'src/')
            commandPath = commandPath.replace(/\.js$/, '.ts')
          }
          repo = repo.url.split('+')[1].replace(/\.git$/, '')
          return `_See code: [${plugin.name}](${repo}/blob/master/${commandPath})_`
          // return `_From plugin: [${plugin.name}](${plugin.pjson.homepage})_`
        }
        const subcommands = (): string | undefined => {
          return commands
          .filter(sc => sc.id.startsWith(c.id) && sc.id !== c.id)
          .map(renderCommand(level + 1))
          .map(c => c.trim())
          .join('\n\n')
        }
        return compact([
          header(),
          '```\n' + help.command(c).trim() + '\n```',
          code(),
          subcommands(),
        ]).join('\n\n')
      }
      let rootCommands = commands.filter(c => !c.id.includes(':'))

      return [
        '<!-- commands -->',
        '# Commands\n',
        ...commands.map(c => {
          return `* [${c.id}](#${c.id.replace(/:/g, '')})`
        }),
        ...rootCommands.map(renderCommand(2)).map(s => s.trim() + '\n'),
        '<!-- commandsstop -->',
      ].join('\n').trim()
    }
    if (readme.includes('<!-- commands -->')) {
      if (readme.includes('<!-- commandsstop -->')) {
        // clear out current commands
        readme = readme.replace(/<!-- commands -->(.|\n)*<!-- commandsstop -->/m, '<!-- commands -->')
      }
      readme = readme.replace(/<!-- commands -->/, build())
    } else {
      // add commands to end
      readme += `\n${build()}`
    }
    return readme
  }
}
