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
  });

  test('The object itself is returned', function() {
    var object = {};
    expect(wrapObject(object)).to.be(object);
  });

  test('Non-functions are not wrapped', function() {
    var object= {arbitraryKey: 'arbitraryNonFunction'};
    wrapObject(object);
    expect(object.arbitraryKey).to.be('arbitraryNonFunction');
  });

  test('Wrapping works on sub-objects', function() {
    function foo() {}
    var object = {sub: {foo: foo}};
    wrapObject(object);
    expect(object.sub.foo).not.to.equal(foo);
  });

  test('Don\'t rewrap seen objects', function() {
    var object = {};
    object.recursion = object;
    // reaches maximum call stack when recursing infinetely
    expect(function() { wrapObject(object); }).not.to.throwException();
  });

  test('wraps methods of functions', function() {
    function foo() {}
    function bar() {}
    foo.bar = bar;
    wrapObject({foo: foo});
    expect(foo.bar).not.to.be(bar);
  });

  test('wraps function prototype object', function() {
    function Foo() {}
    function bar() {}
    Foo.prototype.bar = bar;

    wrapObject(Foo);
    expect(Foo.prototype.bar).not.to.be(bar);
  });
});

function wrapObject(object, seenObjects) {
  if (seenObjects) {
    if (seenObjects.indexOf(object) !== -1) {
      return object;
    }
    seenObjects.push(object);
  } else {
    seenObjects = [object];
  }

  if (typeof object === 'function') {
    wrapObject(object.prototype, seenObjects);
  }

  var names = Object.keys(object);
  for (var i = 0, len = names.length; i < len; i++) {
    var key = names[i], value = object[key];
    switch(typeof value) {
      case 'function':
        wrapMethod(object, key);
        wrapObject(value.prototype, seenObjects);
      // fallthrough intended
      case 'object':
        if (value !== null) wrapObject(value, seenObjects);
        break;
    }
  }

  return object;
}
