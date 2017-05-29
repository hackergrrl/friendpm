var through = require('through2')
var fs = require('fs')
var path = require('path')

var CACHE_DIR = process.env.npm_config_cache

module.exports = function () {
  var t = through.obj()

  process.nextTick(function () {
    var root = CACHE_DIR
    var dirs = fs.readdirSync(root)
    console.log('found', dirs.length)
    dirs.forEach(function (pkgDir) {
      try {
        var versions = fs.readdirSync(path.join(root, pkgDir))
        versions.forEach(function (version) {
          var filename = path.join(root, pkgDir, version, 'package', 'package.json')
          if (fs.existsSync(filename)) {
            var contents = JSON.parse(fs.readFileSync(filename, 'utf-8'))
            if (contents && contents.dist && contents.dist.shasum) {
              var tgz = path.join(root, pkgDir, version, 'package.tgz')
              t.write({
                pkg: pkgDir,
                version: version,
                tgz: tgz,
                shasum: contents.dist.shasum
              })
              // console.log(pkgDir, version, contents.dist.shasum)
            }
          }
        })
      } catch (e) {}
    })
  })

  return t
}

// var s = module.exports()
// s.on('data', function (p) {
//   // process.stdout.write('.')
//   console.log(p)
// })

