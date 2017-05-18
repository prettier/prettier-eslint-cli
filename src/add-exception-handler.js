/* istanbul ignore-next */
import onUncaughtException from './uncaught-exception-handler'

process.on('uncaughtException', onUncaughtException)
