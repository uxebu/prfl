var expect = require('expect.js');
var sinon = require('sinon');
var Profiler = require('../src/prfl').Profiler;

suite('Function wrapping functionality', function() {
  test('If the first parameter to `wrapFunction` is not a string, an error is thrown', function() {
    expect(function() {new Profiler().wrapFunction(function() {})}).to.throwException();
  });

  test('The return value of a wrapped function is passed through', function() {
    var func = new Profiler().wrapFunction('no name', function() {
      return 1;
    });

    expect(func()).to.be(1);
  });

  test('A wrapped function is invoked in the correct context', function() {
    var spy = sinon.spy();
    var func = new Profiler().wrapFunction('no name', spy);
    var context = {};

    func.call(context);
    expect(spy.calledOn(context)).to.be.ok();
  });

  test('A wrapped function receives the arguments passed to the wrapper', function() {
    var spy = sinon.spy();
    var func = new Profiler().wrapFunction('no name', spy);
    var object = {};

    func(1, 'foo', object);
    expect(spy.calledWith(1, 'foo', object)).to.be.ok();
  });

  test('Using "constructor" as identifier should not throw an error', function() {
    var wrappedFunction = new Profiler().wrapFunction('constructor', function() {});
    expect(wrappedFunction).not.to.throwException();
  });

  test('A wrapped function is invoked as constructor if the wrapper is invoked as constructor', function() {
    var spy = sinon.spy();
    var wrappedFunction = new Profiler().wrapFunction('constructor', spy);
    new wrappedFunction();

    expect(spy.calledWithNew()).to.be.ok();
  });

  test('Arguments are passed to the wrapped function when called as constructor', function() {
    var spy = sinon.spy();
    var wrappedFunction = new Profiler().wrapFunction('constructor', spy);
    var a = 'a';
    var b = {};
    new wrappedFunction(a, b);

    expect(spy.calledWith(a, b)).to.be.ok();
  });

  test('Return values of functions returning non-objects are not returned when invoked as constructor', function() {
    var a = 'a';
    var mock = sinon.mock().returns(a);
    var wrappedFunction = new Profiler().wrapFunction('constructor', mock);
    expect(new wrappedFunction()).not.to.be(a);
  });

  test('Return values of functions returning objects are returned when invoked as constructor', function() {
    var a = {};
    var mock = sinon.mock().returns(a);
    var wrappedFunction = new Profiler().wrapFunction('constructor', mock);
    expect(new wrappedFunction()).to.be(a);
  });

  test('Return values of functions invoked as constructor, returning non-objects is an instance of the constructor', function() {
    function Constructor() {}
    var WrappedConstructor = new Profiler().wrapFunction('constructor', Constructor);
    expect(new WrappedConstructor()).to.be.a(Constructor);
  });
});

suite('Object wrapping functionality', function() {
  test('All methods of an object are wrapped', function() {
    function foo() {}
    function bar() {}
    function baz() {}
    var object = {foo: foo, bar: bar, baz: baz};

    new Profiler().wrapObject('object', object);

    expect(object.foo).not.to.be(foo);
    expect(object.bar).not.to.be(bar);
    expect(object.baz).not.to.be(baz);
  });

  test('The object itself is returned', function() {
    var object = {};
    expect(new Profiler().wrapObject('object', object)).to.be(object);
  });

  test('Non-functions are not wrapped', function() {
    var object= {arbitraryKey: 'arbitraryNonFunction'};
    new Profiler().wrapObject('object', object);
    expect(object.arbitraryKey).to.be('arbitraryNonFunction');
  });

  test('Wrapping works on sub-objects', function() {
    function foo() {}
    var object = {sub: {foo: foo}};
    new Profiler().wrapObject('object', object);
    expect(object.sub.foo).not.to.equal(foo);
  });

  test('Don\'t rewrap seen objects', function() {
    var object = {};
    object.recursion = object;
    // reaches maximum call stack when recursing infinetely
    expect(function() {
      new Profiler().wrapObject('object', object);
    }).not.to.throwException();
  });

  test('wraps methods of functions', function() {
    function foo() {}
    function bar() {}
    foo.bar = bar;
    new Profiler().wrapObject('foo', {foo: foo});
    expect(foo.bar).not.to.be(bar);
  });

  test('wraps function prototype object', function() {
    function Foo() {}
    function bar() {}
    Foo.prototype.bar = bar;

    new Profiler().wrapObject('Foo', Foo);
    expect(Foo.prototype.bar).not.to.be(bar);
  });

  test('does not fail when undefined is passed', function() {
    expect(function() { new Profiler().wrapObject('undefined'); }).not.to.throwException();
  });

  false&&test('does not fail when null is passed', function() {
    expect(function() { new Profiler().wrapObject('null', null); }).not.to.throwException();
  });
});

suite('Profiler', function() {
  test('getSamples() should return an object', function() {
    expect(new Profiler().getSamples()).to.be.an('object');
  });

  test('calling a wrapped function should add an entry to the samples', function() {
    var profiler = new Profiler();
    var name = 'name';
    profiler.wrapFunction(name, function() {})();
    expect(profiler.getSamples()).to.only.have.key(name);
  });

  test('calling a wrapped function twice should only add one entry to the samples', function() {
    var profiler = new Profiler();
    var name = 'arbitrary name';
    var wrappedFunction = profiler.wrapFunction(name, function() {});
    wrappedFunction();
    wrappedFunction();
    expect(profiler.getSamples()).to.only.have.key(name);
  });

  suite('The number of samples in a record entry is equal to the number of corresponding calls', function() {
    var i, times = [1, 10, 1000];
    while ((i = times.pop())) {
      test(['Record ', ' samples for ', ' calls'].join(i), function(i) {
        return function() {
          var profiler = new Profiler();
          var name = 'arbitrary name';
          var wrappedFunction = profiler.wrapFunction(name, function() {});
          for (var j = 0; j < i; j++) {
            wrappedFunction();
          }
        expect(profiler.getSamples()[name].totalTimes).to.have.length(i);
        }
      }(i));
    }
  });

  test('Sample entries have the expected structure', function() {
    var profiler = new Profiler();
    var name = 'function';
    var wrappedFunction = profiler.wrapFunction(name, function() {});
    wrappedFunction();
    wrappedFunction();
    var samples = profiler.getSamples();

    expect(samples).to.only.have.key(name);
    expect(samples[name]).to.have.key('totalTimes');
    expect(samples[name]).to.have.key('selfTimes');
    expect(samples[name].totalTimes).to.have.length(2);
    expect(samples[name].selfTimes).to.have.length(2);
  });

  test('Reports have the expected structure', function() {
    var profiler = new Profiler();
    var name = 'function';
    var wrappedFunction = profiler.wrapFunction(name, function() {});

    wrappedFunction();
    wrappedFunction();

    var report = profiler.getReport();
    expect(report).to.be.an('object');
    expect(report).to.only.have.key(name);
    expect(report[name]).to.have.key('calls');
    expect(report[name]).to.have.key('selfTime');
    expect(report[name]).to.have.key('totalTime');
    expect(report[name].calls).to.be(2);
    expect(report[name].selfTime).to.be.a('number');
    expect(report[name].totalTime).to.be.a('number');
  });

  suite('Time', function() {
    function wait(miliseconds) {
      var end = new Date().getTime() + miliseconds;
      while (new Date().getTime() < end) {}
    }

    test('Outer function total time is the sum of self time and inner function total time', function() {

      var profiler = new Profiler();
      var object = {
        outerFunc: function() {
          wait(3);
          this.innerFunc();
        },

        innerFunc: function() {
          wait(7);
        }
      };

      profiler.wrapObject('object', object);
      object.outerFunc();
      object.outerFunc();

      var report = profiler.getReport();
      var reportInner = report['object.innerFunc'];
      var reportOuter = report['object.outerFunc'];

      expect(reportOuter.totalTime).to.be(reportInner.totalTime + reportOuter.selfTime);
    });

    test('Outer function time is the sum of all inner functions total time and self time', function() {
      var profiler = new Profiler();
      var foo = profiler.wrapFunction('foo', function() { wait(2); });
      var bar = profiler.wrapFunction('bar', function() { wait(3); });
      var baz = profiler.wrapFunction('baz', function() { wait(5); });

      var outerFunc = profiler.wrapFunction('outerFunc', function() {
        foo();
        bar();
        baz();
        wait(1);
      });

      outerFunc();
      var report = profiler.getReport();
      var expectedTime = report.foo.totalTime
        + report.bar.totalTime
        + report.baz.totalTime
        + report.outerFunc.selfTime;
      expect(report.outerFunc.totalTime).to.be(expectedTime);
    });
  });

  test('Samples have entries for functions that throw', function() {
    var profiler = new Profiler();
    var throwingFunc = sinon.stub().throws();
    var functionName = 'throwingFunc';
    throwingFunc = profiler.wrapFunction(functionName, throwingFunc);
    try {
      throwingFunc();
    } catch (e) {}

    var samples = profiler.getSamples();
    expect(samples).to.have.key(functionName);
    expect(samples[functionName].totalTimes).to.have.length(1);
  });

  test('Samples have entries for outer functions if inner functions throw', function() {
    var profiler = new Profiler();
    var innerFunction = profiler.wrapFunction('innerFunction', sinon.stub().throws());
    var outerFunctionName = 'outerFunction';
    var outerFunction = profiler.wrapFunction(outerFunctionName, function() { innerFunction(); });

    try {
      outerFunction();
    } catch (e) {}

    var samples = profiler.getSamples();
    expect(samples).to.have.key(outerFunctionName);
    expect(samples[outerFunctionName].totalTimes).to.have.length(1);
  });

  test('Expect throwing functions to throw when wrapped', function() {
    var profiler = new Profiler();
    var throwingFunction = profiler.wrapFunction('throwingFunction', sinon.stub().throws());

    expect(throwingFunction).to.throwException();
  });

});
