var fs = require('fs')
var path = require('path')

var CACHE_DIR = process.env.npm_config_cache

module.exports = function (opts) {
  var reg = {}
  opts = opts || {}
  opts.port = opts.port || 9001

  reg.fetchMetadata = function (pkg, done) {
    // npm cache escapes
    pkg = pkg.replace('@', '_40')
    pkg = pkg.replace('/', '_252f')

    var cacheMeta = path.join(CACHE_DIR, 'registry.npmjs.org', pkg, '.cache.json')
    console.log('path', cacheMeta)
    if (fs.existsSync(cacheMeta)) {
      var data = JSON.parse(fs.readFileSync(cacheMeta, 'utf8'))
      fixTarballUrl(data, 'localhost:' + opts.port)
      done(null, JSON.stringify(data))
    } else {
      cacheMeta = path.join(CACHE_DIR, 'localhost_' + opts.port, pkg, '.cache.json')
      if (fs.existsSync(cacheMeta)) {
        var data = JSON.parse(fs.readFileSync(cacheMeta, 'utf8'))
        fixTarballUrl(data, 'localhost_' + opts.port)
        done(null, JSON.stringify(data))
      } else {
        done({ notFound: true })
      }
    }
  }

  reg.getTarballReadStream = function (tarball, done) {
    console.log('want tarball', tarball)
    var version = tarball.match(/.*-(\d\.\d\.\d).tgz/)[1]
    var pkg = tarball.match(/(.*)-\d\.\d\.\d.tgz/)[1]
    console.log('version', version)
    console.log('pkg', pkg)

    var cacheTarball = path.join(CACHE_DIR, pkg, version, 'package.tgz')
    console.log('path', cacheTarball)
    if (fs.existsSync(cacheTarball)) {
      done(null, fs.readFileSync(cacheTarball, 'utf8'))
    } else {
      done({ notFound: true })
    }
  }

  return reg
}

function fixTarballUrl (data, cacheDirName) {
  Object.keys(data.versions).forEach(function (version) {
    data.versions[version].dist.tarball = data.versions[version].dist.tarball
      .replace('registry.npmjs.org', cacheDirName)
  })
}
