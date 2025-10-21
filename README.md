# KYC Vault - Full-Stack dApp

KYC Vault is a decentralized compliance application for securely managing and reusing your identity on the Base Blockchain. This repository contains the complete full-stack application: a Solidity smart contract, a Node.js backend server, and a React frontend.

## Features

-   **One-Time Verification**: Users complete a KYC process once.
-   **On-Chain Re-use**: Verified status is stored on the blockchain, allowing dApps to check status without re-collecting sensitive user data.
-   **Secure & Private**: The backend, controlled by the issuer, handles document verification. Only the final verification status is recorded on-chain.
-   **Real-time Updates**: The frontend polls the backend for status changes, providing a seamless user experience.
-   **Decentralized**: Built for the Base ecosystem, leveraging Ethereum's security.

## Project Structure

```
.
├── KycVault.sol       # The Solidity smart contract
├── README.md          # This setup guide
├── bytecode.hex       # Compiled bytecode for the smart contract
├── deploy.js          # Node.js script to deploy the contract
├── index.css          # Frontend CSS styles
├── index.html         # Frontend HTML entry point
├── index.tsx          # Frontend React application code
├── package.json       # Backend Node.js dependencies
└── server.js          # Backend Express.js API server
```

---

## 🚀 Getting Started: Setup and Deployment

Follow these steps to get the entire application running locally and deployed to the Base Sepolia testnet.

### 1. Prerequisites

-   **Node.js**: Version 18.x or higher. [Download Node.js](https://nodejs.org/)
-   **npm**: Should be included with your Node.js installation.
-   **Crypto Wallet**: A browser extension wallet like [MetaMask](https://metamask.io/) or [Coinbase Wallet](https://www.coinbase.com/wallet) is required.
-   **Code Editor**: VS Code or any other editor of your choice.
-   **Live Server (for frontend)**: A simple way to serve `index.html`. If you use VS Code, the [Live Server extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) is recommended.

### 2. Get Base Sepolia Testnet ETH

Your issuer wallet needs testnet ETH to pay for the gas fees to deploy the contract and issue verifications.

1.  Open your browser wallet (e.g., MetaMask).
2.  Add the Base Sepolia network if you haven't already. You can use a site like [Chainlist](https://chainlist.org/) to add it easily.
3.  Copy your wallet address.
4.  Go to a Base Sepolia faucet (e.g., [buildonbase.org/faucet](https://www.buildonbase.org/faucet) or [bwarelabs.com/faucets/base-sepolia](https://bwarelabs.com/faucets/base-sepolia)) and request funds.

### 3. Install Dependencies

Clone this repository to your local machine, navigate into the directory, and install the backend dependencies.

```bash
git clone <repository-url>
cd <repository-name>
npm install
```

### 4. Configure Environment Variables

Create a `.env` file in the root of the project. This file will store your private key and the contract address.

```bash
touch .env
```

Open `.env` and add the following, replacing the placeholder with your **issuer wallet's private key**.

**⚠️ IMPORTANT**: This is a secret key. Do not commit this file or share it publicly. It's recommended to use a new, dedicated wallet for development that only holds testnet funds.

```env
# .env file

# Replace with the private key of the wallet you funded in Step 2.
# This wallet will deploy the contract and act as the KYC issuer.
ISSUER_PRIVATE_KEY=0xYOUR_WALLET_PRIVATE_KEY_HERE

# This will be filled in after you deploy the contract in the next step.
CONTRACT_ADDRESS=
```

### 5. Deploy the Smart Contract

Run the deployment script using Node.js. This will use your `ISSUER_PRIVATE_KEY` to deploy `KycVault.sol` to the Base Sepolia testnet.

```bash
node deploy.js
```

If successful, you will see output like this:

```
Deploying contract from account: 0xAbC...123
Account balance: 0.1 ETH
Deploying KycVault...

✅ KycVault contract deployed successfully!
Contract Address: 0x456...789
```

**Action Required**: Copy the `Contract Address` from the output and paste it into your `.env` file for the `CONTRACT_ADDRESS` variable.

Your `.env` file should now look like this:

```env
# .env file
ISSUER_PRIVATE_KEY=0xYOUR_WALLET_PRIVATE_KEY_HERE
CONTRACT_ADDRESS=0x456...789 # The address from the deploy script output
```

### 6. Run the Backend Server

Start the backend API server. It will read your `.env` file, connect to the deployed contract, and start listening for API requests.

```bash
npm start
```

You should see the following output, confirming the server is running and connected:

```
[+] Connected to the SQLite database.
[+] Issuer wallet address: 0xAbC...123
[+] Interacting with contract at: 0x456...789
KYC Gateway server running on http://localhost:3001
```

### 7. Run the Frontend

Open the `index.html` file with a live server.

-   **If using VS Code's Live Server extension**: Right-click on `index.html` and select "Open with Live Server".
-   **Alternatively, using `npx`**: In a **new terminal window**, run `npx serve`. This will start a server, usually on port 3000.

Your browser should open the KYC Vault application. You can now connect your wallet and test the full KYC submission and verification flow!
