import apolloServerModule from 'apollo-server';
import { applyPagination, querySortById, querySortBy, parseCursor, formatCursor } from './utils.mjs';
import m from 'mongodb';

const { ObjectID } = m;

const { ApolloServer, gql, PubSub } = apolloServerModule;

const pubsub = new PubSub();

const MESSAGES_ADDED = 'MESSAGES_ADDED';
const MESSAGES_DELETED = 'MESSAGES_DELETED';

export function onMessagesAdded(messages) {
    return pubsub.publish(MESSAGES_ADDED, { messagesAdded: messages });
}

export function onMessagesDeleted(ids) {
    return pubsub.publish(MESSAGES_DELETED, { messagesDeleted: ids });
}

// The GraphQL schema
const typeDefs = gql`
  type Query {
      messages(first: Int, after: String, last: Int, before: String, order: MessageOrder, to: String, subject: String, text: String): MessageConnection!
      message(id: ID!): Message
  }

  type Subscription {
      # TODO: The UI needs to update all cached queries, not only the active one
      # or it needs to drop cache on search term change
      # TODO: How to handle order on the UI? I.e. where to insert these messages
      # When sorting by ID we need to parse it (base64'message:{id}')
      messagesAdded: [Message!]!
      messagesDeleted: [ID!]!
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
    FROM: 'from',
    SUBJECT: 'subject',
    DATE: 'headers.date',
};

// A map of functions which return data for the schema.
const resolvers = {
    Subscription: {
        messagesAdded: {
            subscribe: () => pubsub.asyncIterator(MESSAGES_ADDED),
        },
        messagesDeleted: {
            subscribe: () => pubsub.asyncIterator(MESSAGES_DELETED),
        },
    },
  Message: {
    id(parent) {
        return formatCursor('message', parent._id);
    },
    dateReceived(parent) {
        return parent._id.getTimestamp().toISOString();
    },
    dateSent(parent) {
        return parent.headers && parent.headers.date && parent.headers.date.toISOString();
    },
  },
  Query: {
    async message(parent, { id }, { messages }) {
        const { objectId } = parseCursor(id);
        return messages.findOne({ _id: objectId });
    },
    async messages(parent, { first, after, last, before, order, to, subject, text }, { messages }) {
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
        let filter = {};
        const regexOpts = ''; // adding 'i' here will make the search super slow...

        if (to) {
            filter['to.text'] = { $regex: new RegExp(to, regexOpts) }; // TODO: escape regex
        }

        if (subject) {
            filter['subject'] = { $regex: new RegExp(subject, regexOpts) }; // TODO: escape regex
        }

        if (text) {
            filter['text'] = { $regex: new RegExp(text, regexOpts) }; // TODO: escape regex
        }

        if (!order || order.field === 'ID') {
            query = querySortById(messages, filter, before, after, order ? order.direction : 'ASC');
        } else {
            query = await querySortBy(messages, filter, fields[order.field], before, after, order.direction)
        }

        const totalCount = await messages.count({});
        const { getItems, pageInfo } = await applyPagination(totalCount, query, first, last)

        return {
            totalCount,
            pageInfo,
            async edges() {
                const edges = await getItems();
      
                return edges.map(node => ({ node, cursor: formatCursor('message', node._id) }));
            },
        };
    }
  },
};

export default function createServer({ messages, attachmentsBucket }) {
    const server = new ApolloServer({
        typeDefs,
        resolvers,
        cors: true,
        subscriptions: true,
        context: { messages, attachmentsBucket },
    });
    return server;
}
