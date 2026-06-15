/* istanbul ignore-next */
import { onUncaughtException } from './uncaught-exception-handler.ts';

process.on('uncaughtException', onUncaughtException);
