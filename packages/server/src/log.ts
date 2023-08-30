import { AsyncLocalStorage } from 'async_hooks';
import initPino from '@axah/pino-log';
import { getDataFromMdc, redact } from '@axah/koa';

export const rootLogger = initPino({
  level: 'debug',
  redact,
  getDataFromMdc,
});

export const context = new AsyncLocalStorage<Map<string, any>>();

export const log = new Proxy(rootLogger, {
  get(target, property, receiver) {
    const childLogger = context.getStore()?.get('logger');
    return Reflect.get(childLogger || target, property, receiver);
  },
});
