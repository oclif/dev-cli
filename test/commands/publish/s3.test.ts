// tslint:disable no-console

import {expect, test} from '@oclif/test'
import * as qq from 'qqjs'

import * as Tarballs from '../../../src/tarballs'

const pjson = require('../../../package.json')
const target = [process.platform, process.arch].join('-')

const skipIfWindows = process.platform === 'win32' ? test.skip() : test
const testRun = `test-${Math.random().toString().split('.')[1].slice(0, 4)}`
let version: string

describe('publish:s3', () => {
  beforeEach(async () => {
    if (!version) {
      const sha = await Tarballs.gitSha(process.cwd(), {short: true})
      version = `${pjson.version}-${testRun}.${sha}`
    }
    const root = qq.join(__dirname, '../../../tmp/test/publish/s3')
    await qq.emptyDir(root)
    qq.cd(root)
  })
  afterEach(async () => {
    qq.x(`aws s3 rm --recursive s3://oclif/dev-cli/channels/${testRun}`)
    qq.cd([__dirname, '../../..'])
  })

  skipIfWindows
  .command(['publish:s3', '-c', testRun])
  .it('publishes valid releases', async () => {
    const manifest = await qq.readJSON(`https://oclif-staging.s3.amazonaws.com/@oclif/dev-cli/channels/${testRun}/version`)

    const test = async (url: string, expectedSha: string, nodeVersion: string) => {
      const xz = url.endsWith('.tar.xz')
      const ext = xz ? '.tar.xz' : '.tar.gz'
      await qq.download(url, `oclif-dev${ext}`)
      const receivedSha = await qq.hash('sha256', `oclif-dev${ext}`)
      expect(receivedSha).to.equal(expectedSha)
      if (xz) {
        await qq.x('cat oclif-dev.tar.xz | xz - | tar x')
      } else {
        await qq.x('cat oclif-dev.tar.gz | gzip -d | tar x')
      }
      const stdout = await qq.x.stdout('./oclif-dev/bin/oclif-dev', ['--version'])
      console.log(stdout)
      expect(stdout).to.contain(`@oclif/dev-cli/${version} ${target} node-v${nodeVersion}`)
      await qq.rm('oclif-dev')
    }

    await test(manifest.gz, manifest.sha256gz, process.versions.node)
    await test(manifest.xz, manifest.sha256xz, process.versions.node)
    await test(manifest.targets[target].gz, manifest.targets[target].sha256gz, pjson.oclif.update.node.version)
    await test(manifest.targets[target].xz, manifest.targets[target].sha256xz, pjson.oclif.update.node.version)
  })
})
