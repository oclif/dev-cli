import {expect, test} from '@oclif/test'
import * as qq from 'qqjs'

describe('pack', () => {
  beforeEach(async () => {
    await qq.rm('tmp/tarballs')
  })

  test
  .command(['pack', '-pwin32', '-ax64', '-cdev', '-otmp/tarballs/win32-x64'])
  .it('packs win32-64', () => {
    expect(qq.exists.sync('tmp/tarballs/win32-x64.tar.gz')).to.be.true
  })

  test
  .command(['pack', '-plinux', '-ax86', '-cdev', '-otmp/tarballs/linux-x86'])
  .it('packs linux-x86', () => {
    expect(qq.exists.sync('tmp/tarballs/linux-x86.tar.gz')).to.be.true
  })
})
