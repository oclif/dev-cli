import cli from 'cli-ux'
import * as qq from 'qqjs'

export function log(msg: string) {
  cli.log(`oclif-dev: ${qq.prettifyPaths(msg)}`)
}
