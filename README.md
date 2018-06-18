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
@oclif/dev-cli/1.13.34 linux-x64 node-v9.11.1
$ oclif-dev --help [COMMAND]
USAGE
  $ oclif-dev COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`oclif-dev help [COMMAND]`](#oclif-dev-help-command)
* [`oclif-dev manifest [PATH]`](#oclif-dev-manifest-path)
* [`oclif-dev pack`](#oclif-dev-pack)
* [`oclif-dev pack:deb`](#oclif-dev-packdeb)
* [`oclif-dev pack:macos`](#oclif-dev-packmacos)
* [`oclif-dev pack:win`](#oclif-dev-packwin)
* [`oclif-dev publish`](#oclif-dev-publish)
* [`oclif-dev publish:deb`](#oclif-dev-publishdeb)
* [`oclif-dev publish:macos`](#oclif-dev-publishmacos)
* [`oclif-dev publish:win`](#oclif-dev-publishwin)
* [`oclif-dev readme`](#oclif-dev-readme)

## `oclif-dev help [COMMAND]`

display help for oclif-dev

```
USAGE
  $ oclif-dev help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v2.0.5/src/commands/help.ts)_

## `oclif-dev manifest [PATH]`

generates plugin manifest json

```
USAGE
  $ oclif-dev manifest [PATH]

ARGUMENTS
  PATH  [default: .] path to plugin
```

_See code: [src/commands/manifest.ts](https://github.com/oclif/dev-cli/blob/v1.13.34/src/commands/manifest.ts)_

## `oclif-dev pack`

packages oclif cli into tarballs

```
USAGE
  $ oclif-dev pack

OPTIONS
  -r, --root=root  (required) [default: .] path to oclif CLI root

DESCRIPTION
  This can be used to create oclif CLIs that use the system node or that come preloaded with a node binary.
```

_See code: [src/commands/pack.ts](https://github.com/oclif/dev-cli/blob/v1.13.34/src/commands/pack.ts)_

## `oclif-dev pack:deb`

pack CLI into debian package

```
USAGE
  $ oclif-dev pack:deb

OPTIONS
  -r, --root=root  (required) [default: .] path to oclif CLI root
```

_See code: [src/commands/pack/deb.ts](https://github.com/oclif/dev-cli/blob/v1.13.34/src/commands/pack/deb.ts)_

## `oclif-dev pack:macos`

pack CLI into MacOS .pkg

```
USAGE
  $ oclif-dev pack:macos

OPTIONS
  -r, --root=root  (required) [default: .] path to oclif CLI root
```

_See code: [src/commands/pack/macos.ts](https://github.com/oclif/dev-cli/blob/v1.13.34/src/commands/pack/macos.ts)_

## `oclif-dev pack:win`

create windows installer from oclif CLI

```
USAGE
  $ oclif-dev pack:win

OPTIONS
  -r, --root=root  (required) [default: .] path to oclif CLI root
```

_See code: [src/commands/pack/win.ts](https://github.com/oclif/dev-cli/blob/v1.13.34/src/commands/pack/win.ts)_

## `oclif-dev publish`

publish an oclif CLI to S3

```
USAGE
  $ oclif-dev publish

OPTIONS
  -r, --deb=deb    (required) [default: .] path to oclif CLI root
  -r, --root=root  (required) [default: .] path to oclif CLI root

DESCRIPTION
  "aws-sdk" will need to be installed as a devDependency to publish.
```

_See code: [src/commands/publish.ts](https://github.com/oclif/dev-cli/blob/v1.13.34/src/commands/publish.ts)_

## `oclif-dev publish:deb`

publish deb package built with pack:deb

```
USAGE
  $ oclif-dev publish:deb

OPTIONS
  -r, --root=root  (required) [default: .] path to oclif CLI root
```

_See code: [src/commands/publish/deb.ts](https://github.com/oclif/dev-cli/blob/v1.13.34/src/commands/publish/deb.ts)_

## `oclif-dev publish:macos`

publish macos installers built with pack:macos

```
USAGE
  $ oclif-dev publish:macos

OPTIONS
  -r, --root=root  (required) [default: .] path to oclif CLI root
```

_See code: [src/commands/publish/macos.ts](https://github.com/oclif/dev-cli/blob/v1.13.34/src/commands/publish/macos.ts)_

## `oclif-dev publish:win`

publish windows installers built with pack:win

```
USAGE
  $ oclif-dev publish:win

OPTIONS
  -r, --root=root  (required) [default: .] path to oclif CLI root
```

_See code: [src/commands/publish/win.ts](https://github.com/oclif/dev-cli/blob/v1.13.34/src/commands/publish/win.ts)_

## `oclif-dev readme`

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

_See code: [src/commands/readme.ts](https://github.com/oclif/dev-cli/blob/v1.13.34/src/commands/readme.ts)_
<!-- commandsstop -->
