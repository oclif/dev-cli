import cli from 'cli-ux'
import * as qq from 'qqjs'

export const debug = require('debug')('oclif-dev')
debug.new = (name: string) => require('debug')(`oclif-dev:${name}`)

export function log(...msg: string[]) {
  const output = qq.prettifyPaths(msg.join(' '))
  debug.enabled ? debug(output) : cli.log(`oclif-dev: ${output}`)
}
