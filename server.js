var path = require('path')
var http = require('http')
var fs = require('fs')
var routes = require('routes')
var url = require('url')
var body = require('body')
var mkdirp = require('mkdirp')
var once = require('once')
var debug = require('debug')('friendpm')
var Bonjour = require('bonjour')
var url = require('url')

var CACHE_DIR = process.env.npm_config_cache

module.exports = function (opts, done) {
  if (typeof opts === 'function' && !done) {
    done = opts
    opts = {}
  }
  opts = opts || {}
  opts.port = opts.port || 9001
  opts.skipPublish = opts.skipPublish || false
  done = once(done)

  var bonjour = Bonjour()
  var bonjourBrowser = null
  var bonjourName = 'friendpm-' + (''+Math.random()).substring(2, 8)

  var router = routes()
  router.addRoute('/:tarball\.tgz', onTarball)
  router.addRoute('/:pkg/-/:tarball\.tgz', onTarball)
  router.addRoute('/:pkg', onPackage)
  router.addRoute('/-/user/org.couchdb.user\::user', onAddUser)

  var cache = require('./local-cache')({port:opts.port})
  var swarm = require('./mdns-swarm')()

  var server = http.createServer(function (req, res) {
    debug(req.method.toUpperCase() + ' ' + req.url)

    var dir = url.parse(req.url).pathname
    var match = router.match(dir)
    if (match) {
      match.fn(req, res, match)
    } else {
      res.statusCode = 404
      res.end()
    }
  })

  server.on('error', function (err) {
    done(err)
  })
  server.listen(opts.port, function () {
    mdnsInit()
    done(null, server)
  })

  function mdnsInit () {
    if (!opts.skipPublish) mdnsBroadcast()

    bonjourBrowser = mdnsSearch()
    var peers = []
    bonjourBrowser.on('up', function (service) {
      if (service.name === bonjourName) return
      console.log('bonjour :: found a friendpm peer:', service)
      swarm.addPeerService(service)
    })
    bonjourBrowser.on('down', function (service) {
      if (service.name === bonjourName) return
      console.log('bonjour :: said goodbye to a friendpm peer:', service)
      swarm.removePeerService(service)
    })
  }

  function mdnsBroadcast () {
    console.log('bonjour :: publishing')
    bonjour.publish({ name: bonjourName, type: 'friendpm', port: opts.port })
  }

  function mdnsSearch (foundCb) {
    console.log('bonjour :: searching')
    return bonjour.find({ type: 'friendpm' })
  }

  function onPackage (req, res, match) {
    if (req.method === 'GET') {
      var q = url.parse(req.url, true)
      var shouldUseSwarm = Number(url.parse(req.url, true).query.ttl) !== 0

      var pkg = decodeURI(match.params.pkg)
      cache.fetchMetadata(pkg, function (err, data) {
        // if (shouldUseSwarm) err = {notFound:true}  // TEMP
        if (err && err.notFound) {
          if (shouldUseSwarm) {
            swarm.fetchMetadata(pkg, function (err, data) {
              if (err) {
                res.statusCode = 404
                res.end()
              } else {
                res.write(data)
                res.statusCode = 201
                res.end()
              }
            })
          } else {
            res.statusCode = 404
            res.end()
            return
          }
        } else if (err) {
          res.statusCode = 404
          res.end()
        } else {
          res.write(data)
          res.statusCode = 201
          res.end()
        }
      })
    } else if (req.method === 'PUT') {
      debug('wants to publish', match.params.pkg)
      body(req, { limit: 100000000 }, function (err, data) {
        if (err) {
          debug('err', err)
          res.statusCode = 500
          res.end()
          return
        }
        data = JSON.parse(data)
        publishPackage(data, function (err) {
          if (err) {
            res.statusCode = 404
            res.end(JSON.stringify({error: err.toString()}))
          } else {
            res.statusCode = 201
          }
          res.end()
        })
      })
    } else {
      res.statusCode = 404
      res.end()
    }
  }

  function publishPackage (data, done) {
    var attachments = data._attachments
    delete data._attachments

    var pkg = data.name
    var version = data['dist-tags'].latest
    var dir = path.join(CACHE_DIR, pkg, version)

    writeAttachments(pkg, attachments, dir, function (err) {
      if (err) return done(err)
      debug('wrote tarball')

      debug(data)
      var pkgJson = JSON.stringify(data.versions[data['dist-tags'].latest])
      var cacheJson = JSON.stringify(data)

      mkdirp.sync(path.join(dir, 'package'))
      fs.writeFileSync(path.join(dir, 'package', 'package.json'), pkgJson, 'utf8')
      debug('wrote meta')

      // write cache entry
      setTimeout(function () {
        var cacheDir = path.join(CACHE_DIR, 'localhost_' + opts.port, pkg)
        mkdirp.sync(cacheDir)
        fs.writeFileSync(path.join(cacheDir, '.cache.json'), cacheJson, 'utf8')
        debug('wrote cache meta', cacheDir)
      }, 1000)

      done()
    })
  }

  function writeAttachments (pkg, attachments, dir, done) {
    var pending = Object.keys(attachments).length
    var res = []

    Object.keys(attachments).forEach(function (filename) {
      var data = new Buffer(attachments[filename].data, 'base64')
      mkdirp(dir, function (err) {
        debug('created', dir)
        // TODO: handle err
        debug('writing package.tgz')
        fs.writeFileSync(path.join(dir, 'package.tgz'), data, 'utf8')
        debug('end write to', path.join(dir, 'package.tgz'))
        if (--pending === 0) return done(null)
      })
    })

  }

  function onAddUser (req, res, match) {
    debug('wants to add user')
    body(req, function (err, data) {
      res.statusCode = 201
      res.end()
    })
  }

  function onTarball (req, res, match) {
    var tarball = match.params.tarball + '.tgz'
    debug('getting tarball', tarball)
    cache.getTarballReadStream(tarball, function (err, stream) {
      if (err) {
        debug('unable to get tarball', tarball, err)
        res.statusCode = 404
        res.end(err.toString() + '\n')
      } else {
        stream.pipe(res)
      }
    })
  }


  return server
}

function mapHashesToMetadata (pkg, hashes) {
  var meta = {
    _id: pkg,
    name: pkg,
    versions: {}
  }

  Object.keys(hashes).forEach(function (version) {
    meta.versions[version] = {
      name: pkg,
      version: version,
      dist: {
        shasum: hashes[version],
        tarball: 'http://localhost:' + opts.port + '/' + hashes[version] + '.tgz'
      },
    }
  })

  // TODO: figure out actual latest version
  meta['dist-tags'] = {
    latest: Object.keys(hashes)[Object.keys(hashes).length - 1]
  }

  return meta
}
