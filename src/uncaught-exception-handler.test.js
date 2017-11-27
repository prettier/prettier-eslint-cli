import getLoggerMock from "loglevel-colored-level-prefix";
import onUncaughtException from "./uncaught-exception-handler";

jest.mock("loglevel-colored-level-prefix", () => {
  const logger = {};
  const __mock__ = { logger, level: 4, resetAll };
  const getLogger = jest.fn(() => resetAll());
  getLogger.__mock__ = __mock__;
  return getLogger;

  function resetAll() {
    getLogger.mockClear();
    Object.assign(logger, {
      getLevel: jest.fn(() => getLogger.__mock__.level),
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    });
    return logger;
  }
});

beforeEach(() => {
  getLoggerMock.__mock__.resetAll();
});

test("logs all options", () => {
  const logger = getLoggerMock();
  runWithCatch(new Error("my error"));
  expect(logger.error).toHaveBeenCalledTimes(1);
  const errorLog = logger.error.mock.calls[0].join(" ");
  expect(errorLog).toMatchSnapshot();
});

test("logs a check for trace", () => {
  getLoggerMock.__mock__.level = 0;
  const logger = getLoggerMock();
  runWithCatch(new Error("my error"));
  expect(logger.error).toHaveBeenCalledTimes(1);
  const errorLog = logger.error.mock.calls[0].join(" ");
  expect(errorLog).toContain("✅");
  expect(errorLog).toMatchSnapshot();
});

test("re-throws the given error", () => {
  const myError = new Error("my error");
  expect(() => onUncaughtException(myError)).toThrow(myError);
});

function runWithCatch(...args) {
  try {
    onUncaughtException(...args);
  } catch (e) {
    // ignore
  }
}
