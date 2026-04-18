#!/usr/bin/env node
const solc = require('/opt/node22/lib/node_modules/solc');
const fs = require('fs');

const args = process.argv.slice(2);

if (args.includes('--version')) {
  console.log('solc, the solidity compiler commandline interface');
  console.log('Version: ' + solc.version());
  process.exit(0);
}

if (args.includes('--standard-json')) {
  let input = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => { input += chunk; });
  process.stdin.on('end', () => {
    const output = solc.compile(input);
    process.stdout.write(output);
  });
  return;
}

console.error('Unsupported solc invocation:', args.join(' '));
process.exit(1);
