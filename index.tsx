/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Fix for window.ethereum TypeScript error
declare global {
  interface Window {
    ethereum: any;
  }
}

import React, { useState, useCallback, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { ethers } from 'ethers';
import axios from 'axios';

// --- CONFIG ---
const VITE_API_URL = 'http://localhost:3001';

/**
 * Queries the KYC Gateway backend to get the verification status.
 * @param {string} walletAddress The user's wallet address.
 * @returns {Promise<string>} The KYC status as a string (e.g., 'Verified', 'Pending', 'None').
 */
export async function getVerificationStatus(walletAddress) {
  try {
    if (!ethers.isAddress(walletAddress)) {
      throw new Error("Invalid wallet address");
    }
    const response = await axios.get(`${VITE_API_URL}/kyc/status/${walletAddress}`);
    return response.data.status || 'Unknown';
  } catch (error) {
    console.error("Error fetching verification status from backend:", error);
    return 'None';
  }
}

// --- UI Components ---

const Nav = ({ activeScreen, setActiveScreen }) => {
    const screens = ['Home', 'Onboarding', 'Dashboard', 'Developers', 'Setup'];
    return (
        <nav className="nav">
            {screens.map(screen => (
                <button 
                    key={screen}
                    className={`nav-item ${activeScreen === screen.toLowerCase() ? 'active' : ''}`}
                    onClick={() => setActiveScreen(screen.toLowerCase())}>
                    {screen}
                </button>
            ))}
        </nav>
    );
};

const Home = ({ setActiveScreen }) => (
    <div className="screen-content">
        <h2>One-Time KYC, On-Chain Re-use</h2>
        <p>Welcome to KYC Vault, your secure and private identity solution on the Base Blockchain. Complete your Know Your Customer (KYC) process once, and reuse your verified status across a universe of decentralized applications without repeatedly sharing sensitive documents.</p>
        <button className="btn" onClick={() => setActiveScreen('onboarding')}>Start Onboarding</button>
    </div>
);

const KYCOnboarding = ({ walletAddress, onConnect, onStatusChange, setActiveScreen }) => {
    const [file, setFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [notification, setNotification] = useState({ message: '', type: '' });

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setNotification({ message: '', type: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            setNotification({ message: 'Please select a document to upload.', type: 'error' });
            return;
        }
        setIsLoading(true);
        setNotification({ message: '', type: '' });

        const formData = new FormData();
        formData.append('document', file);
        formData.append('walletAddress', walletAddress);

        try {
            const response = await axios.post(`${VITE_API_URL}/kyc/submit`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setNotification({ message: 'Document submitted successfully! Your status is now Pending.', type: 'success' });
            onStatusChange(response.data.status || 'Pending');
            // Redirect to dashboard after successful submission
            setTimeout(() => setActiveScreen('dashboard'), 2000); 

        } catch (error) {
            console.error('KYC submission error:', error);
            const errorMessage = error.response?.data?.error || 'Failed to submit document. Please try again.';
            setNotification({ message: errorMessage, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="screen-content">
            <h2>KYC Onboarding</h2>
            {!walletAddress ? (
                <div>
                    <p>Connect your wallet to begin the KYC process. We support MetaMask, Coinbase Wallet, and other browser wallets.</p>
                    <button className="btn" onClick={onConnect}>Connect Wallet</button>
                </div>
            ) : (
                <form onSubmit={handleSubmit}>
                    <div className="wallet-address">
                        <span>Connected Address:</span>
                        <code>{`${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`}</code>
                    </div>
                    <div className="form-group">
                        <label htmlFor="id-upload">Upload Identity Document (e.g., PNG, JPG, PDF)</label>
                        <input type="file" id="id-upload" onChange={handleFileChange} accept="image/*,.pdf" />
                    </div>
                    <button type="submit" className="btn" disabled={isLoading || !file}>
                        {isLoading ? 'Submitting...' : 'Submit for Verification'}
                    </button>
                    {notification.message && (
                        <div className={`notification notification-${notification.type}`}>
                            {notification.message}
                        </div>
                    )}
                </form>
            )}
        </div>
    );
};

const VerificationDashboard = ({ walletAddress, kycStatus, onStatusChange, onConnect }) => {
    const [isLoading, setIsLoading] = useState(false);

    const checkStatus = useCallback(async () => {
        if (!walletAddress) return;
        setIsLoading(true);
        const status = await getVerificationStatus(walletAddress);
        onStatusChange(status);
        setIsLoading(false);
    }, [walletAddress, onStatusChange]);

    useEffect(() => {
        checkStatus();
    }, [checkStatus]);

    useEffect(() => {
        if (!walletAddress) return;
        const intervalId = setInterval(() => {
            getVerificationStatus(walletAddress).then(onStatusChange);
        }, 10000); // Poll every 10 seconds
        return () => clearInterval(intervalId);
    }, [walletAddress, onStatusChange]);

    if (!walletAddress) {
        return (
            <div className="screen-content">
                <h2>Verification Dashboard</h2>
                <p>Please connect your wallet to view your KYC status.</p>
                <button className="btn" onClick={onConnect}>Connect Wallet</button>
            </div>
        );
    }

    return (
        <div className="screen-content">
            <h2>Verification Dashboard</h2>
            <div className="wallet-address">
                <span>Wallet Address:</span>
                <code>{walletAddress}</code>
            </div>
            <div className="status-display">
                <span>KYC Status:</span>
                <span className={`status-tag status-${kycStatus}`}>{kycStatus}</span>
            </div>
            <button className="btn" onClick={checkStatus} disabled={isLoading}>
                {isLoading ? 'Checking...' : 'Refresh Status'}
            </button>
        </div>
    );
};

const DeveloperAccess = () => {
    const [isSubmitted, setIsSubmitted] = useState(false);
    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSubmitted(true);
    };

    return (
        <div className="screen-content">
            <h2>Developer Access</h2>
            {isSubmitted ? (
                 <div className="notification notification-success">
                    Thank you! Your API key request has been submitted. We will review it and get back to you shortly.
                </div>
            ) : (
                <form onSubmit={handleSubmit}>
                    <p>Request an API key to integrate KYC Vault verification into your dApp. Let your users prove their status without collecting sensitive data.</p>
                    <div className="form-group">
                        <label htmlFor="dapp-name">dApp Name</label>
                        <input type="text" id="dapp-name" required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="email">Contact Email</label>
                        <input type="email" id="email" required />
                    </div>
                    <button type="submit" className="btn">Request API Key</button>
                </form>
            )}
        </div>
    );
};

const CopyableCode = ({ text }) => {
    const [copied, setCopied] = useState(false);
    const copyToClipboard = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="code-block">
            <code>{text}</code>
            <button onClick={copyToClipboard} className="copy-btn" title="Copy to clipboard">
                {copied ? 'Copied!' : 'Copy'}
            </button>
        </div>
    );
};

const SetupRoadmap = ({ steps, currentStep }) => {
    return (
        <div className="roadmap-container">
            {steps.map((step, index) => (
                <React.Fragment key={index}>
                    <div className="roadmap-step-container">
                        <div
                            className={`roadmap-step ${index < currentStep ? 'completed' : ''} ${index === currentStep ? 'active' : ''}`}
                        >
                            {index < currentStep ? '✔' : index + 1}
                        </div>
                        <div className={`roadmap-label ${index <= currentStep ? 'active' : ''}`}>
                            {step.shortTitle}
                        </div>
                    </div>
                    {index < steps.length - 1 && <div className={`roadmap-connector ${index < currentStep ? 'completed' : ''}`} />}
                </React.Fragment>
            ))}
        </div>
    );
};

const SetupGuide = ({ walletAddress, onConnect }) => {
    const [activeStep, setActiveStep] = useState(0);
    const [contractAddressInput, setContractAddressInput] = useState('');
    const [isDeploying, setIsDeploying] = useState(false);
    const [deploymentResult, setDeploymentResult] = useState(null);
    const [deploymentError, setDeploymentError] = useState('');
    
    // Contract details are embedded here for in-browser deployment
    const contractAbi = [
      "constructor()",
      "function addVerification(address user, bytes32 verificationHash, uint256 expiry, bytes calldata issuerSig)",
      "function isVerified(address user) view returns (bool)",
      "function revokeVerification(address user)",
      "event KYCAdded(address indexed user, address indexed issuer, uint256 expiry)",
      "event KYCRevoked(address indexed user, address indexed issuer)"
    ];
    const contractBytecode = '0x608060405234801561001057600080fd5b5060405161066c38038061066c8339818101604052602081101561003357600080fd5b81019080805190602001909291905050506000805561060f806100526000396000f3fe608060405234801561001057600080fd5b50600436106100415760003560e01c80631627df3b146100465780639956a93b146100d0578063f23a555a14610118575b600080fd5b6100ce6004803603608081101561005c57600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff1690602001909291908035906020019092919080359060200190929190505050610147565b005b6100d8610331565b604051808273ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200191505060405180910390f35b6100ce6004803603604081101561012e57600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff169060200190929190505050610337565b6000602081905290815260408120548152f35b3373ffffffffffffffffffffffffffffffffffffffff166000805473ffffffffffffffffffffffffffffffffffffffff1690919060405160a08102838380828437809201919091529092526020820152606081018281526080018152602001925050506040518091039020805473ffffffffffffffffffffffffffffffffffffffff16935091909192909184908083835b602083106101f35780820191505b818152602081018481526020018382808051906020019092919050505091929192905050506000806040838503121561023757600080fd5b84359180803573ffffffffffffffffffffffffffffffffffffffff1690602001909291908035906020019092919080359060200190929190505050610368565b6040805182815260200191505060405180910390a36000548152f35b3373ffffffffffffffffffffffffffffffffffffffff166000805473ffffffffffffffffffffffffffffffffffffffff169060405160a08102838380828437809201919091529092526020820152606081018281526080018152602001925050506040518091039020805473ffffffffffffffffffffffffffffffffffffffff16935091909192909184908083835b602083106103135780820191505b818152602081018481526020018382808051906020019092919050505091929192905050506001905090565b60005481565b3373ffffffffffffffffffffffffffffffffffffffff166000805473ffffffffffffffffffffffffffffffffffffffff169060405160a08102838380828437809201919091529092526020820152606081018281526080018152602001925050506040518091039020805473ffffffffffffffffffffffffffffffffffffffff16935091909192909184908083835b602083106103f15780820191505b818152602081018481526020018382808051906020019092919050505091929192905050506000905090565b60008281526020818152604081203373ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055508173ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1614156104ca57600080fd5b3373ffffffffffffffffffffffffffffffffffffffff166000805473ffffffffffffffffffffffffffffffffffffffff169060405160a08102838380828437809201919091529092526020820152606081018281526080018152602001925050506040518091039020546001600160a01b03161461054c57600080fd5b80604051818152602001908152602001600020600082825403925050819055508273ffffffffffffffffffffffffffffffffffffffff163b8173ffffffffffffffffffffffffffffffffffffffff1614156105c357600080fd5b60405181815260200190815260200160002060003373ffffffffffffffffffffffffffffffffffffffff16828254039250508190555073ffffffffffffffffffffffffffffffffffffffff167f573c2a6327c5324316a7f92021133021969a53820230626359e19e7284f1b2683383604051808373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020018281526020019250505060405180910390a25056fea2646970667358221220a2e1d75220c4c360a37db91ff49ee85d341936b8563c33211a7a233b6645511b64736f6c63430008090033';
    
    const handleDeploy = async () => {
        if (!window.ethereum) {
            setDeploymentError('Please install a browser wallet like MetaMask to deploy the contract.');
            return;
        }
        
        setIsDeploying(true);
        setDeploymentError('');
        setDeploymentResult(null);

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            await provider.send("eth_requestAccounts", []); // Prompt user to connect
            const signer = await provider.getSigner();

            const factory = new ethers.ContractFactory(contractAbi, contractBytecode, signer);
            const contract = await factory.deploy();
            
            setDeploymentResult({ address: '...', txHash: contract.deploymentTransaction().hash });
            
            await contract.waitForDeployment();
            const contractAddress = await contract.getAddress();

            setDeploymentResult({ address: contractAddress, txHash: contract.deploymentTransaction().hash });
            setContractAddressInput(contractAddress);
            setActiveStep(4); // Move to the next step
        } catch (error) {
            console.error("Deployment failed:", error);
            if (error.code === 'ACTION_REJECTED') {
                 setDeploymentError('Transaction rejected by user.');
            } else if (error.code === 'INSUFFICIENT_FUNDS') {
                 setDeploymentError('Insufficient funds for deployment. Please add more Base Sepolia ETH to your wallet.');
            }
            else {
                setDeploymentError('An unexpected error occurred. Check the console for details.');
            }
        } finally {
            setIsDeploying(false);
        }
    };


    const initialEnvFileContent = `
# Replace with the private key of the wallet you will use to deploy.
# ⚠️ This is a secret key. Do not commit this file.
ISSUER_PRIVATE_KEY=0xYOUR_WALLET_PRIVATE_KEY_HERE

# This will be filled in after you deploy the contract.
CONTRACT_ADDRESS=
    `.trim();

    const finalEnvFileContent = `
# Replace with the private key of the wallet you will use to deploy.
# ⚠️ This is a secret key. Do not commit this file.
ISSUER_PRIVATE_KEY=0xYOUR_WALLET_PRIVATE_KEY_HERE

# The address of your deployed KycVault contract.
CONTRACT_ADDRESS=${contractAddressInput || '0x...'}
    `.trim();

    const steps = [
        {
            shortTitle: 'Get ETH',
            title: 'Get Base Sepolia Testnet ETH',
            content: (
                <>
                    <p>Your wallet needs testnet ETH to pay for gas fees to deploy the contract and issue verifications. You can get some from a faucet.</p>
                    <p>Copy your address below and paste it into the faucet:</p>
                    {walletAddress && <CopyableCode text={walletAddress} />}
                    <a href="https://www.buildonbase.org/faucet" target="_blank" rel="noopener noreferrer" className="btn">Open Base Faucet</a>
                </>
            ),
        },
        {
            shortTitle: 'Install',
            title: 'Install Backend Dependencies',
            content: (
                <>
                    <p>Open your project folder in your terminal and run the following command to install the required Node.js packages:</p>
                    <CopyableCode text="npm install" />
                </>
            ),
        },
        {
            shortTitle: '.env File',
            title: 'Configure Environment File (.env)',
            content: (
                <>
                    <p>Create a file named <code>.env</code> in the root of your project folder. This file stores secret keys and configuration variables.</p>
                    <p>Your connected deployer wallet address is <strong>{walletAddress}</strong>. You need to get the private key for this wallet. In MetaMask, you can find this under "Account details" > "Show private key".</p>
                    <p className="warning-text"><strong>⚠️ IMPORTANT:</strong> Never share your private key or commit it to version control. Use a dedicated wallet with only testnet funds for development.</p>
                    <p>Copy the content below into your new <code>.env</code> file and add your private key:</p>
                    <CopyableCode text={initialEnvFileContent} />
                </>
            ),
        },
        {
            shortTitle: 'Deploy',
            title: 'Deploy the Smart Contract',
            content: (
                <>
                    <p>Instead of using the command line, you can deploy the contract directly from your browser. This will use your connected wallet to sign and send the transaction.</p>
                    <button className="btn" onClick={handleDeploy} disabled={isDeploying}>
                      {isDeploying ? 'Deploying...' : 'Deploy Contract'}
                    </button>
                    {isDeploying && <div className="spinner"></div>}

                    {deploymentResult && (
                        <div className="deployment-result notification-success">
                            <strong>✅ Deployment Successful!</strong>
                            <p><strong>Contract Address:</strong> <code>{deploymentResult.address}</code></p>
                            <a href={`https://sepolia.basescan.org/tx/${deploymentResult.txHash}`} target="_blank" rel="noopener noreferrer">
                                View on Basescan
                            </a>
                        </div>
                    )}
                     {deploymentError && (
                        <div className="notification notification-error">
                            <strong>Deployment Failed:</strong> {deploymentError}
                        </div>
                    )}
                </>
            ),
        },
        {
            shortTitle: 'Update .env',
            title: 'Update .env with Contract Address',
            content: (
                <>
                    <p>The app has detected your new contract address from the previous step. Paste it into the input field below if it's not already there.</p>
                     <div className="form-group">
                        <label htmlFor="contract-address-input">Contract Address</label>
                        <input 
                            type="text" 
                            id="contract-address-input" 
                            className="setup-input"
                            placeholder="0x..."
                            value={contractAddressInput}
                            onChange={(e) => setContractAddressInput(e.target.value)}
                        />
                    </div>
                    <p>Now, copy the entire generated block below and use it to **replace all the content** in your <code>.env</code> file. This will finalize its configuration.</p>
                    <CopyableCode text={finalEnvFileContent} />
                </>
            ),
        },
        {
            shortTitle: 'Run Server',
            title: 'Run the Backend Server',
            content: (
                <>
                    <p>Start the backend API server. It will read your <code>.env</code> file and connect to your newly deployed contract.</p>
                    <CopyableCode text="npm start" />
                    <p>You should see a confirmation in your terminal that the server is running on http://localhost:3001.</p>
                </>
            ),
        },
         {
            shortTitle: 'Done!',
            title: 'All Done!',
            content: (
                <>
                    <p>Your setup is complete! The backend is running and connected to your smart contract. You can now use the "Onboarding" and "Dashboard" sections of this application to interact with it.</p>
                </>
            ),
        },
    ];

    if (!walletAddress) {
        return (
            <div className="screen-content setup-guide">
                <h2>Interactive Setup Guide</h2>
                <p>Please connect your wallet to begin. The wallet you connect should be the one you intend to use for deploying the contract (i.e., the one that has Base Sepolia ETH).</p>
                <button className="btn" onClick={onConnect}>Connect Deployer Wallet</button>
            </div>
        );
    }
    
    return (
        <div className="screen-content setup-guide">
            <h2>Interactive Setup Guide</h2>
            <p>Follow these steps in your local project terminal and code editor to deploy your own KYC Vault contract and run the backend server.</p>
            <SetupRoadmap steps={steps} currentStep={activeStep} />
            <div className="steps-container">
            {steps.map((step, index) => (
                 <div className="step" key={index}>
                    <button 
                        className="step-header" 
                        onClick={() => setActiveStep(activeStep === index ? -1 : index)} 
                        aria-expanded={activeStep === index}
                        aria-controls={`step-content-${index}`}
                    >
                        <span className="step-title"><strong>Step {index + 1}:</strong> {step.title}</span>
                        <span className="accordion-icon">{activeStep === index ? '−' : '+'}</span>
                    </button>
                    {activeStep === index && (
                        <div className="step-content" id={`step-content-${index}`}>
                            {step.content}
                        </div>
                    )}
                </div>
            ))}
            </div>
        </div>
    );
};

function App() {
  const [activeScreen, setActiveScreen] = useState('home');
  const [walletAddress, setWalletAddress] = useState(null);
  const [kycStatus, setKycStatus] = useState('None');
  const [notification, setNotification] = useState({ message: '', type: '' });

  // CORRECTED: Wrapped in useCallback to prevent stale closures in the useEffect hook.
  // It now safely depends on `walletAddress` to check for changes.
  const handleAccountsChanged = useCallback((accounts) => {
    if (accounts.length === 0) {
      console.log('Please connect to a wallet.');
      setWalletAddress(null);
      setKycStatus('None');
      setActiveScreen('home');
    } else if (accounts[0] !== walletAddress) {
      setWalletAddress(accounts[0]);
      // If user connects, default to dashboard, but if they are on setup, stay there.
      if (activeScreen !== 'setup') {
         setActiveScreen('dashboard');
      }
    }
  }, [walletAddress, activeScreen]);
  
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        handleAccountsChanged(accounts);
      } catch (error) {
        console.error("Error connecting to wallet:", error);
        setNotification({ message: 'Wallet connection rejected by user.', type: 'error' });
      }
    } else {
        alert('Please install a browser wallet like MetaMask or Coinbase Wallet to use this dApp!');
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      // Clean up the event listener when the component unmounts
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
    // CORRECTED: Added handleAccountsChanged to the dependency array.
  }, [handleAccountsChanged]);


  const renderScreen = () => {
    switch (activeScreen) {
        case 'home':
            return <Home setActiveScreen={setActiveScreen} />;
        case 'onboarding':
            return <KYCOnboarding walletAddress={walletAddress} onConnect={connectWallet} onStatusChange={setKycStatus} setActiveScreen={setActiveScreen} />;
        case 'dashboard':
            return <VerificationDashboard walletAddress={walletAddress} kycStatus={kycStatus} onStatusChange={setKycStatus} onConnect={connectWallet} />;
        case 'developers':
            return <DeveloperAccess />;
        case 'setup':
            return <SetupGuide walletAddress={walletAddress} onConnect={connectWallet} />;
        default:
            return <Home setActiveScreen={setActiveScreen} />;
    }
  };

  return (
    <div className="main-container">
        <header className="header">
            <h1>KYC Vault</h1>
            <Nav activeScreen={activeScreen} setActiveScreen={setActiveScreen} />
        </header>
        {notification.message && (
            <div className={`notification notification-${notification.type}`}>
                {notification.message}
            </div>
        )}
        {renderScreen()}
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);