import sade from 'sade';
import mongodbModule from 'mongodb';
import { createServers } from '@postie/server';
import apolloServerModule from 'apollo-server-koa';
import Koa from 'koa';

const { MongoClient } = mongodbModule;
const { ApolloServer } = apolloServerModule;

const prog = sade('postie');

prog
    .version('1.0.0');

prog
    .command('start')
    .action(async () => {
        const mongo = await MongoClient.connect('mongodb://127.0.0.1:27017', { useUnifiedTopology: true });
    
        const { graphqlServer, smtpServer } = createServers({ mongo, ApolloServer });
    
        smtpServer.listen(1031);

        const app = new Koa();

        graphqlServer.applyMiddleware({ app });
        // TODO: create a middleware in @postie/web/src/middleware.js that serves the postie GUI

        app.listen(8026);
        console.log(`🚀 Server ready at`);
    });

prog.parse(process.argv);
