declare module 'loglevel-colored-level-prefix' {
  import { LogLevelDesc, Logger } from 'loglevel';

  export interface GetLogger {
    (options?: { level?: LogLevelDesc; prefix?: string }): Logger;
  }

  const getLogger: GetLogger;

  export default getLogger;
}
