// @flow
import React from 'react';

function pad(num) {
  return `${num}`.padStart(2, '0');
}

const MailEntry = ({
  sender,
  subject,
  preheader,
  dateReceived,
}) => (
  <div className="mail">
    <div className="meta">
      <i className="unread" />
      <p className="sender">{sender}</p>
      <span className="received">{`${pad(dateReceived.getHours())}:${pad(dateReceived.getMinutes())}`}</span>
      <i className="caret" />
    </div>
    <h1 className="subject" title={subject}>{subject}</h1>
    <p className="preheader" title={preheader}>{preheader}</p>
    <style jsx>{`
      .mail {
        text-align: inherit;
        border: none;
        outline: none;
        position: relative;
        margin: 0 auto;
        padding: 8px 15px 8px 30px;
        font-family: "San Francisco", sans-serif;
        background-color: white;
        border-bottom: 1px solid #C8C7CC;
        width: 100%;
        height: 110px;
      }

      .meta {
        display: flex;
        height: 22px;
        position: relative;
      }

      .unread {
        position: absolute;
        top: 6px;
        left: -20px;
        display: block;
        width: 11px;
        height: 11px;
        border-radius: 50%;
        background-color: #007FFB;
      }

      .sender {
        margin: 0;
        flex-grow: 1;
        line-height: 24px;
        color: #000000;
        font-size: 16px;
        font-weight: 600;
        overflow: hidden;
        text-overflow: ellipsis;
        text-transform: none;
      }

      .received {
        margin: 0;
        margin-left: 10px;
        flex-shrink: 0;
        color: #8E8E93;
        line-height: 20px;
        font-size: 14px;
        font-weight: 300;
      }

      .subject {
        margin: 0;
        color: #000000;
        height: 24px;
        line-height: 24px;
        font-size: 16px;
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        display: -webkit-box;
        text-transform: none;
      }

      .preheader {
        margin: 0;
        color: #8E8E8E;
        height: 48px;
        line-height: 24px;
        font-size: 16px;
        font-weight: 300;
        overflow: hidden;
        text-overflow: ellipsis;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        display: -webkit-box;
        text-transform: none;
      }
    `}</style>
  </div>
);

export default MailEntry;
