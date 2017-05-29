#!/usr/bin/env node

var fs = require('fs')
var path = require('path')
var spawn = require('child_process').spawn
var homedir = require('os').homedir
var createServer = require('../server')

if (process.argv.length === 2) {
  printUsage()
  return
}

switch (process.argv[2]) {
  case 'install':
  case 'i':
    var args = ['--registry', 'http://localhost:9001']
    args = args.concat(process.argv.slice(2))
    spawn('npm', args, {stdio:'inherit'})
    break
  case 'publish':
    if (!isNpmrcReady()) {
      console.log('init\'ing..')
      initNpmrc()
    }

    var args = [
      '--registry', 'http://localhost:9001',
      '--cache-min=Infinity'
    ].concat(process.argv.slice(2))
    spawn('npm', args, {stdio:'inherit'})
    break
  case 'share':
    createServer(function (err, server) {
      console.log('listening on http://0.0.0.0:9001')
    })
    break
  default:
    printUsage()
    break
}

function printUsage () {
  require('fs').createReadStream(__dirname + '/usage.txt').pipe(process.stdout)
}

function isNpmrcReady () {
  var npmrc = fs.readFileSync(path.join(homedir(), '.npmrc'))
  return npmrc.indexOf('//localhost:9001/:_authToken=baz') !== -1
}

function initNpmrc () {
  fs.appendFileSync(path.join(homedir(), '.npmrc'), '//localhost:9001/:_authToken=baz')
}
