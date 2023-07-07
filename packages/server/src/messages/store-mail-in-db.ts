import { simpleParser } from 'mailparser';
import { convert } from 'html-to-text';

import type { Stream } from 'stream';
import { Readable } from 'stream';
import type { Collection, GridFSBucket, GridFSFile } from 'mongodb';
import { onMessagesAdded } from '../graphql';
import type { Attachment, Message } from './types';

export default async function storeMailInDb({
  stream, // stream for the mails content
  messages, // Collection for the messages
  attachmentsBucket, // GridFS Bucket to store attachment
}: {
  stream: Buffer | Stream | string;
  messages: Collection<Message>;
  attachmentsBucket: GridFSBucket;
}) {
  const parsed = await simpleParser(stream, {
    skipHtmlToText: true,
    skipTextToHtml: true,
  });

  let { text } = parsed;
  const { html, headers, subject, to, cc, from, attachments } = parsed;

  if (html) {
    text = convert(html, {
      wordwrap: Number.MAX_SAFE_INTEGER,
    });
  }

  const attachmentsWithId: ReadonlyArray<Attachment> = await Promise.all<Attachment>([
    ...attachments.map(async ({ filename, contentType, content, size }, index) => {
      return new Promise<Attachment>((res, rej) => {
        Readable.from(content)
          .pipe(
            attachmentsBucket.openUploadStream(filename || `attachment-${index}`, {
              contentType,
            }),
          )
          .on('error', (err: Error) => {
            rej(err);
          })
          .on(
            'finish',
            ({
              _id: attachmentId,
              filename: newFileName,
              contentType: newContentType,
            }: GridFSFile) => {
              const attachment = {
                attachmentId,
                filename: newFileName,
                contentType: newContentType,
                size,
              };
              res(attachment);
            },
          );
      });
    }),
  ]);

  const toArray = [to].flat();
  const ccArray = [cc].flat().filter((x) => !!x);

  const { franc } = await import('franc-min');

  const lang = franc(text, { only: ['deu', 'fra', 'ita', 'eng'] })?.slice(0, 2);

  const message = {
    from: from && { value: from.value, text: from.text },
    to: toArray.map((item) => item && { value: item.value, text: item.text }),
    cc: ccArray.map((item) => item && { value: item.value, text: item.text }),
    subject,
    headers,
    text,
    html,
    lang,
    attachments: attachmentsWithId,
  };

  await messages.insertOne(message);

  await onMessagesAdded([message]);
}
