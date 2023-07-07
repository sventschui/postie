/* eslint-disable */
import * as types from './graphql';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 */
const documents = {
    "\n  query Message($id: ID!) {\n    message(id: $id) {\n      id\n      subject\n      from {\n        text\n      }\n      to {\n        text\n      }\n      cc {\n        text\n      }\n      html\n      text\n      lang\n      dateSent\n      dateReceived\n      attachments {\n        attachmentId\n        filename\n        contentType\n        size\n      }\n    }\n  }\n": types.MessageDocument,
    "\n  query Messages($after: String, $to: String, $subject: String, $text: String, $lang: String) {\n    messages(\n      first: 20\n      after: $after\n      to: $to\n      subject: $subject\n      text: $text\n      lang: $lang\n      order: { field: DATE, direction: DESC }\n    ) {\n      totalCount\n      pageInfo {\n        endCursor\n        startCursor\n        hasNextPage\n      }\n      edges {\n        node {\n          id\n          subject\n          from {\n            text\n          }\n          to {\n            text\n          }\n          lang\n          dateSent\n          dateReceived\n        }\n      }\n    }\n  }\n": types.MessagesDocument,
    "\n  subscription MessagesAdded {\n    messagesAdded {\n      id\n      subject\n      from {\n        text\n      }\n      to {\n        text\n      }\n      dateSent\n      dateReceived\n    }\n  }\n": types.MessagesAddedDocument,
    "\n  subscription MessagesDeleted {\n    messagesDeleted {\n      ids\n    }\n  }\n": types.MessagesDeletedDocument,
    "\n  mutation DeleteAllMessages($input: DeleteMessagesInput!) {\n    deleteMessages(input: $input) {\n      ids\n    }\n  }\n": types.DeleteAllMessagesDocument,
    "\n  mutation DeleteMessage($input: DeleteMessageInput!) {\n    deleteMessage(input: $input) {\n      id\n    }\n  }\n": types.DeleteMessageDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Message($id: ID!) {\n    message(id: $id) {\n      id\n      subject\n      from {\n        text\n      }\n      to {\n        text\n      }\n      cc {\n        text\n      }\n      html\n      text\n      lang\n      dateSent\n      dateReceived\n      attachments {\n        attachmentId\n        filename\n        contentType\n        size\n      }\n    }\n  }\n"): (typeof documents)["\n  query Message($id: ID!) {\n    message(id: $id) {\n      id\n      subject\n      from {\n        text\n      }\n      to {\n        text\n      }\n      cc {\n        text\n      }\n      html\n      text\n      lang\n      dateSent\n      dateReceived\n      attachments {\n        attachmentId\n        filename\n        contentType\n        size\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Messages($after: String, $to: String, $subject: String, $text: String, $lang: String) {\n    messages(\n      first: 20\n      after: $after\n      to: $to\n      subject: $subject\n      text: $text\n      lang: $lang\n      order: { field: DATE, direction: DESC }\n    ) {\n      totalCount\n      pageInfo {\n        endCursor\n        startCursor\n        hasNextPage\n      }\n      edges {\n        node {\n          id\n          subject\n          from {\n            text\n          }\n          to {\n            text\n          }\n          lang\n          dateSent\n          dateReceived\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query Messages($after: String, $to: String, $subject: String, $text: String, $lang: String) {\n    messages(\n      first: 20\n      after: $after\n      to: $to\n      subject: $subject\n      text: $text\n      lang: $lang\n      order: { field: DATE, direction: DESC }\n    ) {\n      totalCount\n      pageInfo {\n        endCursor\n        startCursor\n        hasNextPage\n      }\n      edges {\n        node {\n          id\n          subject\n          from {\n            text\n          }\n          to {\n            text\n          }\n          lang\n          dateSent\n          dateReceived\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  subscription MessagesAdded {\n    messagesAdded {\n      id\n      subject\n      from {\n        text\n      }\n      to {\n        text\n      }\n      dateSent\n      dateReceived\n    }\n  }\n"): (typeof documents)["\n  subscription MessagesAdded {\n    messagesAdded {\n      id\n      subject\n      from {\n        text\n      }\n      to {\n        text\n      }\n      dateSent\n      dateReceived\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  subscription MessagesDeleted {\n    messagesDeleted {\n      ids\n    }\n  }\n"): (typeof documents)["\n  subscription MessagesDeleted {\n    messagesDeleted {\n      ids\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteAllMessages($input: DeleteMessagesInput!) {\n    deleteMessages(input: $input) {\n      ids\n    }\n  }\n"): (typeof documents)["\n  mutation DeleteAllMessages($input: DeleteMessagesInput!) {\n    deleteMessages(input: $input) {\n      ids\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteMessage($input: DeleteMessageInput!) {\n    deleteMessage(input: $input) {\n      id\n    }\n  }\n"): (typeof documents)["\n  mutation DeleteMessage($input: DeleteMessageInput!) {\n    deleteMessage(input: $input) {\n      id\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;