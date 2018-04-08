import * as S3 from 'aws-sdk/clients/s3'
import * as fs from 'fs-extra'
import * as qq from 'qqjs'

import {debug, log} from './log'

export const uploadFile = (local: string, options: S3.Types.PutObjectRequest) => new Promise((resolve, reject) => {
  log('s3:uploadFile', qq.prettifyPaths(local), `s3://${options.Bucket}/${options.Key}`)
  options.Body = fs.createReadStream(local)
  s3().upload(options, err => {
    if (err) reject(err)
    else resolve()
  })
})

export const headObject = (options: S3.Types.HeadObjectRequest) => new Promise<S3.HeadObjectOutput>((resolve, reject) => {
  debug('s3:headObject', `s3://${options.Bucket}/${options.Key}`)
  s3().headObject(options, (err, data) => {
    if (err) reject(err)
    else resolve(data)
  })
})

// export const getObject = (options: S3.Types.GetObjectRequest) => new Promise<S3.GetObjectOutput>((resolve, reject) => {
//   debug('getObject', `s3://${options.Bucket}/${options.Key}`)
//   s3().getObject(options, (err, data) => {
//     if (err) reject(err)
//     else resolve(data)
//   })
// })

// export const listObjects = (options: S3.Types.ListObjectsV2Request) => new Promise<S3.ListObjectsV2Output>((resolve, reject) => {
//   debug('listObjects', `s3://${options.Bucket}/${options.Prefix}`)
//   s3().listObjectsV2(options, (err, objects) => {
//     if (err) reject(err)
//     else resolve(objects)
//   })
// })

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
