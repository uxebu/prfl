var expect = require('expect.js');
var sinon = require('sinon');

suite('Function wrapping functionality', function() {
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
});

suite('Method wrapping functionality', function() {
  test('A patched method is overwritten', function() {
    var method = function() {};
    var object = {method: method};
    new Profiler().wrapMethod('object', object, 'method');

    expect(object.method).not.to.be(method);
  });

  test('A patched method is still invoked', function() {
    var method = sinon.spy();
    var object = {method: method};
    new Profiler().wrapMethod('object', object, 'method');
    object.method();

    expect(method.called).to.be.ok();
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

  test('Outer function total time is the sum of self time and inner function total time', function() {
    function wait(miliseconds) {
      var end = new Date().getTime() + miliseconds;
      while (new Date().getTime() < end) {}
    }

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
});

function Profiler() {
  this.samples = {};
  this.totalTimesStack = [0];
  this.totalTimesStack.lastIndex = 0;
}

Profiler.prototype = {
  addSample: function(name, totalTime, selfTime) {
    var samples = this.samples;
    var functionSamples = (samples[name] || (samples[name] = {totalTimes: [], selfTimes: []}));
    functionSamples.totalTimes.push(totalTime);
    functionSamples.selfTimes.push(selfTime);
  },

  getReport: function() {
    var report = {}, samples = this.getSamples();
    var sum = this.sum;
    for (var name in samples) {
      if (samples.hasOwnProperty(name)) {
        var functionSamples = samples[name];
        report[name] = {
          calls: functionSamples.totalTimes.length,
          selfTime: sum(functionSamples.selfTimes),
          totalTime: sum(functionSamples.totalTimes)
        };
      }
    }

    return report;
  },

  getSamples: function() {
    return this.samples;
  },

  getTime: Date.now || function() { return new Date().getTime(); },

  sum: function(iterable) {
    var i = 0, len = iterable.length, sum = 0;
    while (i < len) {
      sum += iterable[i++];
    }

    return sum;
  },

  wrapFunction: function(name, func) {
    var profiler = this;
    var getTime = this.getTime, totalTimesStack = this.totalTimesStack;
    return function() {
      totalTimesStack.push(0);
      totalTimesStack.lastIndex++;
      var start = getTime();
      var returnValue = func.apply(this, arguments);
      var time = getTime() - start;
      profiler.addSample(name, time, time - totalTimesStack.pop());
      var lastIndex = totalTimesStack.lastIndex -= 1;
      totalTimesStack[lastIndex] += time;
      return returnValue;
    };
  },

  wrapMethod: function(objectName, object, methodName) {
    object[methodName] = this.wrapFunction(
      objectName + '.' + methodName,
      object[methodName]
    );
  },

  wrapObject: function(objectName, object, seenObjects) {
    if (seenObjects) {
      if (seenObjects.indexOf(object) !== -1) {
        return object;
      }
      seenObjects.push(object);
    } else {
      seenObjects = [object];
    }

    if (typeof object === 'function') {
      this.wrapObject(objectName + '.prototype', object.prototype, seenObjects);
    }

    var names = Object.keys(object);
    for (var i = 0, len = names.length; i < len; i++) {
      var key = names[i], value = object[key];
      switch(typeof value) {
        case 'function':
          this.wrapMethod(objectName, object, key);
        // fallthrough intended
        case 'object':
          if (value !== null) {
            this.wrapObject(objectName + '.' + key, value, seenObjects);
          }
          break;
      }
    }

    return object;
  }
};
