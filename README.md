# postie

postie is a small SMTP server for development purposes. It will provide you with a simple web UI where you can view the mails delivered to postie.

## Open points

- Allow the deletion of single messages and all messages matching the current search criteria
- Target the currently active `MessageConncetion` instead of the one without filters in the subscription updater function.
- Add a fallback for the websockets used in GQL subscriptions
- Think about invalidateing graphcache when changing search criterias as subscriptions might only target the currently displayed `MessageConnection`.

## Running

### Docker

```sh
docker run --rm -it -p 1025:1025 -p 8025:8025 postiee/postie:1.0.0-alpha.4-1
```

or use `start --help` to learn about all options postie knows about:

```sh
docker run --rm -it -p 1025:1025 -p 8025:8025 postiee/postie:1.0.0-alpha.4-1 start --help
```

**Note:** When using the docker image postie defaults to an in-memory db.

### npm

```sh
npm i @postie_/cli
./node_modules/.bin/postie start
```

Use `--help` to print all options postie knows about:

```sh
./node_modules/.bin/postie start --help
```

**Note:** When **not** using the docker image postie defaults to use a mongodb running at `127.0.0.1:27017`.

## Thanks

Thanks to all the OSS maintainers of the awesome libraries that made building postie a blast.

Special thanks to [@JoviDeCroock](http://github.com/JoviDeCroock/) for helping me out with all my questions related to [urql](https://github.com/FormidableLabs/urql) ✨.
