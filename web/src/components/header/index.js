import { h } from "preact";
import { useState, useCallback, useRef } from "preact/hooks";
import { Link } from "preact-router/match";

const UP = 38;
const DOWN = 40;
const ENTER = 13;

const types = ["text", "subject", "to"];

const Header = ({ onSearch, search }) => {
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
      </header>
      <style jsx>{`
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

        .header h1 {
          float: left;
          margin: 0;
          padding: 0 15px;
          font-size: 24px;
          line-height: 56px;
          font-weight: 400;
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

        .search-box input[type="text"] {
          background: transparent;
          border: none;
          margin: 0;
          width: 100%;
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

        .term {
          padding: 0 5px;
          color: #222;
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
      `}</style>
    </div>
  );
};

export default Header;
