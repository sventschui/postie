import { h } from "preact";
import { useCallback, useLayoutEffect, useState, useRef } from 'preact/hooks';
import { useQuery } from "@urql/preact";
import ResizeObserver from 'resize-observer-polyfill';
import MailEntry from './mail-entry';

const devices = {
    'full': {
        label: 'Full width',
        styles: { width: '100%', height: '100%' },
    },
    'iphone-7': {
        label: 'iPhone 7',
        styles: { width: '375px', height: '667px' },
    },
    'iphone-7-plus': {
        label: 'iPhone 7 Plus',
        styles: { width: '414px', height: '736px' },
    },
    'iphone-x': {
        label: 'iPhone X',
        styles: { width: '375px', height: '812px' },
    },
    'htc-one': {
        label: 'HTC ONE',
        styles: { width: '360px', height: '640px' },
    },
};

const useResizeObserver = () => {
    const [entry, setEntry] = useState({});
    const [node, setNode] = useState(null);
    const observer = useRef(null);
  
    const disconnect = useCallback(() => {
      const { current } = observer;
      current && current.disconnect();
    }, []);
  
    const observe = useCallback(() => {
      observer.current = new ResizeObserver(([entry]) => setEntry(entry));
      node && observer.current.observe(node);
    }, [node]);
  
    useLayoutEffect(() => {
      observe();
      return () => disconnect();
    }, [disconnect, observe]);
  
    return [setNode, entry];
};

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

export default function Message({ id }) {
  const [result] = useQuery({
    query: `query Q($id: ID!) {
            message(id: $id) {
                id
                subject
                from {
                    text
                }
                to {
                    text
                }
                html
                text
                dateReceived
                attachments {
                    attachmentId
                    filename
                    contentType
                    size
                }
            }
        }`,
    variables: {
      id
    }
  });

  if (result.fetching) return <p>Loading...</p>;
  if (result.error) return <p>Oh no... {JSON.stringify(result.error)}</p>;
  const { message } = result.data;

  function setInnerHtml(ref) {
    if (ref && message.html) {
      // setTimeout to wait for preact to update the DOM
      setTimeout(() => {
        ref.contentDocument.open();
        ref.contentDocument.write(message.html);
      }, 0);
    }
  }

  const [iOsModalOpen, setIOsModalOpen] = useState(false);
  const toggleIOsModal = useCallback(() => {
    setIOsModalOpen(!iOsModalOpen);
  }, [iOsModalOpen, setIOsModalOpen])

  function clickIOsModal(e) {
      const { target, currentTarget } = e;
      if (target === currentTarget) {
          setIOsModalOpen(false);
      }
  }

  const [selectedDevice, setSelectedDevice] = useState('full');
  const selectDevice = useCallback((e) => {
    setSelectedDevice(e.target.value);
  }, [setSelectedDevice]);

  const stage = useRef(null);
  const viewport = useRef(null);

  const [setNode, viewportEntry] = useResizeObserver();
  setNode(viewport.current);

  const [setNode2, stageEntry] = useResizeObserver();
  setNode2(stage.current);

  let scaleWidth = 1;
  let scaleHeight = 1;
  if (stageEntry.contentRect && viewportEntry.contentRect) {
    scaleWidth = Math.min(1, stageEntry.contentRect.width / viewportEntry.contentRect.width);
    scaleHeight = Math.min(1, stageEntry.contentRect.height / viewportEntry.contentRect.height);
  }

  const scale = Math.min(scaleWidth, scaleHeight);
  console.log({ scaleWidth, scaleHeight, scale });

  return (
    <div className="root">
        {iOsModalOpen && (
            <div className="ios-modal" onClick={clickIOsModal}>
                <div className="ios-preview">
                    <MailEntry
                        sender={message.from.text && message.from.text.replace(/<.+@.+>/, '')}
                        subject={message.subject}
                        // TODO: message.text includes img alt tags, we don't want this in the preheader
                        preheader={message.text}
                        dateReceived={new Date(message.dateReceived)}
                    />
                </div>
            </div>
        )}
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
        <div className="meta-attachments" >
            <ul>
                {message.attachments.map(attachment => (
                    <li>
                        <a target="_blank" href={`/attachment/${attachment.attachmentId}`} >
                            {attachment.filename || attachment.attachmentId}
                            {' '}
                            <small>({attachment.contentType.split('/')[1].toUpperCase()}, {formatSize(attachment.size)})</small>
                        </a>
                    </li>
                ))}
            </ul>
        </div>
        <div className="meta-actions">
          <button className="button button-outline" onClick={toggleIOsModal}>Show iOS preview</button>
        </div>
      </div>
      <div className="device-selection">
            {Object.entries(devices).map(([name, device])=> (
                <Fragment key={name}>
                    <input key="input" checked={selectedDevice === name} id={`device-${name}`} type="radio" name="device" value={name} onChange={selectDevice} />
                    <label key="label" htmlFor={`device-${name}`}>
                        {device.label}
                    </label>
                </Fragment>
            ))}
      </div>
      <div className="stage" ref={stage}>
        <div style={{
            ...devices[selectedDevice].styles,
            transform: `scale(${scale})`
        }} ref={viewport}>
            {message.html && <iframe className="mail" ref={setInnerHtml} />}
            {!message.html && <div className="mail">{message.text}</div>}
        </div>
      </div>
        <style jsx>{`
        .ios-modal {
            position: absolute;
            top: 0;
            right: 0;
            bottom: 0;
            left: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }

        .ios-modal > * {
            position: relative;
        }

        .ios-modal::before {
            display: block;
            content: '';
            position: absolute;
            top: 0;
            right: 0;
            bottom: 0;
            left: 0;
            background: rgba(0, 0, 0, .5);
        }

        .ios-preview {
            background: white;
            width: 375px;
        }

        .stage {
            background: #eee;
            display: flex;
            align-items: center;
            justify-content: center;
            flex: 1;
            overflow: hidden;
        }
        .mail {
            width: 100%;
            height: 100%;
            overflow: auto;
        }
        .root {
          display: flex;
          flex-direction: column;
          width: 100%;
        }

        iframe {
          border: 0;
        }

        .meta {
          display: flex;
          flex-direction: row;
          border-bottom: 1px solid #eee;
          justify-content: space-between;
          padding: 10px;
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

        .device-selection {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 5px;
            border-bottom: 1px solid #eee;
        }

        .device-selection label {
            padding: 10px;
            font-size: 11px;
            font-weight: 300;
            margin: 0;
            border: 1px solid #eee;
            border-left-width: 0;
            height: auto;
            line-height: 1;
        }

        .device-selection label:last-of-type {
            border-top-right-radius: 5px;
            border-bottom-right-radius: 5px;
        }

        .device-selection label:first-of-type {
            border-top-left-radius: 5px;
            border-bottom-left-radius: 5px;
            border-left-width: 1px;
        }

        .device-selection input {
            visibility: hidden;
            height: 0;
            width: 0;
            position: absolute;
        }

        .device-selection input:checked + label {
            background: #9b4dca;
            border-color: #9b4dca;
            color: white;
            font-weight: bold;
        }

        .meta button {
            font-site: 12px;
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

        dt:last-of-type, dd:last-of-type {
            margin-bottom: 0;
        }

        .emailAddress {
          background: #eee;
          border-radius: 5px;
          padding: 5px;
        }
      `}</style>
    </div>
  );
}
