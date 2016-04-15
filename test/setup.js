/* eslint no-process-exit:0 no-console:0 */
'use strict';

var Unnecessary = require('../');
var unnecessary = new Unnecessary({
  excludeDirs: ['coverage']
});

process.on('exit', function(code, signal) {
  if (!signal && code === 0) {
    log();
  }
});

function log() {
  var untouched = unnecessary.untouched();
  if (!untouched.length) return;
  console.log('\n\x1b[31mFound %d potentially unused file%s:\x1b[0m', untouched.length, untouched.length > 1 ? 's' : '');
  unnecessary.untouched().forEach(function(file) {
    console.log('\x1b[33m  %s\x1b[0m', file);
  });
}
