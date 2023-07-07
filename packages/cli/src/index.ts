#!/usr/bin/env node
import sade from 'sade';
import type { Auth } from 'mongodb';
import { MongoClient } from 'mongodb';
import { createServers } from '@axah/postie-server';
import postieWebPath from '@axah/postie-web';
import type { ParameterizedContext } from 'koa';
import Koa from 'koa';
import basicAuth from 'koa-basic-auth';
import koaStatic from 'koa-static';
import koaSend from 'koa-send';
import path from 'path';
import fs from 'fs';
import { MongoMemoryServer } from 'mongodb-memory-server';
import http from 'http';
import packageJson from '../package.json';

const prog = sade(packageJson.version);

prog.version('1.0.0');

prog
  .command('start')
  .option('--smtp-port', 'Change the port of the SMTP server', '1025')
  .option('--web-port', 'Change the port of the web server', '8025')
  .option('--web-auth', 'Require BASIC authentication', false)
  .option('--web-auth-username', 'Username for BASIC authentication', 'foo')
  .option('--web-auth-password', 'Password for BASIC authentication', 'bar')
  .option('--web-auth-password-file', 'Password file for BASIC authentication')
  .option('--context-root', 'Run everything under a context-root', '/')
  .option('--mongo-uri', 'Change the mongo uri used', 'mongodb://127.0.0.1:27017')
  .option('--mongo-db', 'Change the mongo db', 'mails')
  .option('--mongo-user', 'Change the mongo user')
  .option('--mongo-password', 'Change the mongo password')
  .option('--mongo-password-file', 'Change the mongo password (read from file)')
  .option(
    '--smtp-allow-insecure-auth',
    'Allow AUTH on non-secure (non-tls) SMTP connections',
    false,
  )
  .option('--smtp-auth-allow-all', 'SMTP allow all user/password combinations', false)
  .option('--smtp-auth-username', 'SMTP user', 'postie')
  .option('--smtp-auth-password', 'SMTP password', 'postie')
  .option('--smtp-auth-password-file', 'SMTP password file')
  .option('--in-memory', 'Use an in-memory mongodb', false)
  .action(async (opts) => {
    try {
      const httpServer = http.createServer();
      const indexHtml = path.join(postieWebPath, 'index.html');
      let contents = await fs.promises.readFile(indexHtml, 'utf8');
      const baseHrefRegexp = /<base(.+?)href=["']([^"']+?)["']/;
      const headRegexp = /(<head[^>]*?>)/;
      const baseHrefMatch = contents.match(baseHrefRegexp);
      if (baseHrefMatch) {
        contents = contents.replace(baseHrefRegexp, `<base$1href="${opts['context-root']}"`);
        await fs.promises.writeFile(indexHtml, contents);
      } else {
        const headMatch = contents.match(headRegexp);

        if (!headMatch) {
          throw new Error("head regexp didn't match!");
        }

        contents = contents.replace(headRegexp, `$1<base href="${opts['context-root']}" />`);
        await fs.promises.writeFile(indexHtml, contents);
      }

      let mongoUri = opts['mongo-uri'];
      let mongoUser = opts['mongo-user'];
      let mongoPassword = opts['mongo-password-file']
        ? fs.readFileSync(opts['mongo-password-file'], 'utf8').trim()
        : opts['mongo-password'];
      let mongoDb = opts['mongo-db'];

      if (opts['in-memory']) {
        const mongod = new MongoMemoryServer();
        await mongod.start();
        const mongoInstanceData = await mongod.ensureInstance();
        mongoUri = mongod.getUri();
        mongoDb = mongoInstanceData.dbName;
        mongoUser = '';
        mongoPassword = '';
      }

      let auth: Auth | undefined;
      if (mongoUser) {
        auth = { username: mongoUser, password: mongoPassword };
      }
      const mongo = await MongoClient.connect(mongoUri, { auth });
      const db = mongo.db(mongoDb);

      const smtpPassword = opts['smtp-auth-password-file']
        ? await fs.promises.readFile(opts['smtp-auth-password-file'], 'utf8')
        : opts['smtp-auth-password'];

      const { router, smtpServer } = await createServers({
        db,
        httpServer,
        smtpServerOptions: {
          allowInsecureAuth: opts['smtp-allow-insecure-auth'],
          onAuth(
            authentication: { username?: string; password?: string },
            _,
            callback: (test: null, auth: { user: string | null }) => void,
          ) {
            if (
              opts['smtp-auth-allow-all'] ||
              (authentication.username === opts['smtp-auth-username'] &&
                authentication.password === smtpPassword)
            ) {
              callback(null, { user: authentication.username || null });
            } else {
              callback(null, { user: null });
            }
          },
        },
      });

      const app = new Koa();

      if (opts['web-auth']) {
        console.warn(
          'When enabling basic auth service workers are disabled. This might lead to issues and require a hard-reload in your browser when you had service workers enabled before!',
        );
        app.use(async (ctx, next) => {
          try {
            await next();
          } catch (err) {
            if ((err as Error & { status: number }).status === 401) {
              ctx.status = 401;
              ctx.set('WWW-Authenticate', 'Basic');
              ctx.body = 'cant haz that';
            } else {
              throw err;
            }
          }
        });

        const basicAuthPassword = opts['web-auth-password-file']
          ? (await fs.promises.readFile(opts['web-auth-password-file'], 'utf8')).trim()
          : opts['web-auth-password'];
        app.use(
          basicAuth({
            name: opts['web-auth-username'] as string,
            pass: basicAuthPassword as string,
          }),
        );

        app.use((ctx, next) => {
          if (ctx.path === '/sw-esm.js' || ctx.path === '/sw.js') {
            ctx.status = 404;
            return;
          }

          // eslint-disable-next-line consistent-return
          return next();
        });
      }

      app.use((ctx, next) => {
        ctx.path = ctx.path.replace(opts['context-root'], '/');
        return next();
      });

      // router.prefix(opts['context-root']);
      router.use(koaStatic(postieWebPath));
      router.get('(.*)', (ctx: ParameterizedContext) => {
        return koaSend(ctx, 'index.html', { root: postieWebPath });
      });
      app.use(router.routes());

      httpServer.on('request', app.callback());

      smtpServer.listen(parseInt(opts['smtp-port'], 10));
      httpServer.listen(parseInt(opts['web-port'], 10));
      console.log(`🚀 Server ready at http://127.0.0.1:${opts['web-port']}`);
    } catch (e) {
      console.log(e);
    }
  });

prog.parse(process.argv);
