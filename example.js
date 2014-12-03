var siren = require('./siren');

siren()
  .load('http://zetta-cloud-2.herokuapp.com')
  .link('http://rels.zettajs.io/peer', 'Detroit')
  .entity(function(e) {
    return e.properties.type === 'barometer';
  })
  .link('http://rels.zettajs.io/object-stream', 'pressure')
  .monitor()
  .subscribe(console.log);

