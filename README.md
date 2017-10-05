# friendpm

> Share, publish, and install node packages from your cache over the local
> network.

## Install

With [npm](https://npmjs.org/) installed, run

```
$ npm install --global friendpm
```

## Usage

Use the `friendpm` command just like `npm`, except the `install` and `publish`
subcommands operate on your machine's cache and other friendpm users on the
local network, instead of the NPM central servers.

```
  friendpm i, install [-S] [-D]

    Works like `npm install`. Accepts a package name to install from someone on
    the local network, or your own cache if none are found.

  friendpm publish

    Works like `npm publish`, except your package is only published to your
    local cache. It can be installed immediately after by you or others on the
    network (if you're running `friendpm share`).

  friendpm share

    Run a tiny npm registry that other `friendpm` users can discover and use
    over the local network.

```

## Caveats

At version 5 `npm` changed its internal caching mechanism, making `friendpm` no
longer work with it. However, your left-over npm cache from when you ran 4 or
earlier (if you did) still remains and can be shared!

You can downgrade to `npm@4` or earlier, *or* consider donating a patch that
adds npm5 caching support!

## License

ISC

