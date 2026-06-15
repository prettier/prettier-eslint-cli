#!/usr/bin/env node

import './add-exception-handler.ts'; // want to do this first

import { normalize } from './argv.ts';
import { formatFiles, type FormatFilesArgv } from './format-files.ts';
import { logger } from './logger.ts';
import { parser } from './parser.ts';

const args = process.argv.slice(2);

logger.trace('Parsing args: ', args);
const argv = normalize(parser.parseSync(args)) as FormatFilesArgv;

void formatFiles(argv);
