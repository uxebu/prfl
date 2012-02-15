var expect = require('expect.js');
var sinon = require('sinon');

suite('wrapping functionality', function() {
  test('The return value of a wrapped function is passed through', function() {
    var func = wrap(function() {
      return 1;
    });

    expect(func()).to.be(1);
  });

  test('A wrapped function is invoked in the correct context', function() {
    var spy = sinon.spy();
    var func = wrap(spy);
    var context = {};

    func.call(context);
    expect(spy.calledOn(context)).to.be.ok();
  });

  test('A wrapped function receives the arguments passed to the wrapper', function() {
    var spy = sinon.spy();
    var func = wrap(spy);
    var object = {};

    func(1, 'foo', object);
    expect(spy.calledWith(1, 'foo', object)).to.be.ok();
  });
});

function wrap(func) {
  return function() {
    return func.apply(this, arguments);
  };
}

suite('patch functionality', function() {
  test('A patched method is overwritten', function() {
    var method = function() {};
    var object = {method: method};
    patch(object, 'method');

    expect(object.method).not.to.be(method);
  });

  test('A patched method is still invoked', function() {
    var method = sinon.spy();
    var object = {method: method};
    patch(object, 'method');
    object.method();

    expect(method.called).to.be.ok();
  });
});

function patch(object, methodName) {
  object[methodName] = wrap(object[methodName]);
}
