@oclif/dev-cli
===============

helpers for oclif CLIs

[![Version](https://img.shields.io/npm/v/@oclif/dev-cli.svg)](https://npmjs.org/package/@oclif/dev-cli)
[![CircleCI](https://circleci.com/gh/oclif/dev-cli/tree/master.svg?style=shield)](https://circleci.com/gh/oclif/dev-cli/tree/master)
[![Appveyor CI](https://ci.appveyor.com/api/projects/status/github/oclif/dev-cli?branch=master&svg=true)](https://ci.appveyor.com/project/heroku/dev-cli/branch/master)
[![Codecov](https://codecov.io/gh/oclif/dev-cli/branch/master/graph/badge.svg)](https://codecov.io/gh/oclif/dev-cli)
[![Greenkeeper](https://badges.greenkeeper.io/oclif/dev-cli.svg)](https://greenkeeper.io/)
[![Known Vulnerabilities](https://snyk.io/test/npm/@oclif/dev-cli/badge.svg)](https://snyk.io/test/npm/@oclif/dev-cli)
[![Downloads/week](https://img.shields.io/npm/dw/@oclif/dev-cli.svg)](https://npmjs.org/package/@oclif/dev-cli)
[![License](https://img.shields.io/npm/l/@oclif/dev-cli.svg)](https://github.com/oclif/dev-cli/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g @oclif/dev-cli
$ oclif-dev COMMAND
running command...
$ oclif-dev (-v|--version|version)
@oclif/dev-cli/1.4.2 linux-x64 node-v9.9.0
$ oclif-dev --help [COMMAND]
USAGE
  $ oclif-dev COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [oclif-dev help [COMMAND]](#oclif-dev-help-command)
* [oclif-dev manifest [PATH]](#oclif-dev-manifest-path)
* [oclif-dev readme](#oclif-dev-readme)

## oclif-dev help [COMMAND]

display help for oclif-dev

```
USAGE
  $ oclif-dev help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v1.1.6/src/commands/help.ts)_

## oclif-dev manifest [PATH]

generates plugin manifest json

```
USAGE
  $ oclif-dev manifest [PATH]

ARGUMENTS
  PATH  [default: .] path to plugin
```

_See code: [src/commands/manifest.ts](https://github.com/oclif/dev-cli/blob/v1.4.2/src/commands/manifest.ts)_

## oclif-dev readme

adds commands to README.md in current directory

```
USAGE
  $ oclif-dev readme

OPTIONS
  --multi  create a different markdown page for each topic

DESCRIPTION
  The readme must have any of the following tags inside of it for it to be replaced or else it will do nothing:
  # Usage
  <!-- usage -->
  # Commands
  <!-- commands -->
```

_See code: [src/commands/readme.ts](https://github.com/oclif/dev-cli/blob/v1.4.2/src/commands/readme.ts)_
<!-- commandsstop -->
