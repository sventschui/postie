import apolloServerModule from 'apollo-server';
import { applyPagination, querySortById, querySortBy, parseCursor, formatCursor } from './utils.mjs';

const { ApolloServer, gql } = apolloServerModule;

// The GraphQL schema
const typeDefs = gql`
  type Query {
      messages(first: Int, after: String, last: Int, before: String, order: MessageOrder): MessageConnection!
      message(id: ID!): Message
  }

  enum OrderDirection {
      ASC
      DESC
  }

  enum MessageOrderField {
      ID
      FROM
      SUBJECT
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
};

// A map of functions which return data for the schema.
const resolvers = {
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
    async messages(parent, { first, after, last, before, order }, { messages }) {
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

        if (!order || order.field === 'ID') {
            query = querySortById(messages, before, after, order ? order.direction : 'ASC');
        } else {
            query = querySortBy(messages, fields[order.field], before, after, order.direction)
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
        context: { messages, attachmentsBucket },
    });
    return server;
}
