import { PubSub } from 'graphql-subscriptions';
import type { Collection, GridFSBucket, WithId, ObjectId } from 'mongodb';
import gql from 'graphql-tag';
import type { DocumentNode } from 'graphql/language';
import { applyPagination, formatCursor, parseCursor, querySortBy, querySortById } from './utils';
import type { Attachment, Message, SortDirection } from '../messages/types';
import { logWithTimestamp } from '../util';

const escapeRegex = (value: string) =>
  import('escape-string-regexp').then(({ default: escapeRegexDefault }) =>
    escapeRegexDefault(value),
  );

const pubsub = new PubSub();

const MESSAGES_ADDED = 'MESSAGES_ADDED';
const MESSAGES_DELETED = 'MESSAGES_DELETED';

export function onMessagesAdded(messages: ReadonlyArray<Message>) {
  return pubsub.publish(MESSAGES_ADDED, { messagesAdded: messages });
}

export function onMessagesDeleted(ids: ReadonlyArray<string>) {
  return pubsub.publish(MESSAGES_DELETED, { messagesDeleted: { ids } });
}

async function buildFilter({
  to,
  subject,
  text,
  lang,
}: {
  to: string;
  subject: string;
  text: string;
  lang: string;
}) {
  const regexOpts = ''; // adding 'i' here will make the search super slow...
  const filter: Partial<{
    'to.text': { $regex: RegExp };
    subject: { $regex: RegExp };
    text: { $regex: RegExp };
    lang: string;
  }> = {};

  if (to) {
    filter['to.text'] = { $regex: new RegExp(await escapeRegex(to), regexOpts) };
  }

  if (subject) {
    filter.subject = { $regex: new RegExp(await escapeRegex(subject), regexOpts) };
  }

  if (text) {
    filter.text = { $regex: new RegExp(await escapeRegex(text), regexOpts) };
  }

  if (lang && lang !== 'all') {
    filter.lang = lang;
  }

  return filter;
}

// The GraphQL schema
export const typeDefs: DocumentNode = gql`
  type Query {
    messages(
      first: Int
      after: String
      last: Int
      before: String
      order: MessageOrder
      to: String
      subject: String
      text: String
      lang: String
    ): MessageConnection!
    message(id: ID!): Message
  }

  type Mutation {
    deleteMessages(input: DeleteMessagesInput!): DeleteMessagesPayload!
    deleteMessage(input: DeleteMessageInput!): DeleteMessagePayload!
  }

  input DeleteMessagesInput {
    to: String
    subject: String
    text: String
  }

  type DeleteMessagesPayload {
    ids: [ID!]!
  }

  input DeleteMessageInput {
    id: ID!
  }

  type DeleteMessagePayload {
    id: ID
  }

  type Subscription {
    # TODO: The UI needs to update all cached queries, not only the active one
    # or it needs to drop cache on search term change
    # TODO: How to handle order on the UI? I.e. where to insert these messages
    # When sorting by ID we need to parse it (base64'message:{id}')
    messagesAdded: [Message!]!
    messagesDeleted: MessagesDeletedPayload!
  }

  type MessagesDeletedPayload {
    ids: [ID!]!
  }

  enum OrderDirection {
    ASC
    DESC
  }

  enum MessageOrderField {
    ID
    FROM
    SUBJECT
    DATE
  }

  input MessageOrder {
    direction: OrderDirection!
    field: MessageOrderField!
  }

  type MessageConnection {
    edges: [MessageEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type MessageEdge {
    cursor: String!
    node: Message!
  }

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  type Message {
    id: ID!
    from: SenderRecipient
    to: [SenderRecipient!]!
    cc: [SenderRecipient!]!
    text: String!
    html: String
    subject: String
    dateReceived: String!
    dateSent: String
    lang: String
    attachments: [MessageAttachment!]!
  }

  type MessageAttachment {
    attachmentId: String!
    filename: String
    contentType: String!
    size: Int!
  }

  type SenderRecipient {
    value: [SenderRecipientValue]!
    text: String!
  }

  type SenderRecipientValue {
    address: String
    name: String
  }
`;

const fields = {
  FROM: 'from',
  SUBJECT: 'subject',
  DATE: 'headers.date',
};

async function deleteMessage(
  messages: Collection<Message>,
  attachmentsBucket: GridFSBucket,
  { _id, attachments }: { _id: ObjectId; attachments: ReadonlyArray<Attachment> },
) {
  await Promise.all([
    messages.deleteOne({ _id }),
    ...(attachments
      ? attachments.map(({ attachmentId }) => attachmentsBucket.delete(attachmentId))
      : []),
  ]);
}

// A map of functions which return data for the schema.
export const resolvers = {
  Subscription: {
    messagesAdded: {
      subscribe: () => pubsub.asyncIterator(MESSAGES_ADDED),
    },
    messagesDeleted: {
      subscribe: () => pubsub.asyncIterator(MESSAGES_DELETED),
    },
  },
  Mutation: {
    async deleteMessages(
      _: unknown,
      input: {
        first: number;
        after: string;
        last: number;
        before: string;
        order: { direction: SortDirection; field: 'FROM' | 'SUBJECT' | 'DATE' | 'ID' };
        to: string;
        subject: string;
        text: string;
        lang: string;
      },
      {
        messages,
        attachmentsBucket,
      }: { messages: Collection<Message>; attachmentsBucket: GridFSBucket },
    ) {
      // we do a find and delete single items loop here to notify subscription listeneres
      // and return the list of dropped dis
      let allIds: Array<string> = [];
      let idsOfIteration: Array<string> = [];
      const cursor = messages
        .find({
          ...(await buildFilter(input)),
        })
        .project({ _id: 1, 'attachments.attachmentId': 1 });

      let i = 0;
      // eslint-disable-next-line no-await-in-loop
      while (await cursor.hasNext()) {
        // eslint-disable-next-line no-await-in-loop
        const item = (await cursor.next()) as WithId<Message>;

        // eslint-disable-next-line no-await-in-loop
        await deleteMessage(messages, attachmentsBucket, item);
        idsOfIteration.push(formatCursor('message', item._id));

        // eslint-disable-next-line no-await-in-loop
        if (i > 10 || !(await cursor.hasNext())) {
          // eslint-disable-next-line no-await-in-loop
          await onMessagesDeleted(idsOfIteration);
          allIds = allIds.concat(idsOfIteration);
          idsOfIteration = [];
          i = 0;
        }

        i += 1;
      }

      return { ids: allIds };
    },
    async deleteMessage(
      _: unknown,
      { input }: { input: { id: string } },
      {
        messages,
        attachmentsBucket,
      }: { messages: Collection<Message>; attachmentsBucket: GridFSBucket },
    ) {
      const { id } = parseCursor(input.id);
      const item = await messages.findOne(
        { _id: id },
        { projection: { _id: 1, 'attachments.attachmentId': 1 } },
      );

      if (item) {
        await deleteMessage(messages, attachmentsBucket, item);
        await onMessagesDeleted([input.id]);
      }

      return item ? { id } : {};
    },
  },
  Message: {
    id(parent: WithId<Message>) {
      return formatCursor('message', parent._id);
    },
    dateReceived(parent: WithId<Message>) {
      return parent._id.getTimestamp().toISOString();
    },
    dateSent(parent: WithId<Message>) {
      // @ts-ignore
      return parent.headers && parent.headers.date && parent.headers.date.toISOString();
    },
  },
  Query: {
    async message(
      _: unknown,
      input: { id: string },
      { messages }: { messages: Collection<Message> },
    ) {
      const { id } = parseCursor(input.id);
      return messages.findOne({ _id: id });
    },
    async messages(
      _: unknown,
      {
        first,
        after,
        last,
        before,
        order,
        to,
        subject,
        text,
        lang,
      }: {
        first: number;
        after: string;
        last: number;
        before: string;
        order: { direction: SortDirection; field: 'FROM' | 'SUBJECT' | 'DATE' | 'ID' };
        to: string;
        subject: string;
        text: string;
        lang: string;
      },
      { messages }: { messages: Collection<Message> },
    ) {
      logWithTimestamp(`Start loading messages`);
      if (after != null && before != null) {
        throw new Error('after and before must not be supplied at the same time!');
      }

      if (first == null && last == null) {
        throw new Error('first or last must be supplied!');
      }

      if (first != null && last != null) {
        throw new Error('first and last must not be supplied at the same time!');
      }

      if (before != null && first != null) {
        throw new Error('Can not combine before and first!');
      }

      if (after != null && last != null) {
        throw new Error('Can not combine after and last!');
      }

      if (first <= 0) {
        throw new Error('first must be > 0!');
      }

      if (last <= 0) {
        throw new Error('last must be > 0!');
      }

      let query;
      const filter = await buildFilter({
        to,
        subject,
        text,
        lang,
      });
      logWithTimestamp(`build filter: ${JSON.stringify(filter)}`);

      if (!order || order.field === 'ID') {
        query = querySortById(messages, filter, before, after, order ? order.direction : 'ASC');
      } else {
        query = await querySortBy(
          messages,
          filter,
          fields[order.field],
          before,
          after,
          order.direction,
        );
      }
      logWithTimestamp(`query executed with filter: ${JSON.stringify(filter)}`);

      const totalCount = await messages.countDocuments(filter);
      logWithTimestamp(`documents counted with totalCount: ${totalCount}`);
      const { getItems, pageInfo } = await applyPagination(totalCount, query, first, last);
      logWithTimestamp(`Finished loading messages`);
      return {
        totalCount,
        pageInfo,
        async edges() {
          const edges = await getItems();

          return edges.map((node) => ({
            node,
            cursor: formatCursor('message', node._id),
          }));
        },
      };
    },
  },
};
