var expect = require('expect.js');
var createObject = require('../src/prfl.js').createObject;

test('creates an object that inherits from a second object', function() {
  function Constructor() {}
  Constructor.prototype = { foo: {}, bar: function() {}};

  expect(createObject(Constructor.prototype)).not.to.be(Constructor.prototype);
  expect(createObject(Constructor.prototype).foo).to.be(Constructor.prototype.foo);
  expect(createObject(Constructor.prototype).bar).to.be(Constructor.prototype.bar);
});
