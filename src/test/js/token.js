let unserialize = require('locutus/php/var/unserialize')
let ts =
  'a:2:{s:9:"client.bs";' +
  's:64:"4777395121a7f234e16b0637993d07cf2b51e34ce6294759839db1addba29600";' +
  's:14:"client.pc.mini";' +
  's:64:"84731d855d5437f613d9f01f472c92036a77935459ae528fe3b7a1768239c7e1";}'

let t = unserialize(ts)
console.log(t['client.bs'])
