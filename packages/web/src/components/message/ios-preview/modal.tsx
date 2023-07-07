import { h } from 'preact';
import IOsPreview from './ios-preview';
import type { Message, SenderRecipient } from '../../../generated/graphql';

type Props = {
  open: boolean;
  message: Pick<Message, 'subject' | 'dateSent' | 'dateReceived' | 'text'> & {
    from?: Pick<SenderRecipient, 'text'> | undefined | null;
  };
  onClose: (bool: boolean) => void;
};

export default function MessageIOsPreviewModal({ open, message, onClose }: Props) {
  return open ? (
    <div
      className="ios-modal"
      onClick={(e) => {
        const { target, currentTarget } = e;
        if (target === currentTarget) {
          onClose(false);
        }
      }}
    >
      <div className="ios-preview">
        <IOsPreview
          sender={message.from?.text && message.from.text.replace(/<.+@.+>/, '')}
          subject={message.subject || undefined}
          // TODO: message.text includes img alt tags, we don't want this in the preheader
          preheader={message.text}
          dateSent={new Date(message.dateSent || message.dateReceived)}
        />
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
          background: rgba(0, 0, 0, 0.5);
        }

        .ios-preview {
          background: white;
          width: 375px;
        }
      `}</style>
    </div>
  ) : null;
}
