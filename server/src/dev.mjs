import mongodbModule from "mongodb";
import Koa from "koa";
import http from "http";
import { createServers } from "./index.mjs";

const { MongoClient } = mongodbModule;

(async () => {
  const mongo = await MongoClient.connect("mongodb://127.0.0.1:27017", {
    useUnifiedTopology: true
  });
  const db = mongo.db("mail");

  const { router, installSubscriptionHandlers, smtpServer } = await createServers({
    db
  });

  const app = new Koa();

  app.use(router.routes());
  app.use(router.allowedMethods());

  const server = http.createServer(app.callback());

  installSubscriptionHandlers(server);

  smtpServer.listen(1030);
  server.listen(8025);

  console.log("🚀 Server ready at http://127.0.0.1:8025");
})();
