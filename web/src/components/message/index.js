import { h } from "preact";
import { useCallback, useState, useRef } from "preact/hooks";
import { useQuery, useMutation } from "@urql/preact";
import gql from 'graphql-tag';
import Loading from "../loading";
import Toolbar from './toolbar';
import Meta from './meta';
import IOsPreviewModal from './ios-preview/modal';
import { MESSAGE_QUERY } from '../../queries';
import useResizeObserver from '../../hooks/use-resize-observer';

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

export default function Message({ id }) {
  const [result] = useQuery({
    query: MESSAGE_QUERY,
    variables: {
      id
    }
  });

  const [deleteMutationResult, executeDeleteMutation] = useMutation(
    gql`mutation Delete($input: DeleteMessageInput!) { deleteMessage(input: $input) { id } }`
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
      <IOsPreviewModal message={message} open={iOsModalOpen} onClose={toggleIOsModal} />
      <Meta message={message} onShowIOsPreview={toggleIOsModal} />
      <Toolbar devices={devices} selectedDevice={selectedDevice} onSelectDevice={setSelectedDevice} onDeleteMessage={deleteMessage} />
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
