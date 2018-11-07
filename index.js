'use strict'
const {promisify: p} = require('util')
const fs = require('fs')
const os = require('os')

const KB = 1024
const MB = 1024 * KB

const ALLOCATION_CHUNK = 30 * MB

async function main(alloc) {
  console.log('Press Ctrl+C to terminate')

  for (;;) {
    alloc()
    console.log('memory:', ...[...Object.entries(process.memoryUsage())].map(([key, value]) => [key, Math.ceil(value / MB)]))

    await p(setTimeout)(parseInt(process.env.WAIT_BETWEEN_ALLOCS, 10) || 100)
  }
}

const mbFileDir = fs.mkdtempSync(os.tmpdir() + '/')
const mbFilename = mbFileDir + '/mbfile.txt'
fs.writeFileSync(mbFilename, 'a'.repeat(ALLOCATION_CHUNK))

function bufferAllocation() {
  Buffer.alloc(ALLOCATION_CHUNK)
}

function stringAllocation() {
  'a'.repeat(30 * MB)
}

function fileBufferAllocation() {
  return fs.readFileSync(mbFilename)
}

// main(bufferAllocation).catch(console.error)
// main(stringAllocation).catch(console.error)
// main(fileBufferAllocation).catch(console.error)

main(eval(process.env.ALLOC_METHOD || 'bufferAllocation')).catch(console.error)
