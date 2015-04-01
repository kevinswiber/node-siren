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
  var current = this.current.flatMap(function(env) {
    var entity = env.response.body;

    if (entity.links) {
      var links = entity.links.filter(function(link) {
        return link.rel.indexOf(rel) > -1
          && (!title || link.title === title);
      }).map(function(link) {
        return self.client.get(link.href);
      });

      if (links.length) {
        return Rx.Observable.merge(links);
      } else {
        return Rx.Observable.throw(new Error('link not found'));
      }
    } else {
      return Rx.Observable.throw(new Error('link not found'));
    }
  });

  return new Siren(current);
};

Siren.prototype.entity = function(filter) {
  var self = this;

  var current = this.current.flatMap(function(env) {
    var entity = env.response.body;
    var entities = entity.entities.filter(filter).map(function(e) {
      var link = e.links.filter(function(link) {
        return link.rel.indexOf('self') > -1;
      })[0];

      return self.client.get(link.href);
    });


    return Rx.Observable.merge(entities);
  });

  return new Siren(current);
};

Siren.prototype.action = function(name, cb) {
  var self = this;

  var current = this.current.flatMap(function(env) {
    var entity = env.response.body;
    var actual = entity.actions[0].name;

    if (entity.actions) {
      var actions = entity.actions.filter(function(action) {
        return action.name === name;
      });

      if (actions.length) {
        var action = new Action(self.client, actions[0]);
        return cb(action);
      } else {
        return Rx.Observable.throw(new Error('action not found'));
      }
    } else {
      return Rx.Observable.throw(new Error('action not found'));
    }
  });

  return new Siren(current);
};

Siren.prototype.monitor = function() {
  var current = this.current.flatMap(function(env) {
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

  return new Siren(current);
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
    var current = this.current[m].apply(this.current, args);

    return new Siren(current);
  };
});
