var fs = require('fs')
var path = require('path')

module.exports = function () {
  var reg = {}

  reg.fetchMetadata = function (pkg, done) {
    var cacheMeta = path.join('/home/sww/.npm/registry.npmjs.org', pkg, '.cache.json')
    if (fs.existsSync(cacheMeta)) {
      done(null, fs.readFileSync(cacheMeta, 'utf8'))
    } else {
      done(new Error('could not find ' + pkg))
    }
  }

  reg.addUser = function (user, done) {
  }

  return reg
}
