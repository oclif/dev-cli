import * as path from 'path'
import * as qq from 'qqjs'

import {log} from './log'

export async function pack({from, to, as}: {from: string, to: string, as: string}) {
  const prevCwd = qq.cwd()
  log(`packing tarball from ${qq.prettifyPaths(from)} to ${qq.prettifyPaths(to)}`)
  qq.cd(path.dirname(from))
  await qq.mkdirp(path.dirname(to))

  // move the directory so we can get a friendlier name in the tarball
  const tarTmp = `${from}.tartmp`
  await qq.emptyDir(tarTmp)
  await qq.mv(from, [tarTmp, as])
  qq.cd(tarTmp)

  await qq.x('tar', ['czf', to, as])

  await qq.rm(tarTmp)
  qq.cd(prevCwd)
}
