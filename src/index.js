#!/usr/bin/env node

import parser from './parser'
import optionsForwarder from '../index'

const argv = parser.parse(process.argv)
