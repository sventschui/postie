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

if (process.env.NODE_ENV === "development") {
  require("preact/debug");
}

import Header from "./components/header";

// Code-splitting is automated for routes
import Home from "./routes/home";

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
  "ws://localhost:8025/graphql",
  {
    reconnect: true,
    connectionParams: {}
  }
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
      }
    }
  },
  keys: {
    SenderRecipient: () => null,
    MessageAttachment: () => null
  }
});

const client = createClient({
  url: "http://localhost:8025/graphql",
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

  return (
    <Provider value={client}>
      <div className="wrapper">
        <Header
          onSetDarkMode={setDarkMode}
          onSearch={setSearch}
          search={search}
        />
        <Router>
          <Home path="/" search={search} />
          <Home path="/:messageId" search={search} />
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
