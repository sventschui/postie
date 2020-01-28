import { h } from "preact";

function formatSize(bytes) {
  if (bytes < 1024) {
    return `${Math.round(bytes * 10) / 10} B`;
  }

  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${Math.round(kb * 10) / 10} KB`;
  }

  const mb = kb / 1024;
  if (mb < 1024) {
    return `${Math.round(mb * 10) / 10} MB`;
  }

  const gb = mb / 1024;
  return `${Math.round(gb * 10) / 10} GB`;
}

export default function MessageMeta({ message, onShowIOsPreview }) {
  return (
    <div className="meta">
      <dl>
        {/* TODO: we could make the recipients clickable and set the search/filter to that to/from address */}
        <dt>From:</dt>
        <dd>
          <span className="emailAddress">{message.from.text}</span>
        </dd>
        <dt>To:</dt>
        <dd>
          {message.to.map(to => (
            <span key={to.text} className="emailAddress">
              {to.text}
            </span>
          ))}
        </dd>
        <dt>Subject:</dt>
        <dd>{message.subject}</dd>
      </dl>
      <div className="meta-attachments">
        <ul>
          {message.attachments.map(attachment => (
            <li>
              <a
                target="_blank"
                href={`/attachment/${attachment.attachmentId}`}
              >
                {attachment.filename || attachment.attachmentId}{" "}
                <small>
                  ({attachment.contentType.split("/")[1].toUpperCase()},{" "}
                  {formatSize(attachment.size)})
                </small>
              </a>
            </li>
          ))}
        </ul>
      </div>
      <div className="meta-actions">
        <button className="button button-outline" onClick={onShowIOsPreview}>
          Show iOS preview
        </button>
      </div>
      <style jsx>{`
        .meta {
          display: flex;
          flex-direction: row;
          border-bottom: 1px solid #eee;
          justify-content: space-between;
          padding: 10px;
        }

        :global(.dark-mode) .meta {
          color: #ccc;
          border-color: #444;
        }

        .meta-attachments {
          font-size: 11px;
        }

        .meta-attachments ul {
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .meta-attachments li {
          margin: 0;
          padding: 0;
        }

        .meta button {
          height: 30px;
          line-height: 30px;
          padding: 0 10px;
        }

        dl {
          margin: 0;
          display: grid;
          grid-template-columns: auto 1fr;
          grid-template-rows: auto auto 1fr;
          font-size: 14px;
        }

        dt {
          font-weight: bold;
        }

        dt,
        dd {
          margin-bottom: 20px;
        }

        dt:last-of-type,
        dd:last-of-type {
          margin-bottom: 0;
        }

        .emailAddress {
          background: #eee;
          border-radius: 5px;
          padding: 5px;
        }

        :global(.dark-mode) .emailAddress {
          background: #404040;
          color: #ccc;
        }
      `}</style>
    </div>
  );
}
