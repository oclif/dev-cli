// tslint:disable no-implicit-dependencies

import {Command, flags} from '@oclif/command'
import * as Config from '@oclif/config'
import Help from '@oclif/plugin-help'
import * as fs from 'fs-extra'
import * as _ from 'lodash'
import * as path from 'path'

import {castArray, compact, sortBy, template, uniqBy} from '../util'

const normalize = require('normalize-package-data')
const columns = parseInt(process.env.COLUMNS!, 10) || 120

function slugify(input: string): string {
  return _.kebabCase(input.trim().replace(/:/g, '')).replace(/[^a-zA-Z0-9\- ]/g, '')
}

export default class Readme extends Command {
  static description = `adds commands to README.md in current directory
The readme must have any of the following tags inside of it for it to be replaced or else it will do nothing:
# Usage
<!-- usage -->
# Commands
<!-- commands -->
`
  static flags = {
    multi: flags.boolean({description: 'create a different markdown page for each topic'})
  }

  async run() {
    const {flags} = this.parse(Readme)
    const config = await Config.load({root: process.cwd(), devPlugins: false, userPlugins: false})
    try {
      // @ts-ignore
      let p = require.resolve('@oclif/plugin-legacy', {paths: [process.cwd()]})
      let plugin = new Config.Plugin({root: p, type: 'core'})
      await plugin.load()
      config.plugins.push(plugin)
    } catch {}
    await config.runHook('init', {id: 'readme', argv: this.argv})
    let readme = await fs.readFile('README.md', 'utf8')
    let commands = config.commands
    commands = commands.filter(c => !c.hidden)
    commands = commands.filter(c => c.pluginType === 'core')
    this.debug('commands:', commands.map(c => c.id).length)
    commands = uniqBy(commands, c => c.id)
    commands = sortBy(commands, c => c.id)
    readme = this.replaceTag(readme, 'usage', this.usage(config))
    readme = this.replaceTag(readme, 'commands', flags.multi ? this.multiCommands(config, commands) : this.commands(config, commands))
    readme = this.replaceTag(readme, 'toc', this.toc(config, readme))

    readme = readme.trimRight()
    readme += '\n'
    await fs.outputFile('README.md', readme)
  }

  replaceTag(readme: string, tag: string, body: string): string {
    if (readme.includes(`<!-- ${tag} -->`)) {
      if (readme.includes(`<!-- ${tag}stop -->`)) {
        readme = readme.replace(new RegExp(`<!-- ${tag} -->(.|\n)*<!-- ${tag}stop -->`, 'm'), `<!-- ${tag} -->`)
      }
      this.log(`replacing <!-- ${tag} --> in README.md`)
    }
    return readme.replace(`<!-- ${tag} -->`, `<!-- ${tag} -->\n${body}\n<!-- ${tag}stop -->`)
  }

  toc(__: Config.IConfig, readme: string): string {
    return readme.split('\n').filter(l => l.startsWith('# '))
    .map(l => l.slice(2))
    .map(l => `* [${l}](#${slugify(l)})`)
    .join('\n')
  }

  usage(config: Config.IConfig): string {
      return [
        `\`\`\`sh-session
$ npm install -g ${config.name}
$ ${config.bin} COMMAND
running command...
$ ${config.bin} (-v|--version|version)
${config.name}/${process.env.OCLIF_NEXT_VERSION || config.version} ${process.platform}-${process.arch} node-v${process.versions.node}
$ ${config.bin} --help [COMMAND]
USAGE
  $ ${config.bin} COMMAND
...
\`\`\`\n`,
      ].join('\n').trim()
  }

  multiCommands(config: Config.IConfig, commands: Config.Command[]): string {
    let topics = config.topics
    topics = topics.filter(t => !t.hidden && !t.name.includes(':'))
    topics = topics.filter(t => commands.find(c => c.id.startsWith(t.name)))
    topics = sortBy(topics, t => t.name)
    topics = uniqBy(topics, t => t.name)
    for (let topic of topics) {
      this.createTopicFile(
        path.join('.', 'docs', topic.name.replace(/:/g, '/') + '.md'),
        config,
        topic,
        commands.filter(c => c.id === topic.name || c.id.startsWith(topic.name + ':')),
      )
    }

    return [
      '# Command Topics\n',
      ...topics.map(t => {
        return compact([
          `* [\`${config.bin} ${t.name}\`](docs/${t.name.replace(/:/g, '/')}.md)`,
          template({config})(t.description || '').trim().split('\n')[0]
        ]).join(' - ')
      }),
    ].join('\n').trim() + '\n'
  }

  createTopicFile(file: string, config: Config.IConfig, topic: Config.Topic, commands: Config.Command[]) {
    const bin = `\`${config.bin} ${topic.name}\``
    let doc = [
      bin,
      '='.repeat(bin.length),
      '',
      template({config})(topic.description || '').trim(),
      '',
      this.commands(config, commands),
    ].join('\n').trim() + '\n'
    fs.outputFileSync(file, doc)
  }

  commands(config: Config.IConfig, commands: Config.Command[]): string {
    return [
      ...commands.map(c => {
        let usage = this.commandUsage(c)
        return `* [\`${config.bin} ${usage}\`](#${slugify(`${config.bin}-${usage}`)})`
      }),
      '',
      ...commands.map(c => this.renderCommand(config, c)).map(s => s.trim() + '\n'),
    ].join('\n').trim()
  }

  renderCommand(config: Config.IConfig, c: Config.Command): string {
    this.debug('rendering command', c.id)
    let title = template({config})(c.description || '').trim().split('\n')[0]
    const help = new Help(config, {stripAnsi: true, maxWidth: columns})
    const header = () => `## \`${config.bin} ${this.commandUsage(c)}\``
    return compact([
      header(),
      title,
      '```\n' + help.command(c).trim() + '\n```',
      this.commandCode(config, c),
    ]).join('\n\n')
  }

  commandCode(config: Config.IConfig, c: Config.Command): string | undefined {
    let pluginName = c.pluginName
    if (!pluginName) return
    let plugin = config.plugins.find(p => p.name === c.pluginName)
    if (!plugin) return
    const repo = this.repo(plugin)
    if (!repo) return
    let label = plugin.name
    let version = plugin.version
    let commandPath = this.commandPath(config, plugin, c)
    if (!commandPath) return
    if (config.name === plugin.name) {
      label = commandPath
      version = process.env.OCLIF_NEXT_VERSION || version
    }
    return `_See code: [${label}](${repo}/blob/v${version}/${commandPath})_`
  }

  private repo(plugin: Config.IPlugin): string | undefined {
    const pjson = {...plugin.pjson}
    normalize(pjson)
    let repo = pjson.repository && pjson.repository.url
    if (!repo) return
    let url = new URL(repo)
    if (!['github.com', 'gitlab.com'].includes(url.hostname)) return
    return `https://${url.hostname}${url.pathname.replace(/\.git$/, '')}`
  }

  /**
   * fetches the path to a command
   */
  private commandPath(config: Config.IConfig, plugin: Config.IPlugin, c: Config.Command): string | undefined {
    let commandsDir = plugin.pjson.oclif.commands
    if (!commandsDir || process.platform === 'win32') return
    let commandPath = `${commandsDir.replace('./', '')}/${c.id.replace(/:/g, '/')}.js`
    let root = config.root
    let base: string
    while (root !== '/') {
      base = plugin.name === config.name ? root : `${root}/node_modules/${plugin.name}`
      try {
        commandPath = require.resolve(base + '/node_modules/' + commandPath.replace(/\.js$/, ''))
        break
      } catch (err) {
        if (err.code !== 'MODULE_NOT_FOUND') throw err
        root = path.dirname(root)
      }
    }
    commandPath = commandPath.replace(base! + '/', '')
    if (plugin.pjson.devDependencies.typescript) {
      commandPath = commandPath.replace(/^lib\//, 'src/')
      commandPath = commandPath.replace(/\.js$/, '.ts')
    }
    return commandPath
  }

  private commandUsage(command: Config.Command): string {
    const arg = (arg: Config.Command.Arg) => {
      let name = arg.name.toUpperCase()
      if (arg.required) return `${name}`
      return `[${name}]`
    }
    const defaultUsage = () => {
      // const flags = Object.entries(command.flags)
      // .filter(([, v]) => !v.hidden)
      return compact([
        command.id,
        command.args.filter(a => !a.hidden).map(a => arg(a)).join(' '),
      ]).join(' ')
    }
    let usages = castArray(command.usage)
    return usages.length === 0 ? defaultUsage() : usages[0]
  }
}
