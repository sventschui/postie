import type { RefCallback } from 'preact';
import { h } from 'preact';
import { useCallback, useRef, useState } from 'preact/hooks';
import { useMutation, useQuery } from '@urql/preact';
import Loading from '../loading';
import Toolbar from './toolbar';
import Meta from './meta';
import IOsPreviewModal from './ios-preview/modal';
import { DELETE_MESSAGE, MESSAGE_QUERY } from '../../gql';
import useResizeObserver from '../../hooks/use-resize-observer';

const devices = {
  full: {
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

export type DevicesType = typeof devices;

export type DevicesKeys = keyof typeof devices;

type Props = {
  id: string;
};

export default function Message({ id }: Props) {
  const [result] = useQuery({
    query: MESSAGE_QUERY,
    variables: {
      id,
    },
  });

  const [_, executeDeleteMutation] = useMutation(DELETE_MESSAGE);

  function deleteMessage() {
    if (result.data?.message?.id) {
      executeDeleteMutation({
        input: { id: result.data.message.id },
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
  const message = result.data?.message;

  const setInnerHtml: RefCallback<HTMLIFrameElement> = (ref) => {
    if (ref && message?.html) {
      // TODO: The requestAnimationFrame could potentially lead to race conditions
      // requestAnimationFrame to wait for preact to update the DOM
      requestAnimationFrame(() => {
        if (ref.contentDocument) {
          ref.contentDocument.open();
          ref.contentDocument.write(message.html as string);
          ref.contentDocument.close();
        }
      });
    }
  };

  const [iOsModalOpen, setIOsModalOpen] = useState<boolean>(false);
  const toggleIOsModal = useCallback(() => {
    setIOsModalOpen(!iOsModalOpen);
  }, [iOsModalOpen, setIOsModalOpen]);

  const [selectedDevice, setSelectedDevice] = useState<DevicesKeys>('full');

  const stage = useRef<HTMLDivElement | null>(null);
  const viewport = useRef<HTMLDivElement | null>(null);

  const { setNode, entry: viewportEntry } = useResizeObserver();
  setNode(viewport.current);

  const { setNode: setNode2, entry: stageEntry } = useResizeObserver();
  setNode2(stage.current);

  if (!message) {
    return <div>Not found!</div>;
  }

  let scaleWidth = 1;
  let scaleHeight = 1;

  if (stageEntry?.contentRect && viewportEntry?.contentRect) {
    scaleWidth = Math.min(1, stageEntry.contentRect.width / viewportEntry.contentRect.width);
    scaleHeight = Math.min(1, stageEntry.contentRect.height / viewportEntry.contentRect.height);
  }

  const scale = Math.min(scaleWidth, scaleHeight);

  return (
    <div className="root">
      <IOsPreviewModal message={message} open={iOsModalOpen} onClose={toggleIOsModal} />
      <Meta message={message} onShowIOsPreview={toggleIOsModal} />
      <Toolbar
        devices={devices}
        selectedDevice={selectedDevice}
        onSelectDevice={setSelectedDevice}
        onDeleteMessage={deleteMessage}
      />
      <div className="stage" ref={stage}>
        <div
          style={{
            ...devices[selectedDevice].styles,
            transform: `scale(${scale})`,
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
