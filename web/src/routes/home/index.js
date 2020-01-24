import { h } from "preact";
import { useQuery } from "@urql/preact";
import { Link } from 'preact-router/match';
import Message from '../../components/message';

function pad(num) {
  return `${num}`.padStart(2, '0');
}

function formatDate(dateStr) {
	const date = new Date(dateStr);
	return `${date.getDate()}.${pad(date.getMonth() + 1)}, ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const Home = ({ messageId }) => {
  const [result] = useQuery({
    query: `{
		messages(first: 20) {
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
					dateReceived
				}
			}
		}
	}`
  });

  if (result.fetching) return <p>Loading...</p>;
  if (result.error) return <p>Oh no...</p>;

  return (
    <div className="home">
      <ol>
        {result.data.messages.edges.map(({ node: message }) => (
          <li>
            <Link href={`/${message.id}`}>
				<span className="from-date">
					<span className="from">{message.from.text && message.from.text.replace(/<.+@.+>/, '')}</span>
					<span className="date">{formatDate(message.dateReceived)}</span>
				</span>
				<span className="subject">{message.subject}</span>
			</Link>
          </li>
        ))}
      </ol>
	  <Message id={messageId} />
      <style jsx>{`
        .home {
		  display: flex;
		  flex: 1;
		}

        ol {
          list-style-type: none;
          margin: 0;
          padding: 0;
          border-right: 1px solid #eee;
		  max-width: 200px; /* TODO: make resizeable & togglable, hide on small viewports when mail is selected */
		  overflow: auto;
        }

		li :global(a) {
			display: flex;
			flex-direction: column;
			padding: 5px 10px;
			border-bottom: 1px solid #eee;
			color: #333;
		}

		.from-date {
			display: flex;
			justify-content: space-between;
		}

		.from {
			font-weight: bold;
			font-size: 12px;
			flex: 1;
		}

		.date {
			flex-shrink: 0;
			font-size: 10px;
			font-weight: bold;
		}

		.subject {
			font-weight: normal;
			font-size: 14px;
		}
      `}</style>
    </div>
  );
};

export default Home;
