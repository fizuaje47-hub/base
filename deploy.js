/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const { ethers } = require('ethers');
const fs = require('fs');
require('dotenv').config();

// --- Configuration ---
const ISSUER_PRIVATE_KEY = process.env.ISSUER_PRIVATE_KEY;
const BASE_SEPOLIA_RPC_URL = 'https://sepolia.base.org';

if (!ISSUER_PRIVATE_KEY) {
  console.error("Missing ISSUER_PRIVATE_KEY in your .env file");
  process.exit(1);
}

// --- Ethers.js Setup ---
const provider = new ethers.JsonRpcProvider(BASE_SEPOLIA_RPC_URL);
const wallet = new ethers.Wallet(ISSUER_PRIVATE_KEY, provider);

// --- Contract Artifacts ---
// This ABI must exactly match the one in server.js and the compiled KycVault.sol contract.
const contractAbi = [
  "constructor()",
  // CORRECTED: The function signature now matches the server's ABI.
  "function addVerification(address user, bytes32 verificationHash, uint256 expiry, bytes calldata issuerSig)",
  "function isVerified(address user) view returns (bool)",
  "function revokeVerification(address user)",
  "event KYCAdded(address indexed user, address indexed issuer, uint256 expiry)",
  "event KYCRevoked(address indexed user, address indexed issuer)"
];

// NOTE: Replace this with the actual bytecode from your compiled contract.
// This bytecode is for the specific KycVault.sol provided. If you change the contract, you MUST recompile and update this.
const contractBytecode = fs.readFileSync('./bytecode.hex', 'utf8');

async function main() {
  console.log(`Deploying contract from account: ${wallet.address}`);

  const balance = await provider.getBalance(wallet.address);
  console.log(`Account balance: ${ethers.formatEther(balance)} ETH`);

  if (balance === 0n) {
    console.error("Error: Account has no funds. Please fund your account with Base Sepolia ETH.");
    console.log("You can use a faucet like https://www.buildonbase.org/faucet");
    return;
  }

  const KycVaultFactory = new ethers.ContractFactory(contractAbi, contractBytecode, wallet);

  console.log('Deploying KycVault...');
  try {
    const contract = await KycVaultFactory.deploy();
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();

    console.log(`\n✅ KycVault contract deployed successfully!`);
    console.log(`Contract Address: ${contractAddress}`);
    console.log(`\nNext Steps:`);
    console.log(`1. Copy this contract address.`);
    console.log(`2. Paste it into your .env file as the value for CONTRACT_ADDRESS.`);
    console.log(`3. Start the backend server with 'npm start'.`);
    console.log(`4. Open index.html in your browser.`);

  } catch (error) {
    console.error("\n❌ Deployment failed:");
    console.error(error);
  }
}

main();