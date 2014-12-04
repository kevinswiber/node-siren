var Rx = require('rx');
var siren = require('./siren');

var display = new Rx.Subject();

siren()
  .load('http://zetta-cloud-2.herokuapp.com')
  .link('http://rels.zettajs.io/peer', 'Detroit')
  .entity(function(e) {
    return e.properties.type === 'display';
  })
  .subscribe(display);

siren(display)
  .action('change', function(action) {
    action.set('message', 'Hello world: ' + Date.now());
    return action.submit();
  })
  .subscribe(function(env) {
    console.log(env.response.statusCode === 200 ? 'success' : 'failure');
  });

siren(display)
  .link('http://rels.zettajs.io/object-stream', 'message')
  .monitor()
  .take(1)
  .subscribe(console.log);
