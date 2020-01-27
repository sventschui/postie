import { h } from "preact";
import { useState, useRef, useEffect } from "preact/hooks";
import { useQuery, useSubscription } from "@urql/preact";
import { Link } from "preact-router/match";
import Message from "../../components/message";
import Loading from "../../components/loading";

function pad(num) {
  return `${num}`.padStart(2, "0");
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return `${date.getDate()}.${pad(date.getMonth() + 1)}, ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
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
}`;

const Home = ({ messageId, search }) => {
  const [after, setAfter] = useState(null);

  useSubscription(
    {
      query: `subscription S {
	  messagesAdded {
		  __typename
		  id
		  subject
		  from { text }
		  to { text }
		  dateSent
	  }
  }`
    }
  );

  let [result] = useQuery(
    {
      query: MESSAGES_QUERY,
      variables: { after, ...search }
    },
    [after]
  );

  window.setAfter = setAfter;
  window.result = result;

  function renderList() {
    if (result.error) return <p>Oh no...</p>;

    return (
      <div className="root">
        <ol>
          {result.data &&
            result.data.messages.edges.map(({ node: message }) => (
              <li>
                <Link href={`/${message.id}`}>
                  <span className="from-date">
                    <span className="from">
                      {message.from && message.from.text.replace(/<.+@.+>/, "")}
                    </span>
                    <span className="date">{formatDate(message.dateSent)}</span>
                  </span>
                  <span className="to">
                    {message.to &&
                      message.to
                        .map(to => to.text.replace(/<.+@.+>/, ""))
                        .join(", ")}
                  </span>
                  <span className="subject">{message.subject}</span>
                </Link>
              </li>
            ))}
        </ol>
        {result.data && result.data.messages.pageInfo.hasNextPage && (
          <button
            className="button-outline"
            disabled={result.fetching}
            onClick={() => {
              setAfter(result.data.messages.pageInfo.endCursor);
            }}
          >
            load more
          </button>
        )}
        {result.fetching ? (
          <div className={`loading-overlay ${result.data ? "has-data" : ""}`}>
            <div className="loader">
              <Loading color={result.data ? "white" : "purple"} />
            </div>
          </div>
        ) : null}
        <style jsx>{`
          .root {
            position: relative;
            min-height: 100%;
            border-right: 1px solid #eee;
            overflow: hidden; /* prevent margin from breaking out */
          }

          :global(.dark-mode) .root {
            border-color: #444;
            background: #333;
          }

          .loading-overlay {
            position: absolute;
            top: 0;
            right: 0;
            left: 0;
            bottom: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .loader {
            position: fixed;
            top: 50%;
          }

          .loading-overlay.has-data {
            background: rgba(0, 0, 0, 0.2);
          }
          ol {
            list-style-type: none;
            margin: 0;
            padding: 0;
          }

          li {
            margin: 0;
          }

          li :global(a) {
            display: flex;
            flex-direction: column;
            padding: 10px;
            border-bottom: 1px solid #eee;
            color: #333;
          }

          :global(.dark-mode) li :global(a) {
            border-color: #444;
            color: #ccc;
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

          .to {
            font-size: 11px;
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

          button {
            margin: 0 auto;
            margin-top: 10px;
            margin-bottom: 10px;
            display: block;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="home">
      <div className="list">{renderList()}</div>
      {messageId && <Message id={messageId} />}
      <style jsx>{`
        .home {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        .list {
          width: 200px;
          overflow: auto;
          flex: 0 0 auto;
        }

        @media (min-width: 600px) {
          .list {
            width: 250px;
          }
        }

        @media (min-width: 800px) {
          .list {
            width: 300px;
          }
        }
      `}</style>
    </div>
  );
};

export default Home;
