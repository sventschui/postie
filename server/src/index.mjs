import smtpServerModule from 'smtp-server';
import mongodbModule from 'mongodb';
import createGraphqlServer from './graphql/index.mjs';
import storeMailInDb from './store-mail-in-db.mjs';

const { SMTPServer: SmtpServer } = smtpServerModule;
const { MongoClient, GridFSBucket } = mongodbModule;

(async () => {
    const mongo = await MongoClient.connect('mongodb://127.0.0.1:27017', { useUnifiedTopology: true });

    const db = mongo.db('mail');

    const messages = db.collection('messages');
    const attachmentsBucket = new GridFSBucket(db, { bucketName: 'attachments', chunkSizeBytes: 1024 * 1024 })

    new SmtpServer({
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
    })
        .listen(1030);



    createGraphqlServer({ messages, attachmentsBucket }).listen(8025).then(({ url }) => {
        console.log(`🚀 Server ready at ${url}`);
    });
})();

