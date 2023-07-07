import type { SMTPServerOptions as SmtpServerOptions } from 'smtp-server';
import { SMTPServer as SmtpServer } from 'smtp-server';
import type { CreateIndexesOptions, Db, IndexSpecification } from 'mongodb';
import { GridFSBucket, ObjectId } from 'mongodb';
import Router from 'koa-router';
import { throwableToError } from '@axah/js-utils';
import bodyParser from 'koa-bodyparser';
import { koaMiddleware } from '@as-integrations/koa';
import { ApolloServer } from '@apollo/server';
import type { Server } from 'http';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import {
  ApolloServerPluginInlineTraceDisabled,
  ApolloServerPluginUsageReportingDisabled,
} from '@apollo/server/plugin/disabled';
import { Context } from '@axah/gateway-utils';
import { Server as WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import packageJson from '../package.json';
import { resolvers, typeDefs } from './graphql';
import storeMailInDb from './messages/store-mail-in-db';
import type { Message } from './messages/types';

type Index = {
  key: IndexSpecification;
} & CreateIndexesOptions & {
    name: string;
  };

const indexes: ReadonlyArray<Index> = [
  {
    key: { lang: 1 },
    name: 'messages.lang',
  },
  {
    key: { from: 1 },
    name: 'messages.from',
  },
  {
    key: { to: 1 },
    name: 'messages.to',
  },
  {
    key: { text: 1 },
    name: 'messages.text',
  },
  {
    key: { subject: 1 },
    name: 'messages.subject',
  },
];

export async function createServers({
  db,
  httpServer,
  smtpServerOptions = {},
  graphqlPath = '/graphql',
}: {
  db: Db;
  httpServer: Server;
  smtpServerOptions?: Partial<SmtpServerOptions>;
  graphqlPath?: string;
}) {
  const messages = db.collection<Message>('messages');
  const attachmentsBucket = new GridFSBucket(db, {
    bucketName: 'attachments',
    chunkSizeBytes: 1024 * 1024,
  });

  await Promise.all(indexes.map(({ key, ...options }) => messages.createIndex(key, options)));

  const smtpServer = new SmtpServer({
    secure: false,
    name: packageJson.name,
    banner: `${packageJson.name} ${packageJson.version}`,
    size: 1024 * 1024 * 100, // 100 MB max mail size
    authOptional: true,
    disableReverseLookup: true,
    logger: true,
    ...smtpServerOptions,
    async onData(stream, _session, callback) {
      try {
        await storeMailInDb({ stream, messages, attachmentsBucket });

        callback();
      } catch (e: any) {
        const error = throwableToError(e);
        console.error(error, 'Failed to accept mail!');
        callback(error);
      }
    },
  });

  const router = new Router();

  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const wsServer = new WebSocketServer({
    server: httpServer,
    path: graphqlPath,
  });
  const serverCleanup = useServer({ schema }, wsServer);

  const apolloServer = new ApolloServer({
    schema,
    plugins: [
      ApolloServerPluginUsageReportingDisabled(),
      ApolloServerPluginInlineTraceDisabled(),
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        // eslint-disable-next-line @typescript-eslint/require-await
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
  });

  await apolloServer.start();

  router.all(
    graphqlPath,
    bodyParser(),
    koaMiddleware(apolloServer, {
      // eslint-disable-next-line @typescript-eslint/require-await
      context: async ({ ctx }: { ctx: any }) => ({
        ...Context.fromKoaHeader(ctx.request.header),
        messages,
        attachmentsBucket,
      }),
    }),
  );

  router.get('/attachments/:id', async (ctx) => {
    const _id = ObjectId.createFromHexString(ctx.params.id);
    const meta = await attachmentsBucket.find({ _id }).limit(1).next();

    if (meta) {
      ctx.set('Content-Disposition', `attachment; filename="${meta.filename}"`);
      ctx.set('Content-Type', meta.contentType as string);
      ctx.body = attachmentsBucket.openDownloadStream(_id);
    } else {
      ctx.status = 404;
    }
  });

  return {
    smtpServer,
    router,
  };
}
