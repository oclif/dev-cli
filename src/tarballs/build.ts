import {IConfig} from '@oclif/config'
import * as qq from 'qqjs'

import {log} from './log'

export async function build({channel, config, output, version}: {output: string, channel: string, config: IConfig, version: string}) {
  const prevCwd = qq.cwd()
  const packCLI = async () => {
    qq.cd(config.root)
    if (config.pjson.scripts.prepublishOnly) await qq.x('npm', ['run', 'prepublishOnly'])
    return qq.x.stdout('npm', ['pack'])
  }
  const extractCLI = async (tarball: string) => {
    await qq.emptyDir(output)
    await qq.mv(tarball, output)
    tarball = qq.join([output, tarball])
    qq.cd(output)
    await qq.x(`tar -xzf ${tarball}`)
    for (let f of await qq.ls('package', {fullpath: true})) await qq.mv(f, '.')
    await qq.rm('package', tarball, 'bin/run.cmd')
  }
  const updatePJSON = async () => {
    qq.cd(output)
    const pjson = await qq.readJSON('package.json')
    pjson.version = version
    pjson.channel = channel
    await qq.writeJSON('package.json', pjson)
  }
  const addDependencies = async () => {
    qq.cd(output)
    const yarn = await qq.exists.sync([config.root, 'yarn.lock'])
    if (yarn) {
      await qq.cp([config.root, 'yarn.lock'], '.')
      await qq.x('yarn --no-progress --production --non-interactive')
    } else {
      await qq.cp([config.root, 'package-lock.json'], '.')
      await qq.x('npm install --production')
    }
  }
  const prune = async () => {
    // removes unnecessary files to make the tarball smaller
    qq.cd(output)
    const toRemove = await qq.globby([
      'node_modules/**/README*',
      '**/CHANGELOG*',
      '**/*.ts',
    ], {nocase: true})
    await qq.rm(...toRemove)
    await qq.rmIfEmpty('.')
  }
  log(`packing ${config.bin} to ${output}`)
  await extractCLI(await packCLI())
  await updatePJSON()
  await addDependencies()
  await prune()
  qq.cd(prevCwd)
}
