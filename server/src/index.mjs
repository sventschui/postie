import smtpServerModule from 'smtp-server';
import mongodbModule from 'mongodb';
import createGraphqlServer from './graphql/index.mjs';
import storeMailInDb from './store-mail-in-db.mjs';

const { SMTPServer: SmtpServer } = smtpServerModule;
const { GridFSBucket } = mongodbModule;

export function createServers({ mongo, ApolloServer }) {
    const db = mongo.db('mail');

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

    const graphqlServer = createGraphqlServer({ ApolloServer, messages, attachmentsBucket });

    return { smtpServer, graphqlServer };
}
