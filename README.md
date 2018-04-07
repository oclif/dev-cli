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
@oclif/dev-cli/1.6.0 linux-x64 node-v9.11.1
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
* [oclif-dev pack](#oclif-dev-pack)
* [oclif-dev publish:github](#oclif-dev-publishgithub)
* [oclif-dev publish:s3](#oclif-dev-publishs-3)
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

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v1.2.3/src/commands/help.ts)_

## oclif-dev manifest [PATH]

generates plugin manifest json

```
USAGE
  $ oclif-dev manifest [PATH]

ARGUMENTS
  PATH  [default: .] path to plugin
```

_See code: [src/commands/manifest.ts](https://github.com/oclif/dev-cli/blob/v1.6.0/src/commands/manifest.ts)_

## oclif-dev pack

packages oclif cli into tarballs

```
USAGE
  $ oclif-dev pack

OPTIONS
  -a, --arch=x64|x86|arm             arch to use for node binary
  -c, --channel=channel              (required) channel to publish (e.g. "stable" or "beta")
  -o, --output=output                output location
  -p, --platform=darwin|linux|win32  OS to use for node binary
  -r, --root=root                    (required) [default: .] path to oclif CLI root
  --node-version=node-version        (required) [default: 9.11.1] node version of binary to get
  --xz                               also create xz tarballs

DESCRIPTION
  packages oclif cli into tarballs

  This can be used to create oclif CLIs that use the system node or that come preloaded with a node binary.
  The default output will be ./dist/mycli-v0.0.0.tar.gz for tarballs without node or 
  ./dist/mycli-v0.0.0-darwin-x64.tar.gz when node is included.

  By default it will not include node. To include node, pass in the --platform and --arch flags.


EXAMPLES
  $ oclif-dev pack
  outputs tarball of CLI in current directory to ./dist/mycli-v0.0.0.tar.gz

  $ oclif-dev pack --platform win32 --arch x64
  outputs tarball of CLI including a windows-x64 binary to ./dist/mycli-v0.0.0-win32-x64.tar.gz
```

_See code: [src/commands/pack.ts](https://github.com/oclif/dev-cli/blob/v1.6.0/src/commands/pack.ts)_

## oclif-dev publish:github

publish an oclif CLI to GitHub Releases

```
USAGE
  $ oclif-dev publish:github

OPTIONS
  -r, --root=root              (required) [default: .] path to oclif CLI root
  -t, --targets=targets        (required) comma-separated targets to build for (e.g. darwin-x64, win32-x86)
  --draft                      create an unpublished release
  --node-version=node-version  (required) [default: 9.11.1] node version of binary to get
  --prerelease                 identify as prerelease
  --xz                         also create xz tarballs
```

_See code: [src/commands/publish/github.ts](https://github.com/oclif/dev-cli/blob/v1.6.0/src/commands/publish/github.ts)_

## oclif-dev publish:s3

publish an oclif CLI to S3

```
USAGE
  $ oclif-dev publish:s3

OPTIONS
  -b, --bucket=bucket          s3 bucket to use
  -c, --channel=channel        (required) channel to publish (e.g. "stable" or "beta")
  -r, --root=root              (required) [default: .] path to oclif CLI root
  -t, --targets=targets        (required) comma-separated targets to build for (e.g. darwin-x64, win32-x86)
  --node-version=node-version  (required) [default: 9.11.1] node version of binary to get
  --xz                         also create xz tarballs
```

_See code: [src/commands/publish/s3.ts](https://github.com/oclif/dev-cli/blob/v1.6.0/src/commands/publish/s3.ts)_

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

_See code: [src/commands/readme.ts](https://github.com/oclif/dev-cli/blob/v1.6.0/src/commands/readme.ts)_
<!-- commandsstop -->
