var revolt = require('revolt');
var jsonParser = require('revolt-json-parser');
var Rx = require('rx');
var Action = require('./action');

var Siren = module.exports = function(current) {
  if (!(this instanceof Siren)) {
    return new Siren(current);
  }

  this.client = revolt().use(jsonParser);
  this.current = current;
};

Siren.prototype.load = function(url) {
  var self = this;

  this.current = this.client.get(url)
    .map(function(env) {
      env.siren = self;
      return env;
    });

  return this;
};

Siren.prototype.link = function(rel, title) {
  var self = this;
  this.current = this.current.flatMap(function(env) {
    var entity = env.response.body;

    var links = entity.links.filter(function(link) {
      return link.rel.indexOf(rel) > -1
        && (!title || link.title === title);
    }).map(function(link) {
      return self.client.get(link.href);
    });

    return Rx.Observable.concat(links);
  });

  return this;
};

Siren.prototype.entity = function(filter) {
  var self = this;

  this.current = this.current.flatMap(function(env) {
    var entity = env.response.body;
    var entities = entity.entities.filter(filter).map(function(e) {
      var link = e.links.filter(function(link) {
        return link.rel.indexOf('self') > -1;
      })[0];

      return self.client.get(link.href);
    });


    return Rx.Observable.concat(entities);
  });

  return this;
};

Siren.prototype.action = function(name, cb) {
  var self = this;

  this.current = this.current.flatMap(function(env) {
    var entity = env.response.body;
    if (entity.actions) {
      var actions = entity.actions.filter(function(action) {
        return action.name === name;
      });

      if (actions.length) {
        var action = new Action(self.client, actions[0]);
        return cb(action);
      }
    }
  });

  return this;
};

Siren.prototype.monitor = function() {
  this.current = this.current.flatMap(function(env) {
    return Rx.Observable.create(function(observer) {
      env.response.on('message', function(msg) {
        observer.onNext(msg);
      });
      env.response.on('close', function() {
        observer.onCompleted();
      });
      env.response.on('error', function(err) {
        observer.onError(err);
      });

      return function() {
        env.response.close();
      };
    });
  });

  return this;
};

var subscriptionFns = ['subscribe', 'subscribeOnNext', 'subscribeOnError',
  'subscribeOnCompleted', 'subscribeOn'];

subscriptionFns.forEach(function(m) {
  Siren.prototype[m] = function() {
    var args = Array.prototype.slice.call(arguments);
    return this.current[m].apply(this.current, args);
  }
});

var operators = [
  'amb', 'and', 'asObservable', 'average', 'buffer',
  'bufferWithCount', 'bufferWithTime', 'bufferWithTimeOrCount',
  'catch', 'catchError', 'combineLatest', 'concat', 'concatAll',
  'concatMap', 'concatMapObserver', 'connect', 'contains',
  'controlled', 'count', 'debounce', 'debounceWithSelector',
  'defaultIfEmpty', 'delay', 'delayWithSelector', 'dematerialize',
  'distinct', 'distinctUntilChanged', 'do', 'doOnNext',
  'doOnError', 'doOnCompleted', 'doWhile', 'elementAt',
  'elementAtOrDefault', 'every', 'expand', 'filter', 'finally',
  'ensure', 'find', 'findIndex', 'first', 'firstOrDefault',
  'flatMap', 'flatMapObserver', 'flatMapLatest', 'forkJoin',
  'groupBy', 'groupByUntil', 'groupJoin', 'ignoreElements',
  'indexOf', 'isEmpty', 'join', 'jortSort', 'jortSortUntil',
  'last', 'lastOrDefault', 'let', 'letBind', 'manySelect', 'map',
  'max', 'maxBy', 'merge', 'mergeAll', 'min', 'minBy', 'multicast',
  'observeOn', 'onErrorResumeNext', 'pairwise', 'partition',
  'pausable', 'pausableBuffered', 'pluck', 'publish', 'publishLast',
  'publishValue', 'share', 'shareReplay', 'shareValue', 'refCount',
  'reduce', 'repeat', 'replay', 'retry', 'sample', 'scan', 'select',
  'selectConcat', 'selectConcatObserver', 'selectMany',
  'selectManyObserver', 'selectSwitch', 'sequenceEqual', 'single',
  'singleOrDefault', 'skip', 'skipLast', 'skipLastWithTime',
  'skipUntil', 'skipUntilWithTime', 'skipWhile', 'some', 'startWith',
  /*'subscribe', 'subscribeOnNext', 'subscribeOnError',
  'subscribeOnCompleted', 'subscribeOn', */ 'sum', 'switch',
  'switchLatest', 'take', 'takeLast', 'takeLastBuffer',
  'takeLastBufferWithTime', 'takeLastWithTime', 'takeUntil',
  'takeUntilWithTime', 'takeWhile', 'tap', 'tapOnNext', 'tapOnError',
  'tapOnCompleted', 'throttleFirst', 'throttleWithTimeout',
  'timeInterval', 'timeout', 'timeoutWithSelector', 'timestamp',
  'toArray', 'toMap', 'toSet', 'transduce', 'where', 'window',
  'windowWithCount', 'windowWithTime', 'windowWithTimeOrCount', 'zip'
]

operators.forEach(function(m) {
  Siren.prototype[m] = function() {
    var args = Array.prototype.slice.call(arguments);
    this.current = this.current[m].apply(this.current, args);

    return this;
  };
});
