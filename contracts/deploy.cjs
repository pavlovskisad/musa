#!/usr/bin/env node
const solc = require('/opt/node22/lib/node_modules/solc');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const CONTRACTS_DIR = __dirname;

function resolveImport(importPath) {
  if (importPath.startsWith('@openzeppelin/contracts/')) {
    const rel = importPath.replace('@openzeppelin/contracts/', '');
    return path.join(CONTRACTS_DIR, 'lib/openzeppelin-contracts/contracts', rel);
  }
  if (importPath.startsWith('forge-std/')) {
    const rel = importPath.replace('forge-std/', '');
    return path.join(CONTRACTS_DIR, 'lib/forge-std/src', rel);
  }
  return path.join(CONTRACTS_DIR, importPath);
}

function readSource(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function collectSources(entryFiles) {
  const sources = {};
  const queue = [...entryFiles];
  const visited = new Set();

  while (queue.length > 0) {
    const file = queue.shift();
    const absPath = path.isAbsolute(file) ? file : path.join(CONTRACTS_DIR, file);
    const normalized = path.resolve(absPath);

    if (visited.has(normalized)) continue;
    visited.add(normalized);

    const content = readSource(normalized);
    const key = path.relative(CONTRACTS_DIR, normalized);
    sources[key] = { content };

    const importRegex = /import\s+(?:{[^}]*}\s+from\s+)?["']([^"']+)["']/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const importedPath = match[1];
      let resolved;
      if (importedPath.startsWith('.')) {
        resolved = path.resolve(path.dirname(normalized), importedPath);
      } else {
        resolved = resolveImport(importedPath);
      }
      if (!visited.has(path.resolve(resolved))) {
        queue.push(resolved);
      }
    }
  }

  return sources;
}

function compile(entryFiles) {
  const sources = collectSources(entryFiles);

  const input = {
    language: 'Solidity',
    sources,
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        '*': { '*': ['abi', 'evm.bytecode.object'] }
      }
    }
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input), {
    import: (importPath) => {
      try {
        let resolved;
        if (importPath.startsWith('@openzeppelin/') || importPath.startsWith('forge-std/')) {
          resolved = resolveImport(importPath);
        } else {
          resolved = path.join(CONTRACTS_DIR, importPath);
        }
        return { contents: readSource(resolved) };
      } catch (e) {
        return { error: `File not found: ${importPath}` };
      }
    }
  }));

  if (output.errors) {
    const fatal = output.errors.filter(e => e.severity === 'error');
    if (fatal.length > 0) {
      console.error('Compilation errors:');
      fatal.forEach(e => console.error(e.formattedMessage));
      process.exit(1);
    }
    output.errors.filter(e => e.severity === 'warning').forEach(w => {
      console.warn('Warning:', w.formattedMessage);
    });
  }

  return output.contracts;
}

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL;

  if (!privateKey || !rpcUrl) {
    console.error('Set DEPLOYER_PRIVATE_KEY and BASE_SEPOLIA_RPC_URL');
    process.exit(1);
  }

  console.log('Compiling contracts...');
  const compiled = compile(['src/Musa.sol', 'test/MockPAXG.sol']);

  const mockPaxgArtifact = compiled['test/MockPAXG.sol']['MockPAXG'];
  const musaArtifact = compiled['src/Musa.sol']['Musa'];

  console.log('Connecting to Base Sepolia...');
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const balance = await provider.getBalance(wallet.address);
  console.log(`Deployer: ${wallet.address}`);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  // Deploy MockPAXG
  console.log('\nDeploying MockPAXG...');
  const MockPAXG = new ethers.ContractFactory(
    mockPaxgArtifact.abi,
    '0x' + mockPaxgArtifact.evm.bytecode.object,
    wallet
  );
  const mockPaxg = await MockPAXG.deploy();
  await mockPaxg.waitForDeployment();
  const paxgAddr = await mockPaxg.getAddress();
  console.log(`MockPAXG deployed: ${paxgAddr}`);

  // Deploy Musa
  console.log('\nDeploying Musa...');
  const MusaFactory = new ethers.ContractFactory(
    musaArtifact.abi,
    '0x' + musaArtifact.evm.bytecode.object,
    wallet
  );
  const musa = await MusaFactory.deploy(paxgAddr);
  await musa.waitForDeployment();
  const musaAddr = await musa.getAddress();
  console.log(`Musa deployed: ${musaAddr}`);

  // Seed treasury — mint 100 PAXG and deposit
  console.log('\nSeeding treasury with 100 PAXG...');
  let tx = await mockPaxg.mint(wallet.address, ethers.parseEther('100'));
  await tx.wait();
  tx = await mockPaxg.approve(musaAddr, ethers.parseEther('100'));
  await tx.wait();
  tx = await musa.deposit(ethers.parseEther('100'));
  await tx.wait();
  console.log('Treasury seeded with 100 PAXG');

  // Verify
  const reserve = await musa.reserveBalance();
  console.log(`Reserve balance: ${ethers.formatEther(reserve)} PAXG`);

  console.log('\n══════════════════════════════════════');
  console.log('DEPLOYMENT COMPLETE');
  console.log('══════════════════════════════════════');
  console.log(`MockPAXG: ${paxgAddr}`);
  console.log(`Musa:     ${musaAddr}`);
  console.log(`Owner:    ${wallet.address}`);
  console.log(`Reserve:  ${ethers.formatEther(reserve)} PAXG`);
  console.log('══════════════════════════════════════');

  // Write addresses to .env-compatible output
  const envLine = `\nMUSA_CONTRACT_ADDRESS=${musaAddr}\nMOCK_PAXG_ADDRESS=${paxgAddr}\n`;
  console.log('\nAdd to .env:');
  console.log(envLine);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
