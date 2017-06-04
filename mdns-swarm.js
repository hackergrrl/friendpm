var fs = require('fs')
var path = require('path')
var http = require('http')
var concat = require('concat-stream')
var debug = require('debug')('friendpm')

module.exports = function () {
  var peers = []

  var reg = {
    addPeerService: function (service) {
      peers.push(service)
    },
    removePeerService: function (service) {
      peers = peers.filter(function (peer) { return peer.name !== service.name })
    }
  }

  reg.fetchMetadata = function (pkg, done) {
    var responses = []
    var pending = peers.length

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
