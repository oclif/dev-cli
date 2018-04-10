import {test} from '@oclif/test'
import * as qq from 'qqjs'

const pjson = require('../../../package.json')
const pjsonPath = require.resolve('../../../package.json')
const originalVersion = pjson.version

const skipIfWindows = process.platform === 'win32' ? test.skip() : test
const testRun = `test-${Math.random().toString().split('.')[1].slice(0, 4)}`

describe('publish:deb', () => {
  beforeEach(async () => {
    pjson.version = `${pjson.version}-${testRun}`
    await qq.writeJSON(pjsonPath, pjson)
    const root = qq.join(__dirname, '../../../tmp/test/publish')
    await qq.emptyDir(root)
    qq.cd(root)
  })
  afterEach(async () => {
    qq.x(`aws s3 rm --recursive s3://oclif/dev-cli/channels/${testRun}`)
    qq.cd([__dirname, '../../..'])
    pjson.version = originalVersion
    await qq.writeJSON(pjsonPath, pjson)
  })

  skipIfWindows
  .command(['pack:deb'])
  .command(['publish:deb'])
  .it('publishes valid releases', async () => {
    await qq.download(`https://oclif-staging.s3.amazonaws.com/channels/${testRun}/apt/Release`)
  })
})
