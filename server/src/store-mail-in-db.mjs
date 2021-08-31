import mailParserModule from 'mailparser';
import htmlToText from 'html-to-text';

import { onMessagesAdded } from './graphql/index.mjs';

const { simpleParser } = mailParserModule;

export default async function storeMailInDb({
    stream, // stream for the mails content
    messages, // Collection for the messages
    attachmentsBucket, // GridFS Bucket to store attachment
}) {
    // TODO: simpleParser buffers attachments in memory. Might be worth to replace with the event based MailParser
    const parsed = await simpleParser(stream, {
        skipHtmlToText: true,
        skipTextToHtml: true,
    });

    let { text } = parsed;
    const { html, headers, subject, to, cc, from, attachments } = parsed;

    if (html) {
        text = htmlToText.fromString(html, {
            wordwrap: Number.MAX_SAFE_INTEGER,
            uppercaseHeadings: false,
            singleNewLineParagraphs: true,
        });
    }

    const attachmentsWithId = await Promise.all([
        ...attachments.map(async ({
            filename,
            contentType,
            content,
            size,
        }, index) => {
            const uploadStream = attachmentsBucket.openUploadStream(filename || `attachment-${index}`, { contentType });
            await new Promise((res, rej) => {
                uploadStream.end(content, (err) => {
                    if (err) {
                        rej(err);
                    } else {
                        res();
                    }
                });
            });
            return { attachmentId: uploadStream.id, filename, contentType, size };
        }),
    ]);

    const toArray = [to].flat();
    const ccArray = [cc].flat().filter(x => !!x);

    const message = {
        from: from && { value: from.value, text: from.text },
        to: toArray.map(item => item && ({ value: item.value, text: item.text })),
        cc: ccArray.map(item => item && ({ value: item.value, text: item.text })),
        subject,
        headers,
        text,
        html,
        attachments: attachmentsWithId,
    };

    await messages.insertOne(message);

    await onMessagesAdded([message]);
}