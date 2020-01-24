import { h, Component } from 'preact';
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
  });

const client = createClient({
  url: 'http://localhost:8025/graphql',
  exchanges: [dedupExchange, cache, fetchExchange],
});

export default class App extends Component {
	
	/** Gets fired when the route changes.
	 *	@param {Object} event		"change" event from [preact-router](http://git.io/preact-router)
	 *	@param {string} event.url	The newly routed URL
	 */
	handleRoute = e => {
		this.currentUrl = e.url;
	};

	render() {
		return (
			<Provider value={client}>
                <div className="wrapper" >
                    <Header />
                    <Router onChange={this.handleRoute}>
                        <Home path="/" />
                        <Home path="/:messageId" />
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
}
