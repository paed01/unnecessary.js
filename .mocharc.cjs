'use strict';

process.env.NODE_ENV = 'test';

module.exports = {
  reporter: 'spec',
  recursive: false,
  spec: ['test/*-test.js'],
  timeout: 1000,
  require: ['./dist/mocha.cjs'],
};
