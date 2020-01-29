import { h, Component } from "preact";
import { useState } from "preact/hooks";
import { Router } from "preact-router";
import {
  createClient,
  dedupExchange,
  fetchExchange,
  subscriptionExchange,
  Provider
} from "@urql/preact";
import { cacheExchange } from "@urql/exchange-graphcache";
import { relayPagination } from "@urql/exchange-graphcache/extras";
import { SubscriptionClient } from "subscriptions-transport-ws";

import Header from "./components/header";

// Code-splitting is automated for routes
import Home from "./routes/home";

if (process.env.NODE_ENV === "development") {
  require("preact/debug");
}

let ws;

if (typeof window === "undefined") {
  ws = require("ws");
}

export const MESSAGES_QUERY = `query Q($after: String, $to: String, $subject: String, $text: String) {
	messages(
		first: 20,
		after: $after,
		to: $to,
		subject: $subject,
		text: $text,
		order: { field: DATE, direction: DESC }
	) {
		__typename
		pageInfo {
			__typename
			endCursor
			hasNextPage
		}
		edges {
			__typename
			node {
				__typename
				id
				subject
				from {
					__typename
					text
				}
				to {
					__typename
					text
				}
				dateSent
			}
		}
	}
}`;

const subscriptionClient = new SubscriptionClient(
  `${document.baseURI.replace(/\/$/, '').replace(/http(s?):\/\//, 'ws$1://')}/graphql`,
  {
    reconnect: true,
    connectionParams: {}
  },
  ws
);

const cache = cacheExchange({
  resolvers: {
    Query: {
      messages: relayPagination()
    }
  },
  updates: {
    Subscription: {
      messagesAdded: ({ messagesAdded }, _args, cache) => {
        cache.updateQuery({ query: MESSAGES_QUERY, variables: {} }, data => {
          if (data != null) {
            messagesAdded
              .slice()
              .reverse()
              .forEach(message => {
                data.messages.edges.unshift({
                  __typename: "MessageEdge",
                  id: String(new Date().getTime()),
                  node: message
                });
              });
            if (typeof data.messages.totalCount === "number") {
              data.messages.totalCount += messagesAdded.length;
            }
            data.messages.pageInfo.startCursor = messagesAdded[0].id;
            return data;
          }

          return null;
        });
      },
      messagesDeleted: ({ messagesDeleted }, _args, cache) => {
        cache.updateQuery({ query: MESSAGES_QUERY, variables: {} }, data => {
          if (data != null) {
            data.messages.edges = data.messages.edges.filter(({ node }) => {
              return messagesDeleted.ids.indexOf(node.id) === -1;
            });

            if (typeof data.messages.totalCount === "number") {
              data.messages.totalCount -= messagesDeleted.ids.length;
            }

            return data;
          }

          return null;
        });
      },
    },
    Mutation: {
      deleteMessages: ({ deleteMessages }, { input }, cache) => {
        cache.updateQuery({ query: MESSAGES_QUERY, variables: input }, data => {
          if (data != null) {

            data.messages.edges = data.messages.edges.filter(({ node }) => {
              return deleteMessages.ids.indexOf(node.id) === -1;
            });

            if (typeof data.messages.totalCount === "number") {
              data.messages.totalCount -= deleteMessages.ids.length;
            }

            if (data.messages.pageInfo) {
              data.messages.pageInfo.hasNextPage = false;
            }

            return data;
          }

          return null;
        });

        deleteMessages.ids.forEach((id) => {
          cache.updateQuery({ query: `query Q($id: ID!) { message(id: $id) { id } }`, variables: { id } }, data => {
            if (data) {
              data.message = null;
            }
  
            return data;
          });
        });
      },
      deleteMessage: ({ deleteMessages }, { input, search }, cache) => {
        cache.updateQuery({ query: MESSAGES_QUERY, variables: search }, data => {
          if (data != null) {
            data.messages.edges = data.messages.edges.filter(({ node }) => {
              return node.id !== input.id;
            });

            if (typeof data.messages.totalCount === "number") {
              data.messages.totalCount -= 1;
            }

            return data;
          }

          return null;
        });

        cache.updateQuery({ query: `query Q($id: ID!) { message(id: $id) { id } }`, variables: { id: input.id } }, data => {
          if (data) {
            data.message = null;
          }

          return data;
        });
      },
    },
  },
  keys: {
    SenderRecipient: () => null,
    MessageAttachment: () => null
  }
});

const client = createClient({
  url: `${document.baseURI.replace(/\/$/, '')}/graphql`,
  requestPolicy: 'network-only',
  exchanges: [
    dedupExchange,
    cache,
    fetchExchange,
    subscriptionExchange({
      forwardSubscription: operation => subscriptionClient.request(operation)
    })
  ]
});

export default function App() {
  const [search, setSearch] = useState({});

  function setDarkMode(enabled) {
    if (enabled) {
      document.body.classList.add("dark-mode");
      document.body.classList.remove("light-mode");
    } else {
      document.body.classList.remove("dark-mode");
      document.body.classList.add("light-mode");
    }
  }

  const base = document.baseURI.replace(document.location.origin, '');

  return (
    <Provider value={client}>
      <div className="wrapper">
        <Header
          onSetDarkMode={setDarkMode}
          onSearch={setSearch}
          search={search}
        />
        <Router>
          <Home path={`${base}`} search={search} />
          <Home path={`${base}:messageId`} search={search} />
        </Router>
      </div>
      <style jsx global>{`
        html,
        body {
          height: 100%;
          width: 100%;
          padding: 0;
          margin: 0;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        .wrapper {
          display: flex;
          flex-direction: column;
          height: 100vh;
        }

        * {
          box-sizing: border-box;
        }
      `}</style>
    </Provider>
  );
}
