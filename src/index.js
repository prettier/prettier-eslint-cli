#!/usr/bin/env node

// eslint-disable-next-line import/no-unassigned-import
import './add-exception-handler' // want to do this first
import getLogger from 'loglevel-colored-level-prefix'
import parser from './parser'
import formatFiles from './format-files'

const logger = getLogger({prefix: 'prettier-eslint-cli'})
const args = process.argv.slice(2)

logger.trace('Parsing args: ', args)
const argv = parser.parse(args)

formatFiles(argv)
