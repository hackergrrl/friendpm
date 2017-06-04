#!/usr/bin/env node

var fs = require('fs')
var path = require('path')
var spawn = require('child_process').spawn
var homedir = require('os').homedir
var createServer = require('../server')
var args = require('minimist')(process.argv)

if (args._.length === 2) {
  printUsage()
  return
}

var port = args.p || args.port || 9001

switch (args._[2]) {
  case 'install':
  case 'i':
    startServerIfNeeded(port, function (err, server) {
      if (err) throw err

      var npmArgs = ['--registry', 'http://localhost:' + port]
      npmArgs = npmArgs.concat(args._.slice(2))
      var p = spawn('npm', npmArgs, {stdio:'inherit'})

      p.on('close', function (code, signal) {
        if (server) {
          server.close()
        } else process.exit(0)
      })
    })
    break
  case 'publish':
    if (!isNpmrcReady()) {
      console.log('init\'ing..')
      initNpmrc()
    }

    startServerIfNeeded(port, function (err, server) {
      if (err) throw err

      var npmArgs = [
        '--registry', 'http://localhost:' + port,
        '--cache-min=Infinity'
      ].concat(args._.slice(2))
      var p = spawn('npm', npmArgs, {stdio:'inherit'})

      p.on('close', function (code, signal) {
        if (server) {
          server.close()
        } else process.exit(0)
      })
    })
    break
  case 'share':
    createServer({port:port}, function (err, server) {
      console.log('listening on http://0.0.0.0:' + port)
    })
    break
  default:
    printUsage()
    break
}

// Start a new friendpm server, if one is not already running.
// TODO: don't enable mdns if we're creating a new one; user may not want/expect that
function startServerIfNeeded (port, done) {
  createServer({port:port, skipPublish: true}, function (err, server) {
    if (err && err.code === 'EADDRINUSE') {
      done()
    } else if (!err) {
      done(null, server)
    } else {
      done(err)
    }
  })
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
