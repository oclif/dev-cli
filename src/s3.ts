import * as S3 from 'aws-sdk/clients/s3'
import * as fs from 'fs-extra'

const debug = require('debug')('@oclif/dev-cli/s3')

export const uploadFile = (local: string, options: S3.Types.PutObjectRequest) => new Promise((resolve, reject) => {
  debug('uploadFile', local, `s3://${options.Bucket}/${options.Key}`)
  options.Body = fs.createReadStream(local)
  s3().upload(options, err => {
    if (err) reject(err)
    else resolve()
  })
})

export namespace upload {
  export interface Options {
    localFile: string
    s3Params: {
      Bucket: string
      Key: string
    }
  }
}

export function s3(): S3 {
  if (s3._s3) return s3._s3
  return s3._s3 = new (require('aws-sdk/clients/s3') as typeof S3)({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  })
}

export namespace s3 {
  export let _s3: S3
}
