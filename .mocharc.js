'use strict';

process.env.NODE_ENV = 'test';
global.expect = require('chai').expect;

var Unnecessary = require('./');
var unnecessary = new Unnecessary({
  excludeDirs: ['.nyc_output', 'coverage'],
  excludeFiles: ['package-lock.json', '.eslintrc.json', 'test/.eslintrc.json'],
});

process.on('exit', function(code, signal) {
  if (!signal && code === 0) {
    log();
  }
});

module.exports = {
  reporter: 'spec',
  recursive: false,
  timeout: 1000,
};

function log() {
  var untouched = unnecessary.untouched();
  if (!untouched.length) return;
  console.log('\n\x1b[31mFound %d potentially unused file%s:\x1b[0m', untouched.length, untouched.length > 1 ? 's' : '');
  unnecessary.untouched().forEach(function(file) {
    console.log('\x1b[33m  %s\x1b[0m', file);
  });
}
