#!/usr/bin/env node
var argv = require('yargs/yargs')(process.argv.slice(2))
    .boolean(['o'])
    .describe('only')
    .argv
;
console.dir([ argv.o ]);
// console.dir(argv._);