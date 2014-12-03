var revolt = require('revolt');
var jsonParser = require('revolt-json-parser');
var Rx = require('rx');

var Siren = module.exports = function() {
  if (!(this instanceof Siren)) {
    return new Siren();
  }

  this.client = revolt().use(jsonParser);
  this.current = this.client;
};

Siren.prototype.load = function(url) {
  this.current = this.client.get(url);

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
    });
  });

  return this;
};

Siren.prototype.subscribe = function(observer) {
  return this.current.subscribe(observer);
};

