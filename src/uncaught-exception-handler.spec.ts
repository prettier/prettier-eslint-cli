import getLoggerMock from 'loglevel-colored-level-prefix';

import onUncaughtException from './uncaught-exception-handler';

interface MockLogger {
  debug: jest.Mock;
  error: jest.Mock;
  getLevel: jest.Mock;
  info: jest.Mock;
  trace: jest.Mock;
  warn: jest.Mock;
}

interface MockGetLogger extends jest.Mock<MockLogger, []> {
  __mock__: {
    level: number;
    logger: Partial<MockLogger>;
    resetAll(): MockLogger;
  };
}

jest.mock('loglevel-colored-level-prefix', () => {
  const logger: Partial<MockLogger> = {};
  const getLogger = jest.fn(() => resetAll()) as MockGetLogger;
  const __mock__ = { logger, level: 4, resetAll };
  getLogger.__mock__ = __mock__;
  return getLogger;

  function resetAll(): MockLogger {
    getLogger.mockClear();
    Object.assign(logger, {
      getLevel: jest.fn(() => getLogger.__mock__.level),
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    });
    return logger as MockLogger;
  }
});

const mockedGetLogger = getLoggerMock as unknown as MockGetLogger;

beforeEach(() => {
  mockedGetLogger.__mock__.resetAll();
});

test('logs all options', () => {
  const logger = mockedGetLogger();
  runWithCatch(new Error('my error'));
  expect(logger.error).toHaveBeenCalledTimes(1);
  const errorLog = logger.error.mock.calls[0].join(' ');
  expect(errorLog).toMatchSnapshot();
});

test('logs a check for trace', () => {
  mockedGetLogger.__mock__.level = 0;
  const logger = mockedGetLogger();
  runWithCatch(new Error('my error'));
  expect(logger.error).toHaveBeenCalledTimes(1);
  const errorLog = logger.error.mock.calls[0].join(' ');
  expect(errorLog).toContain('✅');
  expect(errorLog).toMatchSnapshot();
});

test('re-throws the given error', () => {
  const myError = new Error('my error');
  expect(() => onUncaughtException(myError)).toThrow(myError);
});

function runWithCatch(error: Error): void {
  try {
    onUncaughtException(error);
  } catch {
    // ignore
  }
}
