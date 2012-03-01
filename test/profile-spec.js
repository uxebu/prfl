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
    expect(functionReport.selfTime).to.have.keys('mean', 'max', 'min', 'sum');
    expect(functionReport.selfTime.mean).to.be.a('number');
    expect(functionReport.selfTime.max).to.be.a('number');
    expect(functionReport.selfTime.min).to.be.a('number');
    expect(functionReport.selfTime.sum).to.be.a('number');
    expect(functionReport.totalTime).to.have.keys('mean', 'max', 'min', 'sum');
    expect(functionReport.totalTime.mean).to.be.a('number');
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

suite('Statistics', function() {
  var profiler = new Profiler();

  test('`numCalls` is equal to the number of samples for 0 samples', function() {
    var samples = [];
    expect(profiler.statistics(samples).numCalls).to.be(samples.length);
  });


  test('`numCalls` is equal to the number of samples for a low number of samples', function() {
    var samples = [5, 13, 2, 9];
    expect(profiler.statistics(samples).numCalls).to.be(samples.length);
  });


  test('`numCalls` is equal to the number of samples for a high number of samples', function() {
    var samples = [14, 9, 4, 18, 4, 9, 18, 8, 13, 0, 17, 15, 8, 7, 15, 11, 18,
      17, 6, 13, 11, 9, 19, 17, 9, 14, 5, 19, 20, 16, 20, 14, 19, 5, 5, 20, 2,
      12, 4, 11, 19, 0, 5, 9, 16, 15, 17, 18, 6, 6, 1, 1, 18, 5, 18, 16, 15, 7,
      6, 7, 8, 16, 6, 19, 11, 5, 17, 20, 19, 9, 16, 12, 12, 4, 13, 1, 19, 19,
      16, 9, 14, 10, 0, 17, 18, 0, 6, 10, 4, 10, 9, 4, 4, 10, 2, 16, 15, 10, 9,
      11, 3, 20, 14, 18, 8, 3, 16, 1, 11, 7, 7, 17, 14, 12, 4, 15, 12, 16, 3, 6,
      15, 2, 1, 14, 8, 13, 20, 2, 4, 5, 20, 3, 2, 1, 14, 16, 2, 9, 6, 16, 3, 13,
      13, 1, 0, 10, 16, 8, 3, 16, 4, 7, 3, 7, 4, 18, 13, 6, 3, 3, 13, 2, 4, 20,
      7, 9, 15, 13, 15, 12, 12, 13, 0, 15, 6, 2, 18, 5, 17, 8, 13, 13, 19, 18,
      7, 16, 20, 10, 15, 9, 0, 5, 11, 20, 19, 17, 3, 0, 19, 1, 18, 6, 14, 3, 17,
      0, 0, 5, 8, 13, 9, 16, 14, 3, 10, 1, 3, 10, 6, 8, 5, 20, 14, 17, 13, 1,
      15, 10, 6, 17, 6, 10, 11, 4, 14, 13, 0, 3, 5, 1, 15, 0, 9, 15, 1, 5, 6,
      10, 2, 2, 2, 8, 10, 15, 15, 6, 7, 18, 20, 2, 3, 1, 14, 13, 13, 17, 4, 10,
      6, 1, 3, 0, 16, 4, 19, 13, 9, 14, 4, 7, 0, 16, 11, 2, 16, 3, 18, 16, 19,
      5, 20, 17, 16, 13, 5, 6, 7, 5, 2, 8, 11, 7, 9, 11, 10, 11, 11, 12, 3, 19,
      6, 13, 17, 18, 12, 15, 19, 11, 15, 13, 18, 0, 15, 16, 1, 1, 7, 16, 6, 9,
      6, 19, 15, 5, 1, 12, 1, 20, 15, 8, 4, 7, 7, 20, 9, 8, 13, 17, 19, 13, 2,
      10, 9, 7, 4, 5, 20, 10, 18, 17, 5, 9, 8, 11, 9, 18, 14, 8, 1, 14, 5, 0,
      20, 17, 3, 7, 8, 19, 19, 0, 10, 12, 12, 8, 19, 3, 1, 16, 19, 0, 6, 8, 14,
      13, 11, 8, 13, 0, 3, 12, 20, 4, 2, 2, 4, 12, 1, 20, 7, 18, 17, 13, 18, 19,
      9, 7, 18, 5, 8, 6, 19, 7, 8, 12, 14, 13, 8, 0, 16, 10, 16, 5, 6, 4, 15, 8,
      5, 14, 19, 19, 2, 8, 17, 8, 8, 14, 9, 7, 17, 11, 8, 19, 8, 5, 11, 18, 1,
      9, 12, 14, 0, 16, 1, 15, 12, 1, 10, 19, 17, 4, 4, 8, 4, 10, 8, 20, 20, 15,
      5, 0, 5, 15, 2, 20, 19, 4, 12, 2, 12, 9, 19, 11, 2, 12, 17, 1, 15, 1, 18,
      0, 10, 12, 19, 10, 2, 14, 7, 2, 20, 3, 0, 3, 15, 0, 2, 11, 7, 1];
    expect(profiler.statistics(samples).numCalls).to.be(samples.length);
  });

  test('`mean` holds the average of all samples', function() {
    expect(profiler.statistics([3, 5, 2, 1, 0, 2, 2, 5]).mean).to.be(2.5);
  });

  test('`mean` for an empty sample set is undefined', function() {
    expect(profiler.statistics([]).mean).to.be(void 0);
  });

  test('`max` holds the maximum value', function() {
    expect(profiler.statistics([0, 9, -2, 14, 1, 0]).max).to.be(14);
  });

  test('`max` for an empty sample set is undefined', function() {
    expect(profiler.statistics([]).max).to.be(void 0);
  });

  test('`min` holds the minimum value', function() {
    expect(profiler.statistics([0, 9, -2, 14, 1, 0]).min).to.be(-2);
  });

  test('`min` for an empty sample set is undefined', function() {
    expect(profiler.statistics([]).min).to.be(void 0);
  });

  test('`median` is computed correctly for sets with odd length', function() {
    expect(profiler.statistics([2, 0, 1, 5, 4]).median).to.be(2);
  });

  test('`median` is computed correctly for sets with even length', function() {
    expect(profiler.statistics([2, 0, 1, 5, 4, 3]).median).to.be(2.5);
  });

  test('`median` of an empty sample set is undefined', function() {
    expect(profiler.statistics([]).median).to.be(void 0);
  });

  test('`sum` is equal to the sum of all samples', function() {
    expect(profiler.statistics([4, 2, 5]).sum).to.be(11);
  });

  test('`sum` of an empty sample set is undefined', function() {
    expect(profiler.statistics([]).sum).to.be(void 9);
  });
});
