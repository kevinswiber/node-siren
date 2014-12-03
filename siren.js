var querystring = require('querystring');
var url = require('url');
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
    });
  });

  return this;
};

Siren.prototype.subscribe = function(observer) {
  return this.current.subscribe(observer);
};

function Action(client, data) {
  this._client = client;
  this._data = data;
};

Action.prototype.available = function(name) {
  var fields = this._data.fields.filter(function(field) {
    return field.name === name;
  })

  return fields.length === 1;
};

Action.prototype.set = function(name, value) {
  if (this._data.fields) {
    var fields = this._data.fields.filter(function(field) {
      return field.name === name;
    })

    if (fields.length === 1) {
      fields[0].value = value;
    }
  }
};

Action.prototype.get = function(name) {
  var fields = this._data.fields.filter(function(field) {
    return field.name === name;
  })

  if (fields.length === 1) {
    return fields[0];
  }
};

Action.prototype.submit = function() {
  var method = this._data.method || 'GET';
  var href = this._data.href;
  var type = this._data.type || 'application/x-www-form-urlencoded';
  var body;

  if (this._data.fields) {
    var obj = {};
    var actionData = this._data.fields.forEach(function(field) {
      obj[field.name] = field.value;
    });


    if (method.toUpperCase() === 'GET') {
      var parsed = url.parse(href);
      var q = parsed.query || {};
      Object.keys(obj).forEach(function(key) {
        q[key] = obj[key];
      });

      parsed.query = q;

      href = url.format(parsed);
    } else {
      if (type === 'application/x-www-form-urlencoded') {
        body = querystring.stringify(obj);
      } else if (type === 'application/json') {
        body = JSON.stringify(obj);
      } else {
        body = new Buffer(obj);
      }
    }
  }

  var options = {
    method: method,
    uri: href,
    headers: {
      'Content-Type': type
    },
    body: body
  };

  return this._client.request(options);
};
