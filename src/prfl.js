(function(exports) {
  exports.Profiler = Profiler;

  function Profiler() {
    this.samples = {};
    this.totalTimesStack = [0];
    this.totalTimesStack.lastIndex = 0;
  }

  Profiler.prototype = {
    addSample: function(name, totalTime, selfTime) {
      var samples = this.samples;
      var functionSamples = samples.hasOwnProperty(name)
        ? samples[name]
        : (samples[name] = {totalTimes: [], selfTimes: []});
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
        var lastIndex, returnValue, start, time;

        // add level to total times stack for all nested functions
        totalTimesStack.push(0);
        totalTimesStack.lastIndex += 1;

        // measure time and execute wrapped function
        start = getTime();
        try {
          returnValue = func.apply(this, arguments);
        } finally {
          time = getTime() - start;
          profiler.addSample(name, time, time - totalTimesStack.pop());

          // remove level from total times stack
          lastIndex = totalTimesStack.lastIndex -= 1;

          // add time to the total times stack
          totalTimesStack[lastIndex] += time;
        }

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
      if (object === null || object === void 0) {
        return object;
      }

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
}(typeof exports !== 'undefined' ? exports : (this.prfl = {})));
