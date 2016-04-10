'use strict';

var expect = require('chai').expect;

describe('unnecessary', function() {
  describe('require', function() {
    it('traverses the project tree', function() {
      var unnecessary = require('../')();
      expect(unnecessary.files).to.have.length.above(0);
    });
  });
});
