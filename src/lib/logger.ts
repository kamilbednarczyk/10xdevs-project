/* eslint-disable no-console */

type LogArgs = [message?: unknown, ...optional: unknown[]];

const env = typeof import.meta !== "undefined" ? import.meta.env : undefined;
const nodeEnv = typeof process !== "undefined" ? process.env?.NODE_ENV : undefined;
const isProduction = env?.PROD ?? nodeEnv === "production";

export const logger = {
  info: (...args: LogArgs) => {
    if (isProduction) {
      return;
    }
    console.info(...args);
  },
  warn: (...args: LogArgs) => {
    if (isProduction) {
      return;
    }
    console.warn(...args);
  },
  error: (...args: LogArgs) => {
    console.error(...args);
  },
};
