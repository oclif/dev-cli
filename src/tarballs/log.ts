import color from '@heroku-cli/color'
import cli from 'cli-ux'
import * as qq from 'qqjs'

export function log(msg: string) {
  cli.log(color.bold(qq.prettifyPaths(msg)))
}
