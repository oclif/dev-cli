import {expect, test} from '@oclif/test'
import * as fs from 'fs-extra'

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

  test
    .stdout()
    .finally(() => fs.writeFile('README.md', readme))
    .command(['readme', '-f', "'<%= command.id %>'"])
    .it('runs readme -f \'<%= command.id %>\'', () => {
      const readme = fs.readFileSync('README.md', 'utf8').split('\n')
      expect(readme.find(line => line.startsWith("* [`'readme'`](#readme)"))).to.exist // No bin name
    })

  test
    .stdout()
    .do(() => fs.writeFile('README.md', readme.replace('# Commands', '## Commands')))
    .finally(() => fs.writeFile('README.md', readme))
    .command(['readme'])
    .it('runs readme subheader markers', () => {
      const readme = fs.readFileSync('README.md', 'utf8').split('\n')
      expect(readme.find(line => line.startsWith('### `oclif-dev readme`'))).to.exist
    })
})
