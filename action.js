var querystring = require('querystring');

var Action = module.exports = function(client, data) {
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
    uri: href
  };

  if (body) {
    options.body = body;
    options.headers = {
      'Content-Type': type,
      'Content-Length': body.length
    }
  }

  return this._client.request(options);
};
