/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// --- Imports ---
const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

// --- Configuration ---
const PORT = process.env.PORT || 3001;
const ISSUER_PRIVATE_KEY = process.env.ISSUER_PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const BASE_SEPOLIA_RPC_URL = 'https://sepolia.base.org';

if (!ISSUER_PRIVATE_KEY || !CONTRACT_ADDRESS) {
  console.error("Missing required environment variables. Make sure ISSUER_PRIVATE_KEY and CONTRACT_ADDRESS are in your .env file.");
  process.exit(1);
}

// --- Contract ABI (Must match KycVault.sol) ---
const kycVaultAbi = [
  // CORRECTED: Removed the extra 'address issuer' argument. The contract knows the issuer via msg.sender.
  "function addVerification(address user, bytes32 verificationHash, uint256 expiry, bytes calldata issuerSig)",
  "function revokeVerification(address user)",
  "function isVerified(address user) view returns (bool)",
  "event KYCAdded(address indexed user, address indexed issuer, uint256 expiry)",
  "event KYCRevoked(address indexed user, address indexed issuer)"
];

// --- Ethers.js Setup ---
const provider = new ethers.JsonRpcProvider(BASE_SEPOLIA_RPC_URL);
const issuerWallet = new ethers.Wallet(ISSUER_PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, kycVaultAbi, issuerWallet);
console.log(`[+] Issuer wallet address: ${issuerWallet.address}`);
console.log(`[+] Interacting with contract at: ${CONTRACT_ADDRESS}`);


// --- SQLite Database Setup ---
const db = new sqlite3.Database('./kyc.db', (err) => {
  if (err) {
    console.error("[-] Error opening database", err.message);
  } else {
    console.log("[+] Connected to the SQLite database.");
    db.run(`CREATE TABLE IF NOT EXISTS verifications (
      wallet TEXT PRIMARY KEY,
      hash TEXT,
      expiry INTEGER,
      txHash TEXT,
      status TEXT
    )`);
  }
});

// --- Express App Setup ---
const app = express();
const upload = multer();

app.use(cors());
app.use(express.json());

// --- Internal Verification Logic ---

/**
 * Creates the hash and signature required for the addVerification contract call.
 * @param {string} walletAddress The user's wallet address.
 * @param {number} expiry The Unix timestamp for when the verification expires.
 * @returns {Promise<{verificationHash: string, signature: string}>}
 */
async function createVerificationPayload(walletAddress, expiry) {
    // The hash must be identical to the one created in the smart contract
    const verificationHash = ethers.solidityPackedKeccak256(
      ['address', 'address', 'uint256'],
      [issuerWallet.address, walletAddress, expiry]
    );

    const signature = await issuerWallet.signMessage(ethers.getBytes(verificationHash));
    console.log(`[+] Generated signature for ${walletAddress}`);
    return { verificationHash, signature };
}

async function processVerification(walletAddress) {
  console.log(`[+] Starting on-chain verification for ${walletAddress}...`);
  try {
    const expiry = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60); // 1 year

    const { verificationHash, signature } = await createVerificationPayload(walletAddress, expiry);

    // CORRECTED: Call the contract with the correct 4 arguments.
    const tx = await contract.addVerification(walletAddress, verificationHash, expiry, signature);
    console.log(`[+] Sent transaction to add verification: ${tx.hash}`);
    await tx.wait();
    console.log(`[+] Transaction confirmed for ${walletAddress}`);

    const sql = `UPDATE verifications SET status = ?, hash = ?, expiry = ?, txHash = ? WHERE wallet = ?`;
    db.run(sql, ['Verified', verificationHash, expiry, tx.hash, walletAddress], (err) => {
      if(err) console.error("DB Update Error:", err);
    });

  } catch (error) {
    console.error(`[-] On-chain verification failed for ${walletAddress}:`, error);
    db.run(`UPDATE verifications SET status = ? WHERE wallet = ?`, ['Failed', walletAddress], (err) => {
       if(err) console.error("DB Update Error:", err);
    });
  }
}

// --- API Endpoints ---

app.post('/kyc/submit', upload.single('document'), (req, res) => {
  const { walletAddress } = req.body;
  if (!walletAddress || !ethers.isAddress(walletAddress)) {
    return res.status(400).json({ error: 'Valid walletAddress is required.' });
  }

  // Check if a verification is already in progress or completed
  const checkSql = `SELECT status FROM verifications WHERE wallet = ?`;
  db.get(checkSql, [walletAddress], (err, row) => {
      if (err) {
          return res.status(500).json({ error: 'Database error.' });
      }
      if (row && (row.status === 'Pending' || row.status === 'Verified')) {
          return res.status(409).json({ error: `A verification for this wallet is already ${row.status}.` });
      }

      // If no existing record or it's 'Failed'/'None', proceed
      console.log(`[+] Received KYC submission for wallet: ${walletAddress}`);
      const insertSql = `INSERT OR REPLACE INTO verifications (wallet, status) VALUES (?, ?)`;
      db.run(insertSql, [walletAddress, 'Pending']);
      
      // Simulate async document check before sending to blockchain
      setTimeout(() => processVerification(walletAddress), 5000); 
      
      res.status(202).json({ 
        wallet: walletAddress,
        status: 'Pending',
        message: 'Submission received. Verification is in progress.'
      });
  });
});

app.get('/kyc/status/:wallet', (req, res) => {
  const { wallet } = req.params;
  if (!ethers.isAddress(wallet)) {
    return res.status(400).json({ error: 'Invalid wallet address provided.' });
  }

  const sql = `SELECT * FROM verifications WHERE wallet = ?`;
  db.get(sql, [wallet], async (err, row) => {
    if (err) {
      console.error(`Database error for ${wallet}:`, err);
      return res.status(500).json({ error: 'Failed to retrieve status.' });
    }

    if (row) {
      // If the DB has a definitive status (anything but 'None'), return it.
      return res.json({
        wallet: wallet,
        status: row.status,
        expiry: row.expiry || null,
        txHash: row.txHash || null,
      });
    } else {
      // If user is not in our DB at all, they have no status.
      return res.json({
        wallet: wallet,
        status: 'None'
      });
    }
    // Note: On-chain check is removed here because the DB is now the primary source of truth after submission.
    // A more advanced system might re-sync with the chain periodically.
  });
});

// --- Server Start ---
app.listen(PORT, () => {
  console.log(`KYC Gateway server running on http://localhost:${PORT}`);
});