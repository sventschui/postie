import { Fragment, h } from 'preact';
import type { TargetedEvent } from 'preact/compat';
import type { DevicesKeys, DevicesType } from './index';

type Props = {
  devices: DevicesType;
  selectedDevice: DevicesKeys;
  onSelectDevice: (key: DevicesKeys) => void;
  onDeleteMessage: () => void;
};
export default function MessageToolbar({
  devices,
  selectedDevice,
  onSelectDevice,
  onDeleteMessage,
}: Props) {
  return (
    <div className="toolbar">
      <div className="device-selection">
        {Object.entries(devices).map(([name, device]) => (
          <Fragment key={name}>
            <input
              key="input"
              checked={selectedDevice === name}
              id={`device-${name}`}
              type="radio"
              name="device"
              value={name}
              onChange={(e: TargetedEvent<HTMLInputElement>) => {
                onSelectDevice((e.target as HTMLInputElement).value as DevicesKeys);
              }}
            />
            <label key="label" htmlFor={`device-${name}`}>
              {device.label}
            </label>
          </Fragment>
        ))}
      </div>

      <button className="delete-button" onClick={onDeleteMessage}>
        <svg width="24" height="24" viewBox="0 0 24 24">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM8 9h8v10H8V9zm7.5-5l-1-1h-5l-1 1H5v2h14V4z" />
        </svg>
      </button>
      <style jsx>{`
        .toolbar {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 5px;
          border-bottom: 1px solid #eee;
        }

        :global(.dark-mode) .toolbar {
          border-color: #444;
        }

        .delete-button {
          margin: 0;
          margin-left: auto;
          background: transparent;
          border: none;
          padding: 5px;
        }

        .delete-button svg {
          fill: #999;
          width: 24px;
          height: 24px;
        }

        .delete-button:hover svg {
          fill: #9b4dca;
        }

        .device-selection {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-left: auto;
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

        :global(.dark-mode) .device-selection label {
          border-color: #444;
          color: #ccc;
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
      `}</style>
    </div>
  );
}
