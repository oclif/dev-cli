import * as qq from 'qqjs'

import {buildConfig} from './config'

export async function writeBinScripts(t: ReturnType<typeof buildConfig> extends Promise<infer U> ? U : never) {
  const binPathEnvVar = t.config.scopedEnvVarKey('CLI_BINPATH')
  const redirectedEnvVar = t.config.scopedEnvVarKey('CLI_REDIRECTED')
  const writeWin32 = async () => {
    await qq.write([t.baseWorkspace, 'bin', `${t.config.bin}.cmd`], `@echo off

if exist "%LOCALAPPDATA%\\${t.config.dirname}\\client\\bin\\${t.config.bin}.cmd" (
  set ${redirectedEnvVar}=1
  "%LOCALAPPDATA%\\${t.config.dirname}\\client\\bin\\${t.config.bin}.cmd" %*
) else (
  set ${binPathEnvVar}="%~dp0\\${t.config.bin}.cmd"
  if exist "%~dp0\\..\\client\\bin\\node.exe" (
    "%~dp0\\..\\client\\bin\\node.exe" "%~dp0\\..\\client\\bin\\run" %*
  ) else if exist "%LOCALAPPDATA%\\oclif\\node\\node-${t.nodeVersion}.exe" (
    "%LOCALAPPDATA%\\oclif\\node\\node-${t.nodeVersion}.exe" "%~dp0\\..\\client\\bin\\run" %*
  ) else (
    node "%~dp0\\..\\client\\bin\\run" %*
  )
)
`)
    // await qq.write([output, 'bin', config.bin], `#!/bin/sh
// basedir=$(dirname "$(echo "$0" | sed -e 's,\\,/,g')")
// "$basedir/../client/bin/${config.bin}.cmd" "$@"
// ret=$?
// exit $ret
// `)
  }
  const writeUnix = async () => {
    const bin = qq.join([t.baseWorkspace, 'bin', t.config.bin])
    await qq.write(bin, `#!/usr/bin/env bash
set -e
DIR=\$(dirname "$0")
CLI_HOME=\$(cd && pwd)
XDG_DATA_HOME=\${XDG_DATA_HOME:="\$CLI_HOME/.local/share"}
BIN_PATH="\$XDG_DATA_HOME/${t.config.dirname}/client/bin/${t.config.bin}"
if [ -z "\$${redirectedEnvVar}" ] && [ -x "\$BIN_PATH" ] && [[ ! "\$DIR/${t.config.bin}" -ef "\$BIN_PATH" ]]; then
  if [ "\$DEBUG" == "*" ]; then
    echo "\$BIN_PATH" "\$@"
  fi
  ${redirectedEnvVar}=1 "\$BIN_PATH" "\$@"
else
  if [ -x "$(command -v "\$XDG_DATA_HOME/oclif/node/node-custom")" ]; then
    NODE="\$XDG_DATA_HOME/oclif/node/node-custom"
  elif [ -x "$(command -v "\$DIR/node")" ]; then
    NODE="\$DIR/node"
  elif [ -x "$(command -v "\$XDG_DATA_HOME/oclif/node/node-${t.nodeVersion}")" ]; then
    NODE="\$XDG_DATA_HOME/oclif/node/node-${t.nodeVersion}"
  elif [ -x "$(command -v node)" ]; then
    NODE=node
  else
    echo 'Error: node is not installed.' >&2
    exit 1
  fi
  if [ "\$DEBUG" == "*" ]; then
    echo ${binPathEnvVar}="\$DIR/${t.config.bin}" "\$NODE" "\$DIR/run" "\$@"
  fi
  ${binPathEnvVar}="\$DIR/${t.config.bin}" "\$NODE" "\$DIR/run" "\$@"
fi
`)
    await qq.chmod(bin, 0o755)
  }

  await writeWin32()
  await writeUnix()
}
