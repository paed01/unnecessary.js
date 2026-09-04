'use strict';

const { test } = require('node:test');

require('./arbitrary.cjs');

test('noop', () => {});
