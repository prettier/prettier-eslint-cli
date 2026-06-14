#!/usr/bin/env node

import './add-exception-handler.js'; // want to do this first

import getLogger from 'loglevel-colored-level-prefix';

import normalize from './argv.js';
import formatFiles, { type FormatFilesArgv } from './format-files.js';
import parser from './parser.js';

const logger = getLogger({ prefix: 'prettier-eslint-cli' });
const args = process.argv.slice(2);

logger.trace('Parsing args: ', args);
const argv = normalize(parser.parseSync(args)) as FormatFilesArgv;

void formatFiles(argv);
