var Rx = require('rx');
var siren = require('./siren');

/*siren()
  .load('http://zetta-cloud-2.herokuapp.com')
  .link('http://rels.zettajs.io/peer', 'Detroit')
  .entity(function(e) {
    return e.properties.type === 'barometer';
  })
  .link('http://rels.zettajs.io/object-stream', 'pressure')
  .monitor()
  .subscribe(console.log);
  */

var subject = new Rx.Subject();

siren()
  .load('http://zetta-cloud-2.herokuapp.com')
  .link('http://rels.zettajs.io/peer', 'Detroit')
  .entity(function(e) {
    return e.properties.type === 'display';
  })
  .subscribe(subject);

siren(subject)
  .action('change', function(action) {
    action.set('message', 'Hello world: ' + Date.now());
    return action.submit();
  })
  .subscribe(function(env) {
    console.log(env.response.statusCode);
  });

siren(subject)
  .link('http://rels.zettajs.io/object-stream', 'message')
  .monitor()
  .subscribe(console.log);
