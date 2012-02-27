var expect = require('expect.js');
var sinon = require('sinon');
var Profiler = require('../src/prfl').Profiler;

suite('Function wrapping functionality', function() {
  test('If the first parameter to `wrapFunction` is not a string, an error is thrown', function() {
    expect(function() {new Profiler().wrapFunction(function() {})}).to.throwException();
  });

  test('If the second parameter to `wrapFunction` is not a function, an error is thrown', function() {
    expect(function() {new Profiler().wrapFunction('a string')}).to.throwException();
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

  test('Return value of functions invoked as constructor, returning non-objects is an instance of the original function', function() {
    function Constructor() {}
    var WrappedConstructor = new Profiler().wrapFunction('constructor', Constructor);
    expect(new WrappedConstructor()).to.be.a(Constructor);
  });

  test('Return value of functions invoked as constructor, returning non-objects is an instance of the wrapper function', function() {
    function Constructor() {}
    var WrappedConstructor = new Profiler().wrapFunction('constructor', Constructor);
    expect(new WrappedConstructor()).to.be.a(WrappedConstructor);
  });

  // only applicable for ES5
  if (/\{ \[native code\] \}$/.test(Array.isArray)) {
    test('ES5: Wrappers of functions without prototype should not throw exceptions', function() {
      expect(new Profiler().wrapFunction('isArray', Array.isArray)).not.to.throwException();
    });
  }

  test('Calling a parent constructor in the context of a "subclass" instance works as expected', function() {
    var profiler = new Profiler();
    var propertyName = 'arbitraryProperty', propertyValue = 'arbitrary Value;'

    var ParentConstructor = profiler.wrapFunction('ParentConstructor', function() {
      this[propertyName] = propertyValue;
    });

    var ChildConstructor = function() {
      ParentConstructor.call(this);
    };
    ChildConstructor.prototype = new ParentConstructor;

    var WrappedChildConstructor = profiler.wrapFunction('ChildConstructor', ChildConstructor);

    var instance = new WrappedChildConstructor();
    expect(instance).to.be.a(ParentConstructor);
    expect(instance).to.have.key(propertyName);
    expect(instance[propertyName]).to.be(propertyValue);
  });

  test('Function wrappers expose properties of the wrapped function', function() {
    function testedFunction() {}
    testedFunction.nonFunctionProperty = {};

    var functionProperty = sinon.spy();
    testedFunction.functionProperty = functionProperty;

    var wrappedFunction = new Profiler().wrapFunction('testedFunction', testedFunction);
    expect(wrappedFunction.nonFunctionProperty).to.be(testedFunction.nonFunctionProperty);

    wrappedFunction.functionProperty();
    expect(functionProperty.called).to.be.ok();
  });

  test('Cyclic reference properties between a wrapped function and an object should not cause rewrapping of seen objects', function() {
    function func() {}
    var object = func.object = {func: func};

    // reaches maximum call stack when recursing infinetely
    expect(function() {
      new Profiler().wrapFunction('function', func);
    }).not.to.throwException();
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

  test('does not fail when null is passed', function() {
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

    var functionReport = report[name];
    expect(functionReport).to.have.keys('numCalls', 'selfTime', 'totalTime');
    expect(functionReport.numCalls).to.be(2);
    expect(functionReport.selfTime).to.have.keys('average', 'max', 'min', 'sum');
    expect(functionReport.selfTime.average).to.be.a('number');
    expect(functionReport.selfTime.max).to.be.a('number');
    expect(functionReport.selfTime.min).to.be.a('number');
    expect(functionReport.selfTime.sum).to.be.a('number');
    expect(functionReport.totalTime).to.have.keys('average', 'max', 'min', 'sum');
    expect(functionReport.totalTime.average).to.be.a('number');
    expect(functionReport.totalTime.max).to.be.a('number');
    expect(functionReport.totalTime.min).to.be.a('number');
    expect(functionReport.totalTime.sum).to.be.a('number');
  });

  suite('Time', function() {
    function mockTime(time) {
      var i = 0, numValues = arguments.length, values = arguments;
      return function() {
        if (i >= numValues) {
          throw RangeError('mockTime: no time entries left');
        }
        return values[i++];
      }
    }

    test('Outer function total time is the sum of self time and inner function total time', function() {

      var profiler = new Profiler();
      profiler.getTime = mockTime(
        // two times are needed for each function per call
        11000, // start outer
        12000, // start inner
        13000, // end inner
        13000, // end outer
        14000,
        14005,
        14005,
        15000
      );
      var object = {
        outerFunc: function() {
          this.innerFunc();
        },

        innerFunc: function() {}
      };

      profiler.wrapObject('object', object);
      object.outerFunc();
      object.outerFunc();

      var report = profiler.getReport();
      var reportInner = report['object.innerFunc'];
      var reportOuter = report['object.outerFunc'];

      expect(reportOuter.totalTime.sum).to.be(reportInner.totalTime.sum + reportOuter.selfTime.sum);
    });

    test('Outer function time is the sum of all inner functions total time and self time', function() {
      var profiler = new Profiler();
      profiler.getTime = mockTime(1, 2, 4, 8, 9, 12, 15, 17);

      var foo = profiler.wrapFunction('foo', function() {});
      var bar = profiler.wrapFunction('bar', function() {});
      var baz = profiler.wrapFunction('baz', function() {});

      var outerFunc = profiler.wrapFunction('outerFunc', function() {
        foo();
        bar();
        baz();
      });

      outerFunc();
      var report = profiler.getReport();
      var expectedTime = report.foo.totalTime.sum
        + report.bar.totalTime.sum
        + report.baz.totalTime.sum
        + report.outerFunc.selfTime.sum;
      expect(report.outerFunc.totalTime.sum).to.be(expectedTime);
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
