#!/usr/bin/env node

var comandante = require('comandante')
var fs = require('fs')
var path = require('path')
var spawn = require('child_process').spawn
var config = require('application-config-path')
var homedir = require('os').homedir
var scan = require('../scan-cache')
var through = require('through2')

if (process.argv.length === 2) {
  printUsage()
  return
}

switch (process.argv[2]) {
  // TODO how to deal with cache updates after initial 'init'?
  case 'init':
    doInit()
    break
  case 'install':
  case 'i':
    console.log('TODO')
    break
  // TODO publish to cache + index
  case 'publish':
    console.log('TODO')
    break
  case 'share':
    console.log('TODO')
    // createServer(function (err, server) {
    //   console.log('listening on http://0.0.0.0:9000')
    // })
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
  return npmrc.indexOf('//localhost:9000/:_authToken=baz') !== -1
}

function initNpmrc () {
  fs.appendFileSync(path.join(homedir(), '.npmrc'), '//localhost:9000/:_authToken=baz')
}

function doInit () {
  scan().pipe(through(function (entry, enc, next) {
    console.log(entry)
    next()
  }, function (flush) {
    // ...
  }))
}
