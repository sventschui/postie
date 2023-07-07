import { getDataFromMdc, redact } from '@axah/koa';
import initPino from '@axah/pino-log';
import type { Level } from 'pino';
import config from './config';

export default initPino({
  level: config.logLevel as Level,
  redact,
  getDataFromMdc,
});
