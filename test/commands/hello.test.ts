import {expect, test} from '@anycli/test'

const command = 'hello'

describe(command, () => {
  test
  .stdout()
    .command([command])
  .it('runs hello', ctx => {
    expect(ctx.stdout).to.contain('hello world from hello!')
  })

  test
  .stdout()
    .command([command, '--name', 'jeff'])
  .it('runs hello --name jeff', ctx => {
    expect(ctx.stdout).to.contain('hello jeff from hello!')
  })
})
