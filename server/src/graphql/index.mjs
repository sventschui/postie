import apolloServerModule from "apollo-server-koa";
import {
  applyPagination,
  querySortById,
  querySortBy,
  parseCursor,
  formatCursor
} from "./utils.mjs";
import m from "mongodb";
import escapeRegex from "escape-string-regexp";

const { ObjectId } = m;
const { ApolloServer, gql, PubSub } = apolloServerModule;

const pubsub = new PubSub();

const MESSAGES_ADDED = "MESSAGES_ADDED";
const MESSAGES_DELETED = "MESSAGES_DELETED";

export function onMessagesAdded(messages) {
  return pubsub.publish(MESSAGES_ADDED, { messagesAdded: messages });
}

export function onMessagesDeleted(ids) {
  return pubsub.publish(MESSAGES_DELETED, { messagesDeleted: { ids } });
}

function buildFilter({ to, subject, text }) {
  const regexOpts = ""; // adding 'i' here will make the search super slow...
  const filter = {};

  if (to) {
    filter["to.text"] = { $regex: new RegExp(escapeRegex(to), regexOpts) };
  }

  if (subject) {
    filter["subject"] = { $regex: new RegExp(escapeRegex(subject), regexOpts) };
  }

  if (text) {
    filter["text"] = { $regex: new RegExp(escapeRegex(text), regexOpts) };
  }

  return filter;
}

// The GraphQL schema
const typeDefs = gql`
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
    to: [SenderRecipient]!
    cc: [SenderRecipient]
    text: String!
    html: String
    subject: String
    dateReceived: String!
    dateSent: String
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
  FROM: "from",
  SUBJECT: "subject",
  DATE: "headers.date"
};

async function deleteMessage(
  messages,
  attachmentsBucket,
  { _id, attachments }
) {
  await Promise.all([
    messages.deleteOne({ _id }),
    ...(attachments
      ? attachments.map(({ attachmentId }) =>
          attachmentsBucket.delete(attachmentId)
        )
      : [])
  ]);
}

// A map of functions which return data for the schema.
const resolvers = {
  Subscription: {
    messagesAdded: {
      subscribe: () => pubsub.asyncIterator(MESSAGES_ADDED)
    },
    messagesDeleted: {
      subscribe: () => pubsub.asyncIterator(MESSAGES_DELETED)
    }
  },
  Mutation: {
    async deleteMessages(parent, { input }, { messages, attachmentsBucket }) {
      // ObjectId to limit the deletion for messages that where stored before just now
      const currentObjectId = new ObjectId();

      // we do a find and delete single items loop here to notify subscription listeneres
      // and return the list of dropped dis
      let allIds = [];
      let idsOfIteration = [];
      const cursor = messages
        .find({
          //  _id: { $lt: currentObjectId },
          ...buildFilter(input)
        })
        .project({ _id: 1, "attachments.attachmentId": 1 });

      let i = 0;
      while (await cursor.hasNext()) {
        const item = await cursor.next();

        deleteMessage(messages, attachmentsBucket, item);
        idsOfIteration.push(formatCursor("message", item._id));

        if (i > 10 || !(await cursor.hasNext())) {
          onMessagesDeleted(idsOfIteration);
          allIds = allIds.concat(idsOfIteration);
          idsOfIteration = [];
          i = 0;
        }

        i++;
      }

      return { ids: allIds };
    },
    async deleteMessage(parent, { input }, { messages, attachmentsBucket }) {
      const { objectId } = parseCursor(input.id);
      const item = await messages.findOne(
        { _id: objectId },
        { projection: { _id: 1, "attachments.attachmentId": 1 } }
      );

      if (item) {
        deleteMessage(messages, attachmentsBucket, item);
        onMessagesDeleted([input.id]);
      }

      return item ? { id: input.id } : {};
    }
  },
  Message: {
    id(parent) {
      return formatCursor("message", parent._id);
    },
    dateReceived(parent) {
      return parent._id.getTimestamp().toISOString();
    },
    dateSent(parent) {
      return (
        parent.headers &&
        parent.headers.date &&
        parent.headers.date.toISOString()
      );
    }
  },
  Query: {
    async message(parent, { id }, { messages }) {
      const { objectId } = parseCursor(id);
      return messages.findOne({ _id: objectId });
    },
    async messages(
      parent,
      { first, after, last, before, order, to, subject, text },
      { messages }
    ) {
      if (after != null && before != null) {
        throw new Error(
          "after and before must not be supplied at the same time!"
        );
      }

      if (first == null && last == null) {
        throw new Error("first or last must be supplied!");
      }

      if (first != null && last != null) {
        throw new Error(
          "first and last must not be supplied at the same time!"
        );
      }

      if (before != null && first != null) {
        throw new Error("Can not combine before and first!");
      }

      if (after != null && last != null) {
        throw new Error("Can not combine after and last!");
      }

      if (first <= 0) {
        throw new Error("first must be > 0!");
      }

      if (last <= 0) {
        throw new Error("last must be > 0!");
      }

      let query;
      const filter = buildFilter({ to, subject, text });

      if (!order || order.field === "ID") {
        query = querySortById(
          messages,
          filter,
          before,
          after,
          order ? order.direction : "ASC"
        );
      } else {
        query = await querySortBy(
          messages,
          filter,
          fields[order.field],
          before,
          after,
          order.direction
        );
      }

      const totalCount = await messages.count(filter);
      const { getItems, pageInfo } = await applyPagination(
        totalCount,
        query,
        first,
        last
      );

      return {
        totalCount,
        pageInfo,
        async edges() {
          const edges = await getItems();

          return edges.map(node => ({
            node,
            cursor: formatCursor("message", node._id)
          }));
        }
      };
    }
  }
};

export default function createServer({ messages, attachmentsBucket, apolloServerOptions }) {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    cors: true,
    subscriptions: true,
    context: { messages, attachmentsBucket },
    ...apolloServerOptions,
  });

  return server;
}
