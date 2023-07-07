import { graphql } from './generated';

export const MESSAGE_QUERY = graphql(`
  query Message($id: ID!) {
    message(id: $id) {
      id
      subject
      from {
        text
      }
      to {
        text
      }
      cc {
        text
      }
      html
      text
      lang
      dateSent
      dateReceived
      attachments {
        attachmentId
        filename
        contentType
        size
      }
    }
  }
`);

export const MESSAGES_QUERY = graphql(`
  query Messages($after: String, $to: String, $subject: String, $text: String, $lang: String) {
    messages(
      first: 20
      after: $after
      to: $to
      subject: $subject
      text: $text
      lang: $lang
      order: { field: DATE, direction: DESC }
    ) {
      totalCount
      pageInfo {
        endCursor
        startCursor
        hasNextPage
      }
      edges {
        node {
          id
          subject
          from {
            text
          }
          to {
            text
          }
          lang
          dateSent
          dateReceived
        }
      }
    }
  }
`);

export const MESSAGES_ADDED_SUBSCRIPTION = graphql(`
  subscription MessagesAdded {
    messagesAdded {
      id
      subject
      from {
        text
      }
      to {
        text
      }
      dateSent
      dateReceived
    }
  }
`);

export const MESSAGES_DELETED_SUBSCRIPTION = graphql(`
  subscription MessagesDeleted {
    messagesDeleted {
      ids
    }
  }
`);

export const DELETE_ALL_MESSAGES_MUTATION = graphql(`
  mutation DeleteAllMessages($input: DeleteMessagesInput!) {
    deleteMessages(input: $input) {
      ids
    }
  }
`);

export const DELETE_MESSAGE = graphql(`
  mutation DeleteMessage($input: DeleteMessageInput!) {
    deleteMessage(input: $input) {
      id
    }
  }
`);
