var expect = require('expect.js');
var sinon = require('sinon');

suite('Function wrapping functionality', function() {
  test('The return value of a wrapped function is passed through', function() {
    var func = wrapFunction(function() {
      return 1;
    });

    expect(func()).to.be(1);
  });

  test('A wrapped function is invoked in the correct context', function() {
    var spy = sinon.spy();
    var func = wrapFunction(spy);
    var context = {};

    func.call(context);
    expect(spy.calledOn(context)).to.be.ok();
  });

  test('A wrapped function receives the arguments passed to the wrapper', function() {
    var spy = sinon.spy();
    var func = wrapFunction(spy);
    var object = {};

    func(1, 'foo', object);
    expect(spy.calledWith(1, 'foo', object)).to.be.ok();
  });
});

function wrapFunction(func) {
  return function() {
    return func.apply(this, arguments);
  };
}

suite('Method wrapping functionality', function() {
  test('A patched method is overwritten', function() {
    var method = function() {};
    var object = {method: method};
    wrapMethod(object, 'method');

    expect(object.method).not.to.be(method);
  });

  test('A patched method is still invoked', function() {
    var method = sinon.spy();
    var object = {method: method};
    wrapMethod(object, 'method');
    object.method();

    expect(method.called).to.be.ok();
  });
});

function wrapMethod(object, methodName) {
  object[methodName] = wrapFunction(object[methodName]);
}

suite('Object wrapping functionality', function() {
  test('All methods of an object are wrapped', function() {
    function foo() {}
    function bar() {}
    function baz() {}
    var object = {foo: foo, bar: bar, baz: baz};

    wrapObject(object);

    expect(object.foo).not.to.be(foo);
    expect(object.bar).not.to.be(bar);
    expect(object.baz).not.to.be(baz);
  })
});

function wrapObject(object) {
  var names = Object.keys(object);
  for (var i = 0, len = names.length, name; (name = names[i]) || i < len; i++) {
    wrapMethod(object, name);
  }
}
