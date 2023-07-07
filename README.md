# postie

postie is a small SMTP server for development purposes. It will provide you with a simple web UI where you can view the mails delivered to postie.

![postie-1 0 0-alpha 4](https://user-images.githubusercontent.com/512692/73296125-641d4480-4209-11ea-88f7-eecf4addec18.jpg)

## Running

### Docker

```sh
docker run --rm -it -p 1025:1025 -p 8025:8025 postiee/postie:1.0.0-alpha.5-1
```

or use `start --help` to learn about all options postie knows about:

```sh
docker run --rm -it -p 1025:1025 -p 8025:8025 postiee/postie:1.0.0-alpha.5-1 start --help
```

**Note:** When using the docker image postie defaults to an in-memory db.

### npm

```sh
npm i @axah/postie-cli
./node_modules/.bin/postie start
```

Use `--help` to print all options postie knows about:

```sh
./node_modules/.bin/postie start --help
```

**Note:** When **not** using the docker image postie defaults to use a mongodb running at `127.0.0.1:27017`.