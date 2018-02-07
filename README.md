@anycli/dev-cli
===============

helpers for anycli CLIs

[![Version](https://img.shields.io/npm/v/@anycli/dev-cli.svg)](https://npmjs.org/package/@anycli/dev-cli)
[![CircleCI](https://circleci.com/gh/anycli/dev-cli/tree/master.svg?style=svg)](https://circleci.com/gh/anycli/dev-cli/tree/master)
[![Appveyor CI](https://ci.appveyor.com/api/projects/status/github/anycli/dev-cli?branch=master&svg=true)](https://ci.appveyor.com/project/heroku/dev-cli/branch/master)
[![Codecov](https://codecov.io/gh/anycli/dev-cli/branch/master/graph/badge.svg)](https://codecov.io/gh/anycli/dev-cli)
[![Greenkeeper](https://badges.greenkeeper.io/anycli/dev-cli.svg)](https://greenkeeper.io/)
[![Known Vulnerabilities](https://snyk.io/test/npm/@anycli/dev-cli/badge.svg)](https://snyk.io/test/npm/@anycli/dev-cli)
[![Downloads/week](https://img.shields.io/npm/dw/@anycli/dev-cli.svg)](https://npmjs.org/package/@anycli/dev-cli)
[![License](https://img.shields.io/npm/l/@anycli/dev-cli.svg)](https://github.com/anycli/dev-cli/blob/master/package.json)

<!-- install -->
# Installing @anycli/dev-cli

with yarn:
```
$ yarn global add @anycli/dev-cli
```

or with npm:
```
$ npm install -g @anycli/dev-cli
```
<!-- installstop -->
<!-- usage -->
# Usage

```sh-session
$ anycli-dev COMMAND
running command...
$ anycli-dev (-v|--version|version)
@anycli/dev-cli/0.3.9 (linux-x64) node-v9.5.0
$ anycli-dev --help [COMMAND]
USAGE
  $ anycli-dev COMMAND [OPTIONS]
...
```
<!-- usagestop -->
<!-- commands -->
# Commands

* [anycli-dev help [COMMAND] [OPTIONS]](#help)
* [anycli-dev manifest [PATH] [OPTIONS]](#manifest)
* [anycli-dev readme [OPTIONS]](#readme)
## help

display help for anycli-dev

```
USAGE
  $ anycli-dev help [COMMAND] [OPTIONS]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@anycli/plugin-help](https://github.com/anycli/plugin-help/blob/v0.7.2/src/commands/help.ts)_

## manifest

generates plugin manifest json

```
USAGE
  $ anycli-dev manifest [PATH] [OPTIONS]

ARGUMENTS
  PATH  [default: .] path to plugin

OPTIONS
  --help     show CLI help
  --version  show CLI version
```

_See code: [@anycli/dev-cli](https://github.com/anycli/dev-cli/blob/v0.3.9/src/commands/manifest.ts)_

## readme

adds commands to README.md in current directory

```
USAGE
  $ anycli-dev readme [OPTIONS]

OPTIONS
  --multi  create a different markdown page for each topic

DESCRIPTION

  The readme must have any of the following tags inside of it for it to be replaced or else it will do nothing:
  <!-- install -->
  <!-- usage -->
  <!-- commands -->
```

_See code: [@anycli/dev-cli](https://github.com/anycli/dev-cli/blob/v0.3.9/src/commands/readme.ts)_
<!-- commandsstop -->
