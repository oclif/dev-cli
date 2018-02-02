import * as Config from '@anycli/config'
import {expect, test} from '@anycli/test'

describe('manifest', () => {
  test
  .stdout()
  .command(['manifest'])
  .it('outputs plugins', ctx => {
    const {commands} = JSON.parse(ctx.stdout) as {commands: Config.ICachedCommand[]}
    const manifestCommand = commands.find(c => c.id === 'manifest')
    expect(manifestCommand).to.include({
      title: 'generates plugin manifest json'
    })
  })
})
