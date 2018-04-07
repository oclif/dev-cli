import {IConfig} from '@oclif/config'
import * as qq from 'qqjs'

import {log} from './log'

export async function build({channel, config, output, version}: {output: string, channel: string, config: IConfig, version: string}) {
  const prevCwd = qq.cwd()
  const packCLI = () => {
    qq.cd(config.root)
    return qq.x.stdout('npm', ['pack'])
  }
  const extractCLI = async (tarball: string) => {
    await qq.emptyDir(output)
    await qq.mv(tarball, output)
    tarball = qq.join([output, tarball])
    qq.cd(output)
    await qq.x(`tar -xzf ${tarball}`)
    for (let f of await qq.ls('package', {fullpath: true})) await qq.mv(f, '.')
    await qq.rm('package', tarball, 'bin/run.cmd')
  }
  const updatePJSON = async () => {
    qq.cd(output)
    const pjson = await qq.readJSON('package.json')
    pjson.version = version
    pjson.channel = channel
    await qq.writeJSON('package.json', pjson)
  }
  const addDependencies = async () => {
    qq.cd(output)
    const yarn = await qq.exists.sync([config.root, 'yarn.lock'])
    if (yarn) {
      await qq.cp([config.root, 'yarn.lock'], '.')
      await qq.x('yarn --no-progress --production --non-interactive')
    } else {
      await qq.cp([config.root, 'package-lock.json'], '.')
      await qq.x('npm install --production')
    }
  }
  const prune = async () => {
    // removes unnecessary files to make the tarball smaller
    qq.cd(output)
    const toRemove = await qq.globby([
      'node_modules/**/README*',
      '**/CHANGELOG*',
      '**/*.ts',
    ], {nocase: true})
    await qq.rm(...toRemove)
    await qq.rmIfEmpty('.')
  }
  log(`packing ${config.bin} to ${output}`)
  await extractCLI(await packCLI())
  await updatePJSON()
  await addDependencies()
  await prune()
  qq.cd(prevCwd)
}

export async function writeBinScripts({config, output, platform}: {config: IConfig, output: string, platform?: string}) {
  const binPathEnvVar = config.scopedEnvVarKey('CLI_BINPATH')
  const redirectedEnvVar = config.scopedEnvVarKey('CLI_REDIRECTED')
  const writeWin32 = async () => {
    const node = platform ? '"%~dp0\\..\\client\\bin\\node.exe"' : 'node'
    await qq.write([output, 'bin', `${config.bin}.cmd`], `@echo off

if exist "%LOCALAPPDATA%\\${config.dirname}\\client\\bin\\${config.bin}.cmd" (
  set ${redirectedEnvVar}=1
  "%LOCALAPPDATA%\\${config.dirname}\\client\\bin\\${config.bin}.cmd" %*
) else (
  set ${binPathEnvVar}="%~dp0\\${config.bin}.cmd"
  ${node} "%~dp0\\..\\client\\bin\\run" %*
)
`)
    await qq.write([output, 'bin', config.bin], `#!/bin/sh
basedir=$(dirname "$(echo "$0" | sed -e 's,\\,/,g')")
"$basedir/../client/bin/${config.bin}.cmd" "$@"
ret=$?
exit $ret
`)
  }
  const writeUnix = async () => {
    const bin = qq.join([output, 'bin', config.bin])
    const node = platform ? '"\$DIR/node"' : 'node'
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
BIN_PATH="\$XDG_DATA_HOME/${config.dirname}/client/bin/${config.bin}"
if [ -z "\$${redirectedEnvVar}" ] && [ -x "\$BIN_PATH" ] && [[ ! "\$DIR/${config.bin}" -ef "\$BIN_PATH" ]]; then
  if [ "\$DEBUG" == "*" ]; then
    echo "\$BIN_PATH" "\$@"
  fi
  "\$BIN_PATH" "\$@"
else
  if [ "\$DEBUG" == "*" ]; then
    echo ${binPathEnvVar}="\$DIR/${config.bin}" ${node} "\$DIR/run" "\$@"
  fi
  ${binPathEnvVar}="\$DIR/${config.bin}" ${node} "\$DIR/run" "\$@"
fi
`)
    await qq.chmod(bin, 0o755)
  }

  if (!platform || platform === 'win32') writeWin32()
  if (!platform || platform !== 'win32') writeUnix()
}
