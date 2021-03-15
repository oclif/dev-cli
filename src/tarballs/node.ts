import {error as oclifError} from '@oclif/errors'
import * as path from 'path'
import * as qq from 'qqjs'
import * as fs from 'fs'
import * as crypto from 'crypto'
import streamPipeline = require('stream.pipeline-shim')
import {promisify} from 'util'
import * as http from 'https'
import * as tmp from 'tmp'
import {log} from '../log'
import * as tar from 'tar'
import type {IncomingMessage} from 'http'

const pipeline  = promisify(streamPipeline)

async function checkFor7Zip() {
  try {
    await qq.x('7z', {stdio: ['ignore', 'pipe', 'inherit']})
  } catch (error) {
    if (error.code === 127) oclifError('install 7-zip to package windows tarball')
    else throw error
  }
}

interface DownloadOptions {
  nodeVersion: string;
  platform: string;
  arch: string;
}

interface FetchNodeBinaryOptions extends DownloadOptions {
  tmp: string;
  output: string;
  shasums: string;
}

function fetchText(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = http.get(url, res => {
      const buffer: Buffer[] = []
      if (res.statusCode! / 100 !== 2) {
        return reject(new Error(`Invalid HTTPS request for url ${url}: Status Code ${res.statusCode}`))
      }
      res.on('data', d => {
        buffer.push(d)
      })
      res.on('end', () => {
        const body = Buffer.concat(buffer).toString()
        resolve(body)
      })
    }).once('error', reject)

    req.end()
  })
}

function nodeURL(nodeVersion: string, path: string): string {
  return `https://nodejs.org/dist/v${nodeVersion}${path}`
}

export function downloadSHASums(nodeVersion: string): Promise<string> {
  return fetchText(nodeURL(nodeVersion, '/SHASUMS256.txt.asc'))
}

function getDownloadResponseStream(url: string): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      resolve(res)
    })
    .on('error', reject)
  })
}

function findSHASum(fileName: string, shasums: string): string {
  let sha
  for (const line of shasums.split('\n')) {
    const split = line.split(fileName)
    if (split.length === 2) {
      sha = split[0].trim()
      break
    }
  }

  if (!sha) {
    throw new Error('missing shasum')
  }

  return sha
}

interface CacheNodeOptions {
  url: string;
  cacheDir: string;
  downloadFileName: string;
  cacheFileName: string;
  sha: string;
  files: string[];
}

async function extract7Zip(path: string, cacheDir: string) {
  await qq.x(`7z x -bd -y '${path}' -o${cacheDir} > /dev/null`)
}

async function cacheNode({url, cacheFileName, sha, downloadFileName, cacheDir, files}: CacheNodeOptions) {
  const stream = await getDownloadResponseStream(url)
  const tmpDir = await promisify(tmp.dir)()
  await qq.mkdirp(tmpDir)
  const tmpFile = path.join(tmpDir, downloadFileName)
  const cacheWriteStream = fs.createWriteStream(tmpFile)

  try {
    await pipeline(stream, cacheWriteStream)

    const hash = crypto.createHash('sha256')
    await pipeline(fs.createReadStream(tmpFile), hash)

    const tarballSha = hash.digest('hex')

    if (tarballSha !== sha) {
      throw new Error(`node.js download SHASUM mismatch: expected ${url} to have shasum of ${sha}, but got ${tarballSha}`)
    }

    if (url.endsWith('7z')) {
      const ztmpdir = await promisify(tmp.dir)()

      await qq.mkdirp(ztmpdir)
      await extract7Zip(tmpFile, ztmpdir)

      await qq.mv(path.join(ztmpdir, path.basename(tmpFile, '.7z'), 'node.exe'), cacheFileName)
    } else {
      await tar.extract({file: tmpFile, cwd: cacheDir}, files)
    }
  } finally {
    cacheWriteStream.close()
  }
}

function nodeFileName(nodeVersion: string, platform: string, arch: string): string {
  return `node-v${nodeVersion}-${platform}-${arch}`
}

function nodeDownloadFileName(nodeVersion: string, platform: string, arch: string) {
  if (platform === 'win32') {
    return `node-v${nodeVersion}-win-${arch}.7z`
  }
  return `node-v${nodeVersion}-${platform}-${arch}.tar.gz`
}

function nodeDownloadURL(nodeVersion: string, platform: string, arch: string) {
  const downloadFileName = nodeDownloadFileName(nodeVersion, platform, arch)
  return nodeURL(nodeVersion, `/${downloadFileName}`)
}

function nodeOutputFileName(nodeVersion: string, platform: string, arch: string): string {
  let nodeFile = nodeFileName(nodeVersion, platform, arch)

  if (platform === 'win32') {
    nodeFile += '.exe'
  }

  return nodeFile
}

export async function fetchNodeBinary(options: FetchNodeBinaryOptions) {
  const {tmp, shasums, output, platform, nodeVersion} = options
  let {arch} = options
  if (arch === 'arm') arch = 'armv7l'

  const cacheDir = path.join(tmp, 'cache')
  const nodeDir = path.join(tmp, 'node')

  const sha = findSHASum(nodeDownloadFileName(nodeVersion, platform, arch), shasums)

  const nodeBase = nodeFileName(nodeVersion, platform, arch)
  const outputFileName = nodeOutputFileName(nodeVersion, platform, arch)
  const cacheFileName = path.join(cacheDir, outputFileName)
  let targetFileName = path.join(nodeDir, outputFileName)

  if (platform === 'win32') {
    targetFileName = `${targetFileName}.exe`
  }

  const config: CacheNodeOptions = {
    url: nodeDownloadURL(nodeVersion, platform, arch),
    downloadFileName: nodeDownloadFileName(nodeVersion, platform, arch),
    cacheDir: cacheDir,
    files: [outputFileName],
    cacheFileName,
    sha,
  }

  if (platform === 'win32') {
    await checkFor7Zip()
  }

  await qq.mkdirp(cacheDir)

  if (!await qq.exists(cacheFileName)) {
    log(`downloading ${nodeBase}`)
    await qq.mkdirp(path.dirname(targetFileName))
    await cacheNode(config)
  }

  await qq.cp(cacheFileName, output)
}
