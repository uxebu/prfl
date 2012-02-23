var expect = require('expect.js');
var sinon = require('sinon');
var construct = require('../src/prfl.js').construct;

test('construct creates an instance of a constructor', function() {
  function Constructor() {};
  expect(construct(Constructor)).to.be.a(Constructor);
});

test('Arguments should be applied to the constructor', function() {
  var constructor = sinon.spy();
  var a = 'a';
  var b = {};
  var object = construct(constructor, [a, b]);
  expect(constructor.calledWithNew()).to.be.ok();
  expect(constructor.calledWith(a, b)).to.be.ok();
});

