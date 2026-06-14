#!/usr/bin/env node

import './add-exception-handler'; // want to do this first

import getLogger from 'loglevel-colored-level-prefix';

import normalize from './argv';
import formatFiles, { type FormatFilesArgv } from './format-files';
import parser from './parser';

const logger = getLogger({ prefix: 'prettier-eslint-cli' });
const args = process.argv.slice(2);

logger.trace('Parsing args: ', args);
const argv = normalize(parser.parseSync(args)) as FormatFilesArgv;

void formatFiles(argv);
