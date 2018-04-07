import * as path from 'path'
import * as qq from 'qqjs'

import {log} from './log'

export async function pack({from, to, as, xz}: {from: string, to: string, as: string, xz: boolean}) {
  const prevCwd = qq.cwd()
  await qq.mkdirp(path.dirname(to))
  // move the directory so we can get a friendlier name in the tarball
  const tarTmp = `${from}.tartmp`
  await qq.emptyDir(tarTmp)
  qq.cd(path.dirname(from))
  await qq.mv(from, [tarTmp, as])
  qq.cd(tarTmp)
  const gzPath = `${to}.tar.gz`
  log(`packing tarball from ${qq.prettifyPaths(from)} to ${qq.prettifyPaths(gzPath)}`)
  await qq.x('tar', ['czf', gzPath, as])
  if (xz) {
    const xzPath = `${to}.tar.xz`
    log(`packing tarball from ${qq.prettifyPaths(from)} to ${qq.prettifyPaths(xzPath)}`)
    await qq.x(`tar c ${as} | xz > ${xzPath}`)
  }
  qq.cd(prevCwd)
}
