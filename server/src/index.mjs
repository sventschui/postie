import smtpServerModule from 'smtp-server';
import mongodbModule from 'mongodb';
import Router from 'koa-router';
import createGraphqlServer from './graphql/index.mjs';
import storeMailInDb from './store-mail-in-db.mjs';

const { SMTPServer: SmtpServer } = smtpServerModule;
const { GridFSBucket, ObjectID } = mongodbModule;

export function createServers({ db, apolloServerMiddlewareOptions = {}, apolloServerOptions = {} }) {
    const messages = db.collection('messages');
    const attachmentsBucket = new GridFSBucket(db, { bucketName: 'attachments', chunkSizeBytes: 1024 * 1024 })

    const smtpServer = new SmtpServer({
        secure: false,
        name: 'postie',
        banner: 'postie v1.0.0-alpha-1',
        size: 1024 * 1024 * 100, // 100 MB max mail size
        hideSize: false,
        authOptional: true,
        disableReverseLookup: true,
        logger: true,
        async onData(stream, session, callback) {
            try {
                await storeMailInDb({ stream, messages, attachmentsBucket });
    
                callback();
            } catch (e) {
                console.error('Failed to accept mail!');
                callback(e);
            }
        }
    });

    const router = new Router();

    const apolloServer = createGraphqlServer({ messages, attachmentsBucket, apolloServerOptions });
    apolloServer.applyMiddleware({
        ...apolloServerMiddlewareOptions,
        app: {
            use(mw) {
                router.get('/graphql', mw);
                router.post('/graphql', mw);
            },
        },
    });

    router.get('/attachments/:id', async (ctx) => {
        const _id = ObjectID.createFromHexString(ctx.params.id);
        const meta = await attachmentsBucket.find({ _id }).limit(1).next();

        if (meta) {
            ctx.set('Content-Disposition', `attachment; filename="${meta.filename}"`);
            ctx.set('Content-Type', meta.contentType);
            ctx.body = await attachmentsBucket.openDownloadStream(_id);
        } else {
            ctx.status = 404;
        }
    });

    return {
        smtpServer,
        router,
        installSubscriptionHandlers(httpServer) {
            apolloServer.installSubscriptionHandlers(httpServer);
        },
    };
}
