const {worker} = require('workerpool');
const {createGzip} = require('zlib');
const {pipeline: streamPipeline} = require('stream');
const {promisify} = require('util');
const fs = require('fs');

const pipeline = promisify(streamPipeline);

function gzip(filePath, target) {
  const gzip = createGzip({level: 6});
  const readStream = fs.createReadStream(filePath);
  const writeStream = fs.createWriteStream(target);
  return pipeline(readStream, gzip, writeStream).then(() => true);
}

worker({
  gzip: gzip
})
