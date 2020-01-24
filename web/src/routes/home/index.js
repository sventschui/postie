import { h } from "preact";
import { useState } from "preact/hooks";
import { useQuery } from "@urql/preact";
import { Link } from "preact-router/match";
import Message from "../../components/message";

function pad(num) {
  return `${num}`.padStart(2, "0");
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return `${date.getDate()}.${pad(date.getMonth() + 1)}, ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

const Home = ({ messageId }) => {
  const [after, setAfter] = useState(
    "bWVzc2FnZTo1ZTI5NjBhZWI1NmExNzJhZTQyYjYyNzI="
  );
  console.log({ after });

  const [result] = useQuery(
    {
      query: `query Q($after: String) {
		messages(first: 20, after: $after) {
			__typename
			pageInfo {
				__typename
				endCursor
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
					dateReceived
				}
			}
		}
	}`,
      variables: { after }
    },
    [after]
  );

  window.setAfter = setAfter;
  window.result = result;

  function renderList() {
    if (result.error) return <p>Oh no...</p>;

    return (
      <ol>
        {result.data &&
          result.data.messages.edges.map(({ node: message }) => (
            <li>
              <Link href={`/${message.id}`}>
                <span className="from-date">
                  <span className="from">
                    {message.from && message.from.text.replace(/<.+@.+>/, "")}
                  </span>
                  <span className="date">
                    {formatDate(message.dateReceived)}
                  </span>
                </span>
                <span className="subject">{message.subject}</span>
              </Link>
            </li>
          ))}
        <button
          disabled={result.fetching}
          onClick={() => {
            setAfter(result.data.messages.pageInfo.endCursor);
          }}
        >
          next
        </button>
        <style jsx>{`
          ol {
            list-style-type: none;
            margin: 0;
            padding: 0;
            border-right: 1px solid #eee;
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
      </ol>
    );
  }

  return (
    <div className="home">
      <div className="list">{renderList()}</div>
      <Message id={messageId} />
      <style jsx>{`
        .home {
          display: flex;
          flex: 1;
        }

        .list {
          width: 200px;
          overflow: auto;
        }
      `}</style>
    </div>
  );
};

export default Home;
