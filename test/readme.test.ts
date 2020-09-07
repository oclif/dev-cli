import {expect, test} from '@oclif/test'
import * as fs from 'fs-extra'
import * as path from 'path'

const readme = fs.readFileSync('README.md', 'utf8')

describe('readme', () => {
  test
  .stdout()
  .finally(() => fs.writeFile('README.md', readme))
  .command(['readme'])
  .it('runs readme', () => {
    expect(fs.readFileSync('README.md', 'utf8')).to.contain('manifest')
  })

  test
  .stdout()
  .finally(() => fs.writeFile('README.md', readme))
  .finally(() => fs.remove('docs'))
  .command(['readme', '--multi'])
  .it('runs readme --multi', () => {
    expect(fs.readFileSync('README.md', 'utf8')).to.contain('manifest')
  })

  describe('with custom help', () => {
    const rootPath = path.join(__dirname, 'fixtures/cli-with-custom-help')
    const readmePath = path.join(rootPath, 'README.md')
    const originalReadme = fs.readFileSync(readmePath, 'utf8')

    test
    .stdout()
    .finally(() => fs.writeFileSync(readmePath, originalReadme))
    .stub(process, 'cwd', () => rootPath)
    .command(['readme'])
    .it('prints custom help to the readme', () => {
      const newReadme = fs.readFileSync(readmePath, 'utf8')

      expect(newReadme).to.contain('Custom help for hello')
    })
  })
})
