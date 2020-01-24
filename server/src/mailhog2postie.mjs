import mailParserModule from 'mailparser';
import htmlToText from 'html-to-text';
import mongodbModule from 'mongodb';
import storeMailInDb from './store-mail-in-db.mjs';

const { MongoClient, GridFSBucket } = mongodbModule;

const { simpleParser } = mailParserModule;

(async () => {
    const mongo = await MongoClient.connect('mongodb://127.0.0.1:27017', { useUnifiedTopology: true });

    const mailhogDb = mongo.db('mailhog');

    const cursor = mailhogDb.collection('messages').find({});

    const db = mongo.db('mail');
    const messages = db.collection('messages');
    const attachmentsBucket = new GridFSBucket(db, { bucketName: 'attachments', chunkSizeBytes: 1024 * 1024 })

    while (await cursor.hasNext()) {
        const { raw: { data: rawData } } = await cursor.next();

        await storeMailInDb({ stream: rawData, messages, attachmentsBucket });
    }

})();
