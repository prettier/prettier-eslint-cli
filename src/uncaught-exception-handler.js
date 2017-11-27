import { oneLine, oneLineTrim } from "common-tags";
import getLogger from "loglevel-colored-level-prefix";

const logger = getLogger({ prefix: "prettier-eslint-cli" });

export default onUncaughtException;

function onUncaughtException(err) {
  const level = logger.getLevel();
  const isTrace = level === 0;
  const traceResolution = oneLine`
    Run the script again with the LOG_LEVEL
    environment variable set to "trace"
  `;
  const resolutionSteps = [
    `${isTrace ? "✅ " : "1."} ${traceResolution}`,
    oneLine`
      2. Search existing issues on GitHub:
      ${oneLineTrim`
        https://github.com/prettier/prettier-eslint-cli/issues
        ?utf8=%E2%9C%93&q=${encodeURIComponent(err.message)}
      `}
    `,
    oneLine`
      3. Make a minimal reproduction in a totally separate repository.
      You can fork this one:
      https://github.com/kentcdodds/prettier-eslint-cli-repro
    `,
    oneLine`
      4. Post an issue with a link to your reproduction to the issues
      on GitHub: https://github.com/prettier/prettier-eslint-cli/issues/new
    `
  ].join("\n  ");
  logger.error(
    oneLine`
      There has been an unknown error when running the prettier-eslint CLI.
      If it's unclear to you what went wrong, then try this:
    `,
    `\n  ${resolutionSteps}`
  );
  throw err;
}
