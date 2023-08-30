import { MongoClient } from 'mongodb';
import Koa from 'koa';
import http from 'http';
import { createServers } from './index';
import { log } from './log';

(async () => {
  const httpServer = http.createServer();
  const mongo = await MongoClient.connect('mongodb://127.0.0.1:27017');
  const db = mongo.db('mail');

  const { router, smtpServer } = await createServers({
    db,
    httpServer,
  });

  const app = new Koa();

  app.use(router.routes());
  app.use(router.allowedMethods());

  httpServer.on('request', app.callback());

  smtpServer.listen(1030);
  httpServer.listen(8025);

  log.info('🚀 Server ready at http://127.0.0.1:8025');
})();
