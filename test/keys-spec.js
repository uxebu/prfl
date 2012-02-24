var expect = require('expect.js');
var keys = require('../src/prfl').keys;

suite('keys()', function() {
  var checkException = function(e) {
    expect(e).to.be.a(TypeError);
  };

  test('throws a TypeError when receiving null', function() {
    expect(function() { keys(null); }).to.throwException(checkException);
  });

  test('does not throw an exception when calledf with an object', function() {
    expect(function() { keys({}); }).not.to.throwException();
  });

  test('throws a TypeError when receiving undefined', function() {
    expect(function() { keys(undefined); }).to.throwException(checkException);
  });

  test('throws a TypeError when receiving a boolean', function() {
    expect(function() { keys(true); }).to.throwException(checkException);
  });

  test('throws a TypeError when receiving a number', function() {
    expect(function() { keys(1); }).to.throwException(checkException);
  });

  test('throws a TypeError when receiving a string', function() {
    expect(function() { keys('abc'); }).to.throwException(checkException);
  });

  test('returns an empty array for an empty object', function() {
    expect(keys({})).to.eql([]);
  });

  test('returns all property names of an object', function() {
    expect(keys({a: 0, b: 1, c: 2})).to.eql(['a', 'b', 'c']);
  });

  test('returns the property name of an object with a single property', function() {
    expect(keys({a: 0})).to.eql(['a']);
  });

  test('returns all property names of an object', function() {
    expect(keys({foo: 0, bar: 1, baz: 2})).to.eql(['foo', 'bar', 'baz']);
  });

  test('does not return names of prototype properties', function() {
    function Constructor() {
      this.ownProperty1 = 1;
      this.ownProperty2 = 2;
    }

    Constructor.prototype = {
      prototypeProperty: 1
    };

    expect(keys(new Constructor())).to.eql(['ownProperty1', 'ownProperty2'])
  })

});

