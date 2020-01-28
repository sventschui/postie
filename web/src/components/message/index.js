import { h } from "preact";
import { useCallback, useLayoutEffect, useState, useRef } from "preact/hooks";
import { useQuery, useMutation } from "@urql/preact";
import ResizeObserver from "resize-observer-polyfill";
import Loading from "../loading";
import MailEntry from "./mail-entry";
import Toolbar from './toolbar';
import Meta from './meta';

const devices = {
  full: {
    label: "Full width",
    styles: { width: "100%", height: "100%" }
  },
  "iphone-7": {
    label: "iPhone 7",
    styles: { width: "375px", height: "667px" }
  },
  "iphone-7-plus": {
    label: "iPhone 7 Plus",
    styles: { width: "414px", height: "736px" }
  },
  "iphone-x": {
    label: "iPhone X",
    styles: { width: "375px", height: "812px" }
  },
  "htc-one": {
    label: "HTC ONE",
    styles: { width: "360px", height: "640px" }
  }
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
                dateSent
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

  const [deleteMutationResult, executeDeleteMutation] = useMutation(
    `mutation Delete($input: DeleteMessageInput!) { deleteMessage(input: $input) { id } }`
  );

  function deleteMessage() {
    if (result.data) {
      executeDeleteMutation({
        input: { id: result.data.message.id },
        search: "todo"
      });
    }
  }

  if (result.fetching) {
    return (
      <div>
        <Loading />
        <style jsx>{`
          div {
            display: flex;
            align-items: center;
            justify-content: center;
            flex: 1;
          }
        `}</style>
      </div>
    );
  }
  if (result.error) return <p>Oh no... {JSON.stringify(result.error)}</p>;
  const { message } = result.data;

  function setInnerHtml(ref) {
    if (ref && message.html) {
      // TODO: The setTimeout could potentially lead to race conditions
      // setTimeout to wait for preact to update the DOM
      setTimeout(() => {
        if (ref.contentDocument) {
          ref.contentDocument.open();
          ref.contentDocument.write(message.html);
        }
      }, 0);
    }
  }

  const [iOsModalOpen, setIOsModalOpen] = useState(false);
  const toggleIOsModal = useCallback(() => {
    setIOsModalOpen(!iOsModalOpen);
  }, [iOsModalOpen, setIOsModalOpen]);

  function clickIOsModal(e) {
    const { target, currentTarget } = e;
    if (target === currentTarget) {
      setIOsModalOpen(false);
    }
  }

  const [selectedDevice, setSelectedDevice] = useState("full");

  const stage = useRef(null);
  const viewport = useRef(null);

  const [setNode, viewportEntry] = useResizeObserver();
  setNode(viewport.current);

  const [setNode2, stageEntry] = useResizeObserver();
  setNode2(stage.current);

  if (!message) {
    return <div>Not found!</div>;
  }

  let scaleWidth = 1;
  let scaleHeight = 1;
  if (stageEntry.contentRect && viewportEntry.contentRect) {
    scaleWidth = Math.min(
      1,
      stageEntry.contentRect.width / viewportEntry.contentRect.width
    );
    scaleHeight = Math.min(
      1,
      stageEntry.contentRect.height / viewportEntry.contentRect.height
    );
  }

  const scale = Math.min(scaleWidth, scaleHeight);

  return (
    <div className="root">
      {iOsModalOpen && (
        <div className="ios-modal" onClick={clickIOsModal}>
          <div className="ios-preview">
            <MailEntry
              sender={
                message.from.text && message.from.text.replace(/<.+@.+>/, "")
              }
              subject={message.subject}
              // TODO: message.text includes img alt tags, we don't want this in the preheader
              preheader={message.text}
              dateSent={new Date(message.dateSent)}
            />
          </div>
        </div>
      )}
      <Meta message={message} onShowIOsPreview={toggleIOsModal} />
      <Toolbar devices={devices} selectedDevice={selectedDevice} onSelectDevice={setSelectedDevice} onDelete={deleteMessage} />
      <div className="stage" ref={stage}>
        <div
          style={{
            ...devices[selectedDevice].styles,
            transform: `scale(${scale})`
          }}
          ref={viewport}
        >
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
          content: "";
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          background: rgba(0, 0, 0, 0.5);
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

        :global(.dark-mode) .stage {
          background: #333;
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

        :global(.dark-mode) .root {
          background: #333;
        }

        iframe {
          border: 0;
        }
      `}</style>
    </div>
  );
}
