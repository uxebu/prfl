var expect = require('expect.js');
var sinon = require('sinon');

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

  test('The return value of a patched method is passed through', function() {
    var method = function() {
      return 1;
    };
    var object = {method: method};
    patch(object, 'method');

    expect(object.method()).to.be(1);
  });

  test('A patched method is invoked in the correct context', function() {
    var method = sinon.spy();
    var object = {method: method};
    patch(object, 'method');
    object.method();

    expect(method.calledOn(object)).to.be.ok();
  });

  test('A patched method receives the arguments passed to the wrapper', function() {
    var method = sinon.spy();
    var object = {method: method};
    patch(object, 'method');

    object.method(1, 'foo', object);
    expect(method.calledWith(1, 'foo', object)).to.be.ok();
  });
});


function patch(object, name) {
  var patched = object[name];
  object[name] = function() {
    return patched.apply(this, arguments);
  };
}

