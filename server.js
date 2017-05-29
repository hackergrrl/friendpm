var path = require('path')
var http = require('http')
var fs = require('fs')
var routes = require('routes')
var url = require('url')
var body = require('body')
var mkdirp = require('mkdirp')

var CACHE_DIR = process.env.npm_config_cache

module.exports = function (done) {
  var router = routes()
  router.addRoute('/:tarball\.tgz', onTarball)
  router.addRoute('/:pkg', onPackage)
  router.addRoute('/-/user/org.couchdb.user\::user', onAddUser)

  var registry = require('./local-cache')()

  var server = http.createServer(function (req, res) {
    console.log(req.method.toUpperCase() + ' ' + req.url)

    var dir = url.parse(req.url).pathname
    var match = router.match(dir)
    if (match) {
      match.fn(req, res, match)
    } else {
      res.statusCode = 404
      res.end()
    }
  })

  server.listen(9001, function () {
    done(null, server)
  })

  function onPackage (req, res, match) {
    if (req.method === 'GET') {
      var pkg = match.params.pkg
      registry.fetchMetadata(pkg, function (err, data) {
        if (err) {
          res.statusCode = 404
        } else {
          res.write(data)
          res.statusCode = 201
        }
        res.end()
      })
    } else if (req.method === 'PUT') {
      console.log('wants to publish', match.params.pkg)
      body(req, { limit: 100000000 }, function (err, data) {
        if (err) {
          console.log('err', err)
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
      console.log('wrote tarball')

      console.log(data)
      var pkgJson = JSON.stringify(data.versions[data['dist-tags'].latest])
      var cacheJson = JSON.stringify(data)

      mkdirp.sync(path.join(dir, 'package'))
      fs.writeFileSync(path.join(dir, 'package', 'package.json'), pkgJson, 'utf8')
      console.log('wrote meta')

      // write cache entry
      setTimeout(function () {
        var cacheDir = path.join(CACHE_DIR, 'localhost_9001', pkg)
        mkdirp.sync(cacheDir)
        fs.writeFileSync(path.join(cacheDir, '.cache.json'), cacheJson, 'utf8')
        console.log('wrote cache meta', cacheDir)
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
        console.log('created', dir)
        // TODO: handle err
        console.log('writing package.tgz')
        fs.writeFileSync(path.join(dir, 'package.tgz'), data, 'utf8')
        console.log('end write to', path.join(dir, 'package.tgz'))
        if (--pending === 0) return done(null)
      })
    })

  }

  function onAddUser (req, res, match) {
    console.log('wants to add user')
    body(req, function (err, data) {
      registry.addUser({
        name: data.name,
        email: data.email
      }, function (err) {
        if (err) {
          console.log('wants to add user: err')
          res.statusCode = 404
        } else {
          console.log('wants to add user: success')
          res.statusCode = 201
        }
        res.end()
      })
    })
  }

  function onTarball (req, res, match) {
    var tarball = match.params.tarball + '.tgz'
    console.log('getting tarball', tarball)
    var rs = store.createReadStream(tarball)
    rs.on('error', function (err) {
      console.log('unable to get tarball', tarball, err)
      res.statusCode = 404
      rs.unpipe(res)
      res.write(err.toString() + '\n')
      res.end()
    })
    rs.pipe(res)
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
        tarball: 'http://localhost:9001/' + hashes[version] + '.tgz'
      },
    }
  })

  // TODO: figure out actual latest version
  meta['dist-tags'] = {
    latest: Object.keys(hashes)[Object.keys(hashes).length - 1]
  }

  return meta
}
