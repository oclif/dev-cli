import * as Config from '@anycli/config'
import {expect, test} from '@anycli/test'
import * as fs from 'fs-extra'

describe('manifest', () => {
  test
  .stdout()
  .do(() => fs.remove('.anycli.manifest.json'))
  .finally(() => fs.remove('.anycli.manifest.json'))
  .command(['manifest'])
  .it('outputs plugins', ctx => {
    const {commands} = fs.readJSONSync('.anycli.manifest.json') as Config.Manifest
    expect(commands.manifest).to.include({
      title: 'generates plugin manifest json'
    })
    expect(ctx.stdout).to.equal('wrote manifest to /Users/jdickey/src/github.com/anycli/dev-cli/.anycli.manifest.json\n')
  })
})
