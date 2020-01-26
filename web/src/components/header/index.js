import { h } from "preact";
import { useState, useCallback, useRef } from "preact/hooks";
import { Link } from "preact-router/match";

const UP = 38;
const DOWN = 40;
const ENTER = 13;

const types = ["text", "subject", "to"];

const Sun = props => (
  <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M16.53 22a5.5 5.5 0 100-11 5.5 5.5 0 000 11zm0-1a4.5 4.5 0 100-9 4.5 4.5 0 000 9zm0-14c-.277 0-.5.216-.5.495v2.01c0 .273.231.495.5.495.275 0 .5-.216.5-.495v-2.01a.503.503 0 00-.5-.495zm6.737 2.791a.494.494 0 00-.704-.003l-1.42 1.42a.503.503 0 00.003.704.494.494 0 00.704.004l1.42-1.421a.503.503 0 00-.003-.704zm2.791 6.738c0-.276-.216-.5-.495-.5h-2.01a.503.503 0 00-.495.5c0 .276.216.5.495.5h2.01a.503.503 0 00.495-.5zm-2.79 6.738a.494.494 0 00.002-.704l-1.42-1.42a.503.503 0 00-.704.003.494.494 0 00-.003.704l1.42 1.42a.503.503 0 00.704-.003zm-6.739 2.791c.276 0 .5-.216.5-.495v-2.01a.503.503 0 00-.5-.495c-.276 0-.5.216-.5.495v2.01c0 .273.232.495.5.495zm-6.738-2.79a.494.494 0 00.704.002l1.42-1.42a.503.503 0 00-.003-.704.494.494 0 00-.704-.003l-1.42 1.42a.503.503 0 00.003.704zM7 16.528c0 .276.216.5.495.5h2.01a.503.503 0 00.495-.5c0-.276-.216-.5-.495-.5h-2.01a.503.503 0 00-.495.5zm2.791-6.738a.494.494 0 00-.003.704l1.42 1.42a.503.503 0 00.704-.003.494.494 0 00.004-.704l-1.421-1.42a.503.503 0 00-.704.003z"
      fill="#929292"
      fill-rule="evenodd"
    />
  </svg>
);

const Moon = props => (
  <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M21.836 17.831A5.5 5.5 0 1116.254 11a4.5 4.5 0 005.74 5.74c-.016.375-.07.74-.158 1.091zM12 16.495a4.502 4.502 0 013.005-4.246 5.5 5.5 0 005.74 5.74A4.502 4.502 0 0112 16.495z"
      fill="#929292"
      fill-rule="evenodd"
    />
  </svg>
);

const Header = ({ onSearch, search, onSetDarkMode }) => {
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState("");
  const [type, setType] = useState("text");
  const input = useRef(null);

  const onSearchSubmit = useCallback(() => {
    onSearch({ ...search, [type]: text });
    if (input.current) {
      input.current.value = "";
      setText("");
    }
  }, [type, text, search]);

  return (
    <div className="wrapper">
      <header className="header">
        <h1>postie</h1>
        <div className="search">
          <div className="search-box">
            {Object.entries(search).map(
              ([t, term]) =>
                term && (
                  <span className="search-item">
                    <span className="type">{t}</span>
                    <span className="term">{term}</span>
                    <button
                      onClick={() => {
                        onSearch({ ...search, [t]: null });
                      }}
                      className="delete-search"
                    >
                      x
                    </button>
                  </span>
                )
            )}
            <input
              ref={input}
              type="text"
              placeholder="search"
              onInput={e => {
                setText(e.target.value);
              }}
              onFocus={() => {
                setTyping(true);
              }}
              // TODO: get rid of this weird timeout...
              onBlur={e => {
                setTimeout(() => {
                  setTyping(false);
                }, 50);
              }}
              onKeyDown={e => {
                if (e.keyCode === DOWN) {
                  let index = types.indexOf(type);
                  index++;
                  if (index >= types.length) {
                    index = 0;
                  }
                  setType(types[index]);
                } else if (e.keyCode === UP) {
                  let index = types.indexOf(type);
                  index--;
                  if (index < 0) {
                    index = types.length - 1;
                  }
                  setType(types[index]);
                } else if (e.keyCode === ENTER) {
                  onSearchSubmit();
                  e.target.blur();
                }
              }}
            />
          </div>
          {typing && text ? (
            <div className="searcher">
              <ol>
                <li
                  onMouseOver={() => {
                    setType("text");
                  }}
                  className={type === "text" ? "active" : ""}
                >
                  <button onMouseUp={onSearchSubmit}>
                    Search mails with text {text}
                  </button>
                </li>
                <li
                  onMouseOver={() => {
                    setType("subject");
                  }}
                  className={type === "subject" ? "active" : ""}
                >
                  <button onMouseUp={onSearchSubmit}>
                    Search mails with subject {text}
                  </button>
                </li>
                <li
                  onMouseOver={() => {
                    setType("to");
                  }}
                  className={type === "to" ? "active" : ""}
                >
                  <button onMouseUp={onSearchSubmit}>
                    Search mails to {text}
                  </button>
                </li>
              </ol>
            </div>
          ) : null}
        </div>
        <button className="dark-mode-toggle">
          <Sun
            className="sun"
            onClick={() => {
              onSetDarkMode(false);
            }}
          />
          <Moon
            className="moon"
            onClick={() => {
              onSetDarkMode(true);
            }}
          />
        </button>
      </header>
      <style jsx>{`
        .dark-mode-toggle {
          text-transform: none;
          background: transparent;
          border: none;
          padding: 5px;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          margin: 0;
        }

        .dark-mode-toggle :global(.sun),
        .dark-mode-toggle :global(.moon) {
          width: 32px;
          height: 32px;
          fill: red;
        }

        .dark-mode-toggle :global(.sun) {
          display: none;
        }

        :global(.dark-mode) .dark-mode-toggle :global(.sun) {
          display: block;
        }

        :global(.dark-mode) .dark-mode-toggle :global(.moon) {
          display: none;
        }
        .wrapper {
          /* wrapper to not have the header overlap stuff */
          height: 56px;
          flex: 0 0 auto;
        }

        .searcher {
          position: absolute;
          background: white;
          border: 1px solid #eee;
          left: 0;
          right: 0;
        }
		
		:global(.dark-mode) .searcher {
			background: #333;
          	border-color: #444;
        }

        .searcher ol {
          list-style: none;
          margin: 0;
        }

        .searcher li {
          margin: 0;
          line-height: 20px;
        }

        .searcher li + li {
          border-top: 1px solid #eee;
        }
		
		:global(.dark-mode) .searcher li + li {
          	border-color: #444;
        }

        .searcher li.active {
          background: #9b4dca;
        }

        .searcher li button {
          background: transparent;
          border: none;
          display: block;
          height: 100%;
          width: 100%;
          margin: 0;
          padding: 0;
          text-transform: none;
          text-align: left;
          font-weight: normal;
          color: #333;
          padding: 10px;
        }
		
		:global(.dark-mode) .searcher li button {
          color: #ccc;
        }

        .searcher li.active button {
          color: white;
        }

        .header {
          position: fixed;
          left: 0;
          top: 0;
          width: 100%;
          height: 56px;
          padding: 0;
          z-index: 50;
          border-bottom: 1px solid #eee;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #fff;
        }

		:global(.dark-mode) .header {
			background: #333;
			border-color: #444;
		}

        .header h1 {
          float: left;
          margin: 0;
          padding: 0 15px;
          font-size: 24px;
          line-height: 56px;
          font-weight: 400;
        }

		:global(.dark-mode) .header {
			color: white;
		}

        .search {
          flex: 1;
          margin: 0 10px;
          position: relative;
        }

        .search-box {
          background: #eee;
          border-radius: 3px;
          display: flex;
          align-items: center;
        }

		:global(.dark-mode) .search-box {
			background: #444;
		}

        .search-box input[type="text"] {
          background: transparent;
          border: none;
          margin: 0;
          width: 100%;
        }

		:global(.dark-mode) .search-box input[type="text"] {
			color: #ccc;
		}

        .search-item {
          background: #e0e0e0;
          font-size: 13px;
          height: auto;
          display: flex;
          align-items: stretch;
          margin-left: 10px;
          flex-shrink: 0;
        }

		:global(.dark-mode) .search-item {
			background: #777;
		}

        .type {
          background: #ccc;
          color: #666;
          padding: 0 5px;
          text-transform: uppercase;
          font-size: 0.8em;
          display: flex;
          align-items: center;
          font-weight: 600;
        }

		:global(.dark-mode) .type {
			background: #666;
			color: #bbb;
		}

        .term {
          padding: 0 5px;
          color: #222;
        }

		:global(.dark-mode) .term {
			color: #eee;
		}

        .delete-search {
          border: none;
          background: transparent;
          color: #333;
          padding: 5px;
          margin: 0;
          display: block;
          height: auto;
          line-height: 1;
          font-weight: normal;
          font-size: 10px;
        }

        .delete-search:hover {
          color: #000;
          font-weight: bold;
        }

		:global(.dark-mode) .delete-search {
			color: #aaa;
		}

		:global(.dark-mode) .delete-search:hover {
			color: #ccc;
		}
      `}</style>
    </div>
  );
};

export default Header;
