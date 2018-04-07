import {Command, flags} from '@oclif/command'
import * as Config from '@oclif/config'
import ux from 'cli-ux'
import * as path from 'path'
import * as qq from 'qqjs'

export default class Manifest extends Command {
  static description = `
packages oclif cli into tarballs

This can be used to create oclif CLIs that use the system node or that come preloaded with a node binary.
The default output will be ./dist/mycli-v0.0.0.tar.gz for tarballs without node or ./dist/mycli-v0.0.0-darwin-x64.tar.gz when node is included.

By default it will not include node. To include node, pass in the --platform and --arch flags.
`
  static examples = [
    `$ oclif-dev pack
outputs tarball of CLI in current directory to ./dist/mycli-v0.0.0.tar.gz`,
    `$ oclif-dev pack --platform win32 --arch x64
outputs tarball of CLI including a windows-x64 binary to ./dist/mycli-v0.0.0-win32-x64.tar.gz`,
  ]

  static flags = {
    output: flags.string({char: 'o', description: 'output location'}),
    root: flags.string({char: 'r', description: 'path to oclif CLI root', default: '.', required: true}),
    'node-version': flags.string({description: 'node version of binary to get', default: process.versions.node, required: true}),
    platform: flags.string({char: 'p', description: 'OS to use for node binary', options: ['darwin', 'linux', 'win32']}),
    arch: flags.string({char: 'a', description: 'arch to use for node binary', options: ['x64', 'x86', 'arm']}),
    channel: flags.string({char: 'c', description: 'channel to publish (e.g. "stable" or "beta")', required: true}),
  }

  cli!: Config.IConfig
  root!: string
  workspace!: string
  channel!: string
  version!: string
  output!: string
  platform?: string
  arch?: string
  _tmp?: string
  _base?: string

  get tmp() {
    if (this._tmp) return this._tmp
    this._tmp = path.join(this.root, 'tmp')
    qq.mkdirp.sync(this._tmp)
    return this._tmp
  }

  get base() {
    if (this._base) return this._base
    this._base = [this.config.bin, `v${this.config.version}`].join('-')
    if (this.platform) {
      this._base = [this._base, this.platform, this.arch].join('-')
    }
    return this._base
  }

  async run() {
    const prevCwd = qq.cwd()
    if (process.platform === 'win32') throw new Error('pack does not function on windows')
    const {flags} = this.parse(Manifest)
    this.channel = flags.channel
    this.root = path.resolve(flags.root)
    qq.cd(this.root)
    this.platform = flags.platform
    this.arch = flags.arch
    if (this.platform && !this.arch) throw new Error('--platform and --arch must be specified together')

    this.cli = await Config.load({root: this.root, devPlugins: false, userPlugins: false})
    this.version = await this.getVersion()
    this.workspace = path.join(this.tmp, this.base)

    this.output = flags.output ? path.resolve(flags.output) : path.join(process.cwd(), 'dist', `${this.base}.tar.gz`)
    ux.action.start(`packing ${this.config.bin} to ${this.output}`)

    await qq.emptyDir(this.workspace)
    ux.action.start(`packing ${this.config.bin} to ${this.output}`)
    await this.buildCLI()
    await this.writeBinScripts()
    if (this.platform && this.arch) {
      await this.downloadNode(flags['node-version'], path.join(this.workspace, 'bin', this.platform === 'win32' ? 'node.exe' : 'node'))
    }
    await this.tarballize()
    qq.cd(prevCwd)
  }

  async getVersion() {
    if (!await qq.exists('.git')) return this.cli.version
    // add git sha to version if in a git repo
    qq.pushd(this.root)
    const sha = (await qq.x.stdout('git', ['rev-parse', '--short', 'HEAD']))
    qq.popd()
    return `${this.cli.version}-${sha}`
  }

  async buildCLI() {
    const packCLI = () => {
      qq.cd(this.root)
      return qq.x.stdout('npm', ['pack'])
    }
    const extractCLI = async (tarball: string) => {
      await qq.mv(tarball, this.workspace)
      tarball = qq.join([this.workspace, tarball])
      qq.cd(this.workspace)
      await qq.x(`tar -xzf ${tarball}`)
      for (let f of await qq.ls('package', {fullpath: true})) await qq.mv(f, '.')
      await qq.rm('package', tarball, 'bin/run.cmd')
    }
    const updatePJSON = async () => {
      qq.cd(this.workspace)
      const pjson = await qq.readJSON('package.json')
      pjson.version = this.version
      pjson.channel = this.channel
      await qq.writeJSON('package.json', pjson)
    }
    const addDependencies = async () => {
      qq.cd(this.workspace)
      const yarn = await qq.exists.sync([this.root, 'yarn.lock'])
      if (yarn) {
        await qq.cp([this.root, 'yarn.lock'], '.')
        await qq.x('yarn --no-progress --production --non-interactive')
      } else {
        await qq.cp([this.root, 'package-lock.json'], '.')
        await qq.x('npm install --production')
      }
    }
    const prune = async () => {
      // removes unnecessary files to make the tarball smaller
      qq.cd(this.workspace)
      const toRemove = await qq.globby([
        'node_modules/**/README*',
        '**/CHANGELOG*',
        '**/*.ts',
      ], {nocase: true})
      await qq.rm(...toRemove)
      await qq.rmIfEmpty('.')
    }
    await extractCLI(await packCLI())
    await updatePJSON()
    await addDependencies()
    await prune()
  }

  async downloadNode(nodeVersion: string, output: string) {
    const nodeBase = this.platform === 'win32'
      ? `node-v${nodeVersion}-win-${this.arch}`
      : `node-v${nodeVersion}-${this.platform}-${this.arch}`
    const tarball = path.join(this.tmp, 'cache', this.platform === 'win32' ? `${nodeBase}.7z` : `${nodeBase}.tar.xz`)
    const download = async () => {
      ux.action.start(`downloading ${nodeBase}`)
      await qq.mkdirp(path.dirname(tarball))
      const url = this.platform === 'win32'
        ? `https://nodejs.org/dist/v${nodeVersion}/${nodeBase}.7z`
        : `https://nodejs.org/dist/v${nodeVersion}/${nodeBase}.tar.xz`
      await qq.download(url, tarball)
      ux.action.stop()
    }
    const extract = async () => {
      ux.action.start(`extracting ${nodeBase}`)
      const nodeTmp = path.join(this.tmp, 'node')
      await qq.emptyDir(nodeTmp)
      await qq.mkdirp(path.dirname(output))
      if (this.platform === 'win32') {
        qq.pushd(nodeTmp)
        await qq.x(`7z x -bd -y ${tarball} > /dev/null`)
        await qq.mv([nodeBase, 'node.exe'], output)
        qq.popd()
      } else {
        await qq.x(`tar -C ${this.tmp}/node -xJf ${tarball}`)
        await qq.mv([nodeTmp, nodeBase, 'bin/node'], output)
      }
      await qq.rm([nodeTmp, nodeBase])
      await qq.rmIfEmpty(nodeTmp)
      ux.action.stop()
    }
    if (!await qq.exists(tarball)) await download()
    await extract()
  }

  async writeBinScripts() {
    ux.action.start('writing bin scripts')
    const binPathEnvVar = this.cli.scopedEnvVarKey('CLI_BINPATH')
    const redirectedEnvVar = this.cli.scopedEnvVarKey('CLI_REDIRECTED')
    if (this.platform === 'win32') {
      const node = this.platform ? '"%~dp0\\..\\client\\bin\\node.exe"' : 'node'
      await qq.write([this.workspace, 'bin', `${this.cli.bin}.cmd`], `@echo off

if exist "%LOCALAPPDATA%\\${this.cli.dirname}\\client\\bin\\${this.cli.bin}.cmd" (
  set ${redirectedEnvVar}=1
  "%LOCALAPPDATA%\\${this.cli.dirname}\\client\\bin\\${this.cli.bin}.cmd" %*
) else (
  set ${binPathEnvVar}="%~dp0\\${this.cli.bin}.cmd"
  ${node} "%~dp0\\..\\client\\bin\\run" %*
)
`)
      await qq.write([this.workspace, 'bin', this.cli.bin], `#!/bin/sh
basedir=$(dirname "$(echo "$0" | sed -e 's,\\,/,g')")
"$basedir/../client/bin/${this.cli.bin}.cmd" "$@"
ret=$?
exit $ret
`)
    } else {
      const bin = qq.join([this.workspace, 'bin', this.cli.bin])
      const node = this.platform ? '"\$DIR/node"' : 'node'
      await qq.write(bin, `#!/usr/bin/env bash
set -e
get_script_dir () {
  SOURCE="\${BASH_SOURCE[0]}"
  while [ -h "\$SOURCE" ]; do
    DIR="\$( cd -P "\$( dirname "\$SOURCE" )" && pwd )"
    SOURCE="\$( readlink "\$SOURCE" )"
    [[ \$SOURCE != /* ]] && SOURCE="\$DIR/\$SOURCE"
  done
  DIR="\$( cd -P "\$( dirname "\$SOURCE" )" && pwd )"
  echo "\$DIR"
}
DIR=\$(get_script_dir)
CLI_HOME=\$(cd && pwd)
XDG_DATA_HOME=\${XDG_DATA_HOME:="\$CLI_HOME/.local/share"}
BIN_PATH="\$XDG_DATA_HOME/${this.cli.dirname}/client/bin/${this.cli.bin}"
if [ -z "\$${redirectedEnvVar}" ] && [ -x "\$BIN_PATH" ] && [[ ! "\$DIR/${this.cli.bin}" -ef "\$BIN_PATH" ]]; then
  if [ "\$DEBUG" == "*" ]; then
    echo "\$BIN_PATH" "\$@"
  fi
  "\$BIN_PATH" "\$@"
else
  if [ "\$DEBUG" == "*" ]; then
    echo ${binPathEnvVar}="\$DIR/${this.config.bin}" ${node} "\$DIR/run" "\$@"
  fi
  ${binPathEnvVar}="\$DIR/${this.config.bin}" ${node} "\$DIR/run" "\$@"
fi
`)
      await qq.chmod(bin, 0o755)
    }
    ux.action.stop()
  }

  async tarballize() {
    ux.action.start('packing tarball')
    qq.cd(this.tmp)
    await qq.mkdirp(path.dirname(this.output))

    // move the directory so we can get a friendlier name in the tarball
    const tarTmp = path.join(this.tmp, this.base + '-tartmp')
    await qq.emptyDir(tarTmp)
    await qq.mv(this.base, [tarTmp, this.cli.bin])
    qq.cd(tarTmp)

    await qq.x('tar', ['czf', this.output, this.cli.bin])

    await qq.rm(tarTmp)
    qq.cd(this.tmp)
    ux.action.stop()
  }
}
