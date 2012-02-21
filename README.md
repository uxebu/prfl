prfl
================================================================================

prfl is a simple JavaScript based profiling tool. It can record total time and
self time for every wrapped function.


Basic Usage
--------------------------------------------------------------------------------

~~~
// create a profiler object
var profiler = new prfl.Profiler();

// wrap single functions
myFunction = profiler.wrapFunction('myFunction', myFunction);

// wrap single methods
profiler.wrapMethod('myModule', myModule, 'myMethod');

// wrap whole objects (wraps methods and sub-objects)
profiler.wrapObject('myModule', myModule);

// works with constructors and their prototypes, too
profiler.wrapObject('MyConstructor', MyConstructor);

/*
  program runs here
*/

profiler.getReport(); /* ->
  {
    'myFunction': {
      calls: number of calls,
      selfTime: aggregated self time,
      totalTime: aggregated total time
    },

    ...

    'MyConstructor': { calls: ... },
    'MyConstructor.prototype.stuff': { calls: ... }

    etc.
  }
*/
~~~

TODO
--------------------------------------------------------------------------------

  - Continue to record when inner functions throw. Re-throw exception at the end
  - Full API documentation
