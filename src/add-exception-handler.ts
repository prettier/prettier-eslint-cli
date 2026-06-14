/* istanbul ignore-next */
import onUncaughtException from './uncaught-exception-handler.js';

process.on('uncaughtException', onUncaughtException);
