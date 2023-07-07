import { h } from 'preact';
import { useState } from 'preact/hooks';
import { Route, Router } from 'preact-router';
import { createClient, fetchExchange, Provider, subscriptionExchange } from '@urql/preact';
import type { Cache } from '@urql/exchange-graphcache';
import { cacheExchange } from '@urql/exchange-graphcache';
import { relayPagination } from '@urql/exchange-graphcache/extras';
import { createClient as createWSClient } from 'graphql-ws';

import Header from './components/header';

// Code-splitting is automated for routes
import Home from './routes/home';
import { MESSAGE_QUERY, MESSAGES_QUERY } from './gql';
import type {
  DeleteAllMessagesMutation,
  DeleteAllMessagesMutationVariables,
  DeleteMessageMutation,
  DeleteMessageMutationVariables,
  MessagesAddedSubscription,
  MessagesDeletedSubscription,
} from './generated/graphql';

const wsClient = createWSClient({
  url: `${document.baseURI.replace(/\/$/, '').replace(/http(s?):\/\//, 'ws$1://')}/graphql`,
});

const graphCache = cacheExchange({
  resolvers: {
    Query: {
      messages: relayPagination(),
    },
  },
  updates: {
    Subscription: {
      messagesAdded: ({ messagesAdded }: MessagesAddedSubscription, _args, cache: Cache) => {
        cache.updateQuery({ query: MESSAGES_QUERY, variables: {} }, (data) => {
          if (data) {
            messagesAdded
              .slice()
              .reverse()
              .forEach((message) => {
                data.messages.edges.unshift({
                  __typename: 'MessageEdge',
                  node: message,
                });
              });
            if (typeof data.messages.totalCount === 'number') {
              data.messages.totalCount += messagesAdded.length;
            }
            data.messages.pageInfo.startCursor = messagesAdded[0].id;
            return data;
          }

          return null;
        });
      },
      messagesDeleted: ({ messagesDeleted }: MessagesDeletedSubscription, _args, cache) => {
        cache.updateQuery({ query: MESSAGES_QUERY, variables: {} }, (data) => {
          if (data) {
            data.messages.edges = data.messages.edges.filter(({ node }) => {
              return messagesDeleted.ids.indexOf(node.id) === -1;
            });

            if (typeof data.messages.totalCount === 'number') {
              data.messages.totalCount -= messagesDeleted.ids.length;
            }

            return data;
          }

          return null;
        });
      },
    },
    Mutation: {
      deleteMessages: (
        { deleteMessages }: DeleteAllMessagesMutation,
        { input }: DeleteAllMessagesMutationVariables,
        cache,
      ) => {
        cache.updateQuery({ query: MESSAGES_QUERY, variables: input }, (data) => {
          if (data) {
            data.messages.edges = data.messages.edges.filter(({ node }) => {
              return deleteMessages.ids.indexOf(node.id) === -1;
            });

            if (typeof data.messages.totalCount === 'number') {
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
          cache.updateQuery({ query: MESSAGE_QUERY, variables: { id } }, (data) => {
            if (data) {
              data.message = null;
            }

            return data;
          });
        });
      },
      deleteMessage: (
        { deleteMessage }: DeleteMessageMutation,
        { input }: DeleteMessageMutationVariables,
        cache,
      ) => {
        cache.updateQuery({ query: MESSAGES_QUERY, variables: {} }, (data) => {
          if (data) {
            data.messages.edges = data.messages.edges.filter(({ node }) => {
              return node.id !== deleteMessage.id;
            });

            if (typeof data.messages.totalCount === 'number') {
              data.messages.totalCount -= 1;
            }

            return data;
          }

          return null;
        });

        cache.updateQuery({ query: MESSAGE_QUERY, variables: { id: input.id } }, (data) => {
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
    MessageAttachment: () => null,
  },
});

const client = createClient({
  url: `${document.baseURI.replace(/\/$/, '')}/graphql`,
  requestPolicy: 'network-only',
  exchanges: [
    graphCache,
    fetchExchange,
    subscriptionExchange({
      forwardSubscription(request) {
        const input = { ...request, query: request.query || '' };
        return {
          subscribe(sink) {
            const unsubscribe = wsClient.subscribe(input, sink);
            return { unsubscribe };
          },
        };
      },
    }),
  ],
});

export default function App() {
  const [search, setSearch] = useState({});
  const [lang, setLang] = useState<string>('all');

  function setLanguage(langToUse: string) {
    setLang(langToUse);
    setSearch((prevState) => ({ ...prevState, lang: langToUse }));
  }

  function setDarkMode(enabled: boolean) {
    if (enabled) {
      document.body.classList.add('dark-mode');
      document.body.classList.remove('light-mode');
    } else {
      document.body.classList.remove('dark-mode');
      document.body.classList.add('light-mode');
    }
  }

  const base = document.baseURI.replace(document.location.origin, '');

  return (
    <Provider value={client}>
      <div className="wrapper">
        <Header
          onSetDarkMode={setDarkMode}
          onSearch={setSearch}
          onSetLanguage={setLanguage}
          lang={lang}
          search={search}
        />
        <Router>
          <Route path={`${base}`} search={search} component={Home} />
          <Route path={`${base}:messageId`} search={search} component={Home} />
        </Router>
      </div>
      <style
        jsx
        // @ts-ignore
        global
      >{`
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
