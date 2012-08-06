var request = require('request');
var select = require('refine').select;

function Siren() { };

Siren.prototype.request = request;
Siren.prototype.select = select;

Siren.prototype.fetch = function(entity, callback) {
  if (!entity.href) {
    callback(null, entity);
    return;
  }

  this.request(entity.href, function(err, res, body) {
    callback(err, body ? JSON.parse(body) : null);
  });
};

Siren.prototype.action = function(action, parameters, callback) {
  var hiddenFields = this.select(action.fields).where('type').equals('hidden');

  if (hiddenFields.length) {
    parameters.concat(hiddenFields);
  }

  var options = {
    uri: action.href,
    method: action.method,
  };

  if (['POST', 'PUT'].indexOf(options.method) > -1) {
    options.form = parameters;
  } else {
    var qs = require('querystring').stringify(parameters);
    options.uri = options.uri + '?' + qs;
  }

  this.request(options, function(err, res, body) {
    callback(err, body ? JSON.parse(body) : null);
  });
};

Siren.prototype.split = function(obj) {
  if (obj.rel) { obj.rel = obj.rel.split(/\s/); }
  if (obj.class) { obj.class = obj.class.split(/\s/); }

  return obj;
}

module.exports = new Siren();
