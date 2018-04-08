import {expect, test} from '@oclif/test'
import * as qq from 'qqjs'

const {version} = require('../../package.json')

const skipIfWindows = process.platform === 'win32' ? test.skip() : test

describe('pack', () => {
  beforeEach(async () => {
    await qq.rm('dist')
  })
  afterEach(async () => {
    qq.cd([__dirname, '../..'])
    await qq.rm('dist')
  })

  skipIfWindows
  .command(['pack'])
  .it('packs win32-64', () => {
    expect(qq.exists.sync(`dist/@oclif/dev-cli/channels/stable/oclif-dev-v${version}/oclif-dev-v${version}.tar.gz`)).to.be.true
  })
})
