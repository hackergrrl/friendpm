var fs = require('fs')
var path = require('path')
var homedir = require('os').homedir

module.exports = function () {
  var reg = {}

  reg.fetchMetadata = function (pkg, done) {
    var cacheMeta = path.join(homedir(), '.npm', 'registry.npmjs.org', pkg, '.cache.json')
    if (fs.existsSync(cacheMeta)) {
      done(null, fs.readFileSync(cacheMeta, 'utf8'))
    } else {
      cacheMeta = path.join(homedir(), '.npm', 'localhost_9001', pkg, '.cache.json')
      if (fs.existsSync(cacheMeta)) {
        done(null, fs.readFileSync(cacheMeta, 'utf8'))
      } else {
        done(new Error('could not find ' + pkg))
      }
    }
  }

  reg.addUser = function (user, done) {
  }

  return reg
}
