# friendpm

> Share, publish, and install node packages from your cache over the local
> network.

## Upcoming: 1.0.0 Release

There are still a bunch of things to do before a `1.0.0` release: [here is an
issue](https://github.com/noffle/friendpm/issues/2) for it. Contributions
*very* welcome! Ask if you're unsure about anything.

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

1. `npm@3` and `npm@4` only. Untested with `npm@5`.

## License

ISC

