import gql from "graphql-tag";

export const MESSAGE_QUERY = gql`
  query MessageQuery($id: ID!) {
    message(id: $id) {
      id
      subject
      from {
        text
      }
      to {
        text
      }
      html
      text
      dateSent
      attachments {
        attachmentId
        filename
        contentType
        size
      }
    }
  }
`;

export const MESSAGES_QUERY = gql`
  query MessagesQuery(
    $after: String
    $to: String
    $subject: String
    $text: String
  ) {
    messages(
      first: 20
      after: $after
      to: $to
      subject: $subject
      text: $text
      order: { field: DATE, direction: DESC }
    ) {
      totalCount
      pageInfo {
        endCursor
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
          dateSent
        }
      }
    }
  }
`;
