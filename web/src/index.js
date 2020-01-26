import { h, Component } from 'preact';
import { useState } from 'preact/hooks';
import { Router } from 'preact-router';
import { createClient, dedupExchange, fetchExchange, Provider } from '@urql/preact';
import { cacheExchange } from '@urql/exchange-graphcache';
import { relayPagination } from '@urql/exchange-graphcache/extras';

if (process.env.NODE_ENV === 'development') {
    require('preact/debug');
}

import Header from './components/header';

// Code-splitting is automated for routes
import Home from './routes/home';

const cache = cacheExchange({
    resolvers: {
      Query: {
        messages: relayPagination(),
      },
    },
    keys: {
        SenderRecipient: () => null,
        MessageAttachment: () => null,
    } 
  });

const client = createClient({
  url: 'http://localhost:8025/graphql',
  exchanges: [dedupExchange, cache, fetchExchange],
});

export default function App() {
    const [search, setSearch] = useState({});

    function setDarkMode(enabled) {
        if (enabled) {
            document.body.classList.add('dark-mode');
            document.body.classList.remove('light-mode');
        } else {
            document.body.classList.remove('dark-mode');
            document.body.classList.add('light-mode');
        }
    }

    return (
        <Provider value={client}>
            <div className="wrapper" >
                <Header onSetDarkMode={setDarkMode} onSearch={setSearch} search={search} />
                <Router>
                    <Home path="/" search={search} />
                    <Home path="/:messageId" search={search} />
                </Router>
            </div>
            <style jsx global>{`
                html, body {
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
