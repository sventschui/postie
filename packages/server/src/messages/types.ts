import type { ObjectId } from 'mongodb';
import type { EmailAddress, Headers } from 'mailparser';

export type Attachment = {
  attachmentId: ObjectId;
  filename: string;
  contentType?: string;
  size: number;
};

export type Message = {
  from: { value: EmailAddress[]; text: string } | undefined;
  to: ({ value: EmailAddress[]; text: string } | undefined)[];
  cc: ({ value: EmailAddress[]; text: string } | undefined)[];
  subject?: string;
  headers: Headers;
  text?: string;
  lang: string;
  attachments: ReadonlyArray<Attachment>;
};

export type SortDirection = 'ASC' | 'DESC';
