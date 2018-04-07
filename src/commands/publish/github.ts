import {Command, flags} from '@oclif/command'
import * as Octokit from '@octokit/rest'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as qq from 'qqjs'

import * as Tarballs from '../../tarballs'
import {log as action} from '../../tarballs/log'

export default class Publish extends Command {
  static description = 'publish an oclif CLI to GitHub Releases'

  static flags = {
    root: flags.string({char: 'r', description: 'path to oclif CLI root', default: '.', required: true}),
    targets: flags.string({char: 't', description: 'comma-separated targets to build for (e.g. darwin-x64, win32-x86)', required: true}),
    'node-version': flags.string({description: 'node version of binary to get', default: process.versions.node, required: true}),
    xz: flags.boolean({description: 'also create xz tarballs'}),
    prerelease: flags.boolean({description: 'identify as prerelease'}),
    draft: flags.boolean({description: 'create an unpublished release'}),
  }

  async run() {
    if (!process.env.GH_TOKEN) throw new Error('GH_TOKEN must be set')
    const {flags} = this.parse(Publish)
    if (process.platform === 'win32') throw new Error('pack does not function on windows')
    const {'node-version': nodeVersion} = flags
    const channel = flags.prerelease ? 'prerelease' : 'stable'
    const root = path.resolve(flags.root)
    const config = await Tarballs.config(root)
    const version = config.version
    const baseWorkspace = qq.join([config.root, 'tmp', 'base'])

    // first create the generic base workspace that will be copied later
    await Tarballs.build({config, channel, output: baseWorkspace, version})

    const tarballs: {target: string, tarball: string}[] = []
    for (let [platform, arch] of flags.targets.split(',').map(t => t.split('-'))) {
      const t = await Tarballs.target({config, platform, arch, channel, version, baseWorkspace, nodeVersion, xz: flags.xz})
      tarballs.push(t)
    }

    const octokit = new Octokit()
    octokit.authenticate({
      type: 'token',
      token: process.env.GH_TOKEN,
    })
    const tag = `v${version}`
    action(`creating ${tag} release`)
    const [owner, repo] = config.pjson.repository.split('/')
    const {data: release} = await octokit.repos.createRelease({
      owner,
      repo,
      target_commitish: await Tarballs.gitSha(config.root),
      tag_name: tag,
      prerelease: flags.prerelease,
      draft: flags.draft,
    })

    for (let {tarball} of tarballs) {
      const upload = async (file: string) => {
        action(`uploading ${tarball}`)
        await octokit.repos.uploadAsset({
          url: release.upload_url,
          file: fs.createReadStream(file),
          contentType: 'application/gzip',
          contentLength: fs.statSync(file).size,
          name: qq.path.basename(file),
          label: qq.path.basename(file),
        })
      }
      await upload(`${tarball}.tar.gz`)
      if (flags.xz) await upload(`${tarball}.tar.xz`)
    }
    if (config.pjson.scripts.postpublish) {
      await qq.x('npm', ['run', 'postpublish'])
    }
  }
}
