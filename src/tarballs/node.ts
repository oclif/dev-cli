import * as path from 'path'
import * as qq from 'qqjs'

import {log} from './log'

export async function fetchNodeBinary({nodeVersion, output, platform, arch, tmp}: {nodeVersion: string, output: string, platform: string, arch: string, tmp: string}) {
  if (arch === 'arm') arch = 'armv7l'
  let nodeBase = `node-v${nodeVersion}-${platform}-${arch}`
  let tarball = path.join(tmp, 'cache', `${nodeBase}.tar.xz`)
  let url = `https://nodejs.org/dist/v${nodeVersion}/${nodeBase}.tar.xz`
  if (platform === 'win32') {
    nodeBase = `node-v${nodeVersion}-win-${arch}`
    tarball = path.join(tmp, 'cache', `${nodeBase}.7z`)
    url = `https://nodejs.org/dist/v${nodeVersion}/${nodeBase}.7z`
    output += '.exe'
  }
  const download = async () => {
    log(`downloading ${nodeBase}`)
    const shasums = path.join(tmp, 'cache', nodeVersion, 'SHASUMS256.txt.asc')
    if (!await qq.exists(shasums)) {
      await qq.download(`https://nodejs.org/dist/v${nodeVersion}/SHASUMS256.txt.asc`, shasums)
    }
    const downloadTmp = path.join(path.dirname(tarball), 'tmp')
    await qq.mkdirp(downloadTmp)
    qq.cd(downloadTmp)
    await qq.download(url, path.basename(tarball))
    await qq.x(`grep ${path.basename(tarball)} ${shasums} | shasum -a 256 -c -`)
    await qq.mv(path.basename(tarball), tarball)
  }
  const extract = async () => {
    log(`extracting ${nodeBase}`)
    const nodeTmp = path.join(tmp, 'node')
    await qq.rm([nodeTmp, nodeBase])
    await qq.mkdirp(nodeTmp)
    await qq.mkdirp(path.dirname(output))
    if (platform === 'win32') {
      qq.pushd(nodeTmp)
      await qq.x(`7z x -bd -y ${tarball} > /dev/null`)
      await qq.mv([nodeBase, 'node.exe'], output)
      qq.popd()
    } else {
      await qq.x(`tar -C ${tmp}/node -xJf ${tarball}`)
      await qq.mv([nodeTmp, nodeBase, 'bin/node'], output)
    }
  }
  if (!await qq.exists(tarball)) await download()
  await extract()
}
