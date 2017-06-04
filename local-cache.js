var fs = require('fs')
var path = require('path')

var CACHE_DIR = process.env.npm_config_cache

module.exports = function () {
  var reg = {}

  reg.fetchMetadata = function (pkg, done) {
    var cacheMeta = path.join(CACHE_DIR, 'registry.npmjs.org', pkg, '.cache.json')
    if (fs.existsSync(cacheMeta)) {
      done(null, fs.readFileSync(cacheMeta, 'utf8'))
    } else {
      cacheMeta = path.join(CACHE_DIR, 'localhost_9001', pkg, '.cache.json')
      if (fs.existsSync(cacheMeta)) {
        done(null, fs.readFileSync(cacheMeta, 'utf8'))
      } else {
        done({ notFound: true })
      }
    }
  }

  return reg
}
