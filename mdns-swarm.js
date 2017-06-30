var fs = require('fs')
var path = require('path')
var http = require('http')
var concat = require('concat-stream')
var debug = require('debug')('friendpm')
var Bonjour = require('bonjour')

module.exports = function (opts) {
  var peers = []

  var bonjour = Bonjour()
  var bonjourBrowser = null
  var bonjourName = 'friendpm' + (''+Math.random()).substring(2, 8)

  function mdnsInit () {
    if (!opts.skipPublish) mdnsBroadcast()

    bonjourBrowser = mdnsSearch()
    bonjourBrowser.on('up', function (service) {
      if (service.name === bonjourName) return
      debug('bonjour :: found a friendpm peer:', service)
      peers.push(service)
    })
    bonjourBrowser.on('down', function (service) {
      if (service.name === bonjourName) return
      debug('bonjour :: said goodbye to a friendpm peer:', service)
      peers = peers.filter(function (peer) { return peer.name !== service.name })
    })
  }

  function mdnsBroadcast () {
    debug('bonjour :: publishing')
    var service = bonjour.publish({ name: bonjourName, type: 'friendpm', port: opts.port })
  }

  function mdnsSearch (foundCb) {
    debug('bonjour :: searching')
    return bonjour.find({ type: 'friendpm' })
  }

  // 3 seconds to look for peers; be quick!
  var readyTime = Date.now() + 1000 * 3

  var reg = {}

  reg.fetchMetadata = function (pkg, done) {
    var diff = readyTime - Date.now()
    if (diff > 0) {
      console.log('waiting', diff, 'ms')
      return setTimeout(function () {
        reg.fetchMetadata(pkg, done)
      }, diff)
    }

    var responses = []
    var pending = peers.length

    if (!peers.length) {
      return done({notFound:true})
    }

    // Make HTTP requests to all peers (GET /:pkg)
    peers.forEach(function (peerInfo) {
      http.get({
        hostname: peerInfo.addresses[0],
        port: peerInfo.port,
        path: '/' + encodeURI(pkg).replace('/', '%2f') + '?ttl=0'
      }, function (res) {
        debug('GET', pkg, res.statusCode)
        if (res.statusCode === 200) responses.push(res)
        if (--pending === 0) processResponses()
      })
    })

    function processResponses () {
      if (responses.length === 0) done({notFound:true})
      else {
        // TODO: handle error
        responses[0].pipe(concat(function (data) {
          done(null, data)
        }))
      }
    }
  }

  reg.getTarballReadStream = function (tarball, done) {
    var diff = readyTime - Date.now()
    if (diff > 0) {
      console.log('waiting', diff, 'ms')
      return setTimeout(function () {
        reg.fetchMetadata(pkg, done)
      }, diff)
    }

    console.log('want tarball', tarball)
    var version = tarball.match(/.*-(\d\.\d\.\d).tgz/)[1]
    var pkg = tarball.match(/(.*)-\d\.\d\.\d.tgz/)[1]
    console.log('version', version)
    console.log('pkg', pkg)

    var responses = []
    var pending = peers.length

    // Make HTTP requests to all peers (GET /:pkg)
    peers.forEach(function (peerInfo) {
      http.get({
        hostname: peerInfo.addresses[0],
        port: peerInfo.port,
        path: '/' + tarball + '?ttl=0'
      }, function (res) {
        console.log('GET', pkg, res.statusCode)
        if (res.statusCode === 200) responses.push(res)
        if (--pending === 0) processResponses()
      })
    })

    function processResponses () {
      if (responses.length === 0) done({notFound:true})
      else done(null, responses[0])
    }
  }

  return reg
}
