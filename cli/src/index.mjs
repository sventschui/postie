#!/usr/bin/env node --experimental-modules
import sade from 'sade';
import mongodbModule from 'mongodb';
import { createServers } from '@postie_/server';
import postieWebPath from '@postie_/web';
import Koa from 'koa';
import Router from 'koa-router';
import koaStatic from 'koa-static';
import koaSend from 'koa-send';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import mm from 'mongodb-memory-server';
import http from 'http';
import path from 'path';

const { MongoMemoryServer } = mm;

const __dirname = dirname(fileURLToPath(import.meta.url));

const { MongoClient } = mongodbModule;

const prog = sade('postie');

prog
    .version('1.0.0');

prog
    .command('start')
    .option('--smtp-port', 'Change the port of the SMTP server', '1025')
    .option('--web-port', 'Change the port of the web server', '8025')
    .option('--context-root', 'Run everything under a context-root', '/')
    .option('--mongo-uri', 'Change the mongo uri used', 'mongodb://127.0.0.1:27017')
    .option('--mongo-db', 'Change the mongo db', 'mails')
    .option('--mongo-user', 'Change the mongo user')
    .option('--mongo-password', 'Change the mongo password')
    .option('--mongo-password-file', 'Change the mongo password (read from file)')
    .option('--in-memory', 'Use an in-memory mongodb', false)
    .action(async (opts) => {
        try { 
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
                    throw new Error('head regexp didn\'t match!');
                }

                contents = contents.replace(headRegexp, `$1<base href="${opts['context-root']}" />`)
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
                const instanceInfo = mongod.getInstanceInfo();
                instanceInfo.instance.auth
                mongoUri = await mongod.getUri();
                mongoDb = await mongod.getDbName();
                mongoUser = '';
                mongoPassword = '';
            }

            let auth;
            if (mongoUser) {
                auth = { user: mongoUser, password: mongoPassword };
            }
            const mongo = await MongoClient.connect(mongoUri, { useUnifiedTopology: true, auth });
            const db = mongo.db(mongoDb);
        
            const { router, installSubscriptionHandlers, smtpServer } = createServers({ db, apolloServerOptions: { subscriptions: `${opts['context-root']}graphql` } });

            const app = new Koa();
            app.use((ctx, next) => {
                ctx.path = ctx.path.replace(opts['context-root'], '/')
                return next();
            });

            // router.prefix(opts['context-root']);
            router.use(koaStatic(postieWebPath));
            router.get('*', (ctx) => {
                return koaSend(ctx, 'index.html', { root: postieWebPath });
            });
            app.use(router.routes());

            const httpServer = http.createServer(app.callback())
            installSubscriptionHandlers(httpServer);

            smtpServer.listen(parseInt(opts['smtp-port'], 10));
            httpServer.listen(parseInt(opts['web-port'], 10));
            console.log(`🚀 Server ready at http://127.0.0.1:${opts['web-port']}`);
        } catch (e) {
            console.log(e);
        }
    });

prog.parse(process.argv);
