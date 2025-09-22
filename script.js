const NETWORK = {
    chainId: '0x20d8', // 8408 in hex
    chainName: 'ZenChain Testnet',
    nativeCurrency: { name: 'ZTC', symbol: 'ZTC', decimals: 18 },
    rpcUrls: ['https://zenchain-testnet.api.onfinality.io/public'],
    blockExplorerUrls: ['https://zenchain-testnet.subscan.io/']
};

const CONTRACT_ADDRESS = '0x497e2763F733A0d0F2ea08aAb60fE164d0e06bCa';
const ABI = [
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "user",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "timestamp",
                "type": "uint256"
            }
        ],
        "name": "GMEvent",
        "type": "event"
    },
    {
        "inputs": [],
        "name": "sendGM",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "COOLDOWN",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getGMCount",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "index",
                "type": "uint256"
            }
        ],
        "name": "getLastGM",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "user",
                "type": "address"
            }
        ],
        "name": "getLastGMTime",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getTotalGM",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "name": "gms",
        "outputs": [
            {
                "internalType": "address",
                "name": "user",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "timestamp",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "name": "lastGM",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "totalGM",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

let provider, signer, contract, account;

// Utility: show messages both in console and on the page
function uiLog(msg, isError = false) {
    console[isError ? 'error' : 'log']('[DApp]', msg);
    const el = document.getElementById('account');
    if (el) {
        // append small status under account for easier feedback
        const statusId = 'dappStatus';
        let status = document.getElementById(statusId);
        if (!status) {
            status = document.createElement('div');
            status.id = statusId;
            status.style.fontSize = '12px';
            status.style.marginTop = '6px';
            el.parentNode.insertBefore(status, el.nextSibling);
        }
        const time = new Date().toLocaleTimeString();
        status.textContent = `[${time}] ${msg}`;
        if (isError) status.style.color = 'crimson';
        else status.style.color = 'green';
    }
}

// Better checkNetwork which handles provider absence and prints detailed errors
async function checkNetwork() {
    if (!window.ethereum) {
        throw new Error('MetaMask not found (window.ethereum is undefined)');
    }
    try {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        uiLog('Current chainId: ' + chainId);
        if (chainId !== NETWORK.chainId) {
            uiLog(`Trying to switch network to ${NETWORK.chainName} (${NETWORK.chainId})`);
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: NETWORK.chainId }],
                });
                uiLog('Network switched successfully.');
            } catch (switchError) {
                uiLog('switchError: ' + (switchError && switchError.message) || switchError, true);
                if (switchError && (switchError.code === 4902 || switchError.message?.includes('4902'))) {
                    uiLog('Network not found in MetaMask, trying to add it...');
                    try {
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [NETWORK]
                        });
                        uiLog('Network added. Attempting to switch again...');
                        await window.ethereum.request({
                            method: 'wallet_switchEthereumChain',
                            params: [{ chainId: NETWORK.chainId }],
                        });
                        uiLog('Network switched after adding.');
                    } catch (addError) {
                        uiLog('Failed to add network: ' + (addError && addError.message) || addError, true);
                        throw addError;
                    }
                } else {
                    throw switchError;
                }
            }
        } else {
            uiLog('Already on the correct network.');
        }
    } catch (err) {
        uiLog('checkNetwork error: ' + (err && err.message ? err.message : err), true);
        throw err;
    }
}

async function connectWallet() {
    if (!window.ethereum) {
        alert('connect with local server! (connect metamask)');
        return;
    }

    try {
        uiLog('Connecting wallet...');
        // create provider with "any" network so it emits network events
        provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
        // request accounts (this will prompt the user)
        await provider.send('eth_requestAccounts', []);
        signer = provider.getSigner();
        account = await signer.getAddress();
        uiLog('Got account: ' + account);
        // Ensure correct network
        await checkNetwork();
        // recreate provider/signer/contract after network switch
        provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
        signer = provider.getSigner();
        contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

        document.getElementById('account').textContent = `account: ${account}`;
        document.getElementById('connectBtn').textContent = 'disconnect';
        document.getElementById('faucetBtn').disabled = false;
        document.getElementById('sendGMBtn').disabled = false;

        // start UI updates
        checkCooldown();
        updateTotalGM();
        updateGMList();

        uiLog('Wallet connected and contract ready.');
    } catch (error) {
        uiLog('connectWallet error: ' + (error && error.message ? error.message : error), true);
        if (error && error.code === 4001) {
            // user rejected request
            alert('connect wallet.');
        } else {
            alert('error connect: ' + (error && error.message ? error.message : error));
        }
    }
}

function disconnectWallet() {
    account = null;
    contract = null;
    document.getElementById('account').textContent = '';
    document.getElementById('connectBtn').textContent = 'connect wallet (MetaMask)';
    document.getElementById('faucetBtn').disabled = true;
    document.getElementById('sendGMBtn').disabled = true;
    document.getElementById('cooldownTimer').textContent = '';
    uiLog('Disconnected.');
}

async function openFaucet() {
    window.open('https://faucet.zenchain.io/', '_blank');
}

async function sendGM() {
    if (!contract) {
        alert('connect wallet.');
        return;
    }
    try {
        uiLog('Sending GM transaction...');
        const tx = await contract.sendGM({ gasLimit: 300000 });
        uiLog('Transaction sent: ' + tx.hash);
        await tx.wait();
        uiLog('Transaction mined: ' + tx.hash);
        alert('GM ok!');
        checkCooldown();
        updateTotalGM();
        updateGMList();
    } catch (error) {
        uiLog('sendGM error: ' + (error && error.message ? error.message : error), true);
        if (error && error.code === 4001) {
            alert('error.');
        } else {
            alert('error GM: ' + (error && error.message ? error.message : error));
        }
    }
}

async function checkCooldown() {
    if (!contract || !account) return;
    try {
        const cooldown = await contract.COOLDOWN();
        const lastTime = await contract.getLastGMTime(account);
        const now = Math.floor(Date.now() / 1000);
        const cooldownEnd = Number(lastTime) + Number(86400);
        const btn = document.getElementById('sendGMBtn');
        const timerEl = document.getElementById('cooldownTimer');

        if (now >= cooldownEnd) {
            btn.disabled = false;
            btn.textContent = 'send GM';
            timerEl.textContent = '';
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Cooldown ready';
        const timeLeft = cooldownEnd - now;
        timerEl.textContent = `to ready: ${Math.floor(timeLeft / 3600)} h ${Math.floor((timeLeft % 3600) / 60)} min`;

        setTimeout(checkCooldown, 60000);
    } catch (err) {
        uiLog('checkCooldown error: ' + (err && err.message ? err.message : err), true);
    }
}

async function updateTotalGM() {
    if (!contract) return;
    try {
        const total = await contract.getTotalGM();
        document.getElementById('totalGM').textContent = total.toString();
    } catch (err) {
        uiLog('updateTotalGM error: ' + (err && err.message ? err.message : err), true);
    }
}

async function updateGMList() {
    if (!contract) return;
    try {
        const count = await contract.getGMCount();
        const listEl = document.getElementById('gmList');
        listEl.innerHTML = '';

        const startIndex = count > 10 ? count - 10 : 0;
        for (let i = startIndex; i < count; i++) {
            const [user, timestamp] = await contract.getLastGM(i);
            const date = new Date(timestamp * 1000).toLocaleString();
            const li = document.createElement('li');
            li.textContent = `${user.slice(0,6)}...${user.slice(-4)} - ${date}`;
            listEl.appendChild(li);
        }
    } catch (err) {
        uiLog('updateGMList error: ' + (err && err.message ? err.message : err), true);
    }
}

// UI bindings
document.getElementById('connectBtn').addEventListener('click', () => {
    if (account) {
        disconnectWallet();
    } else {
        connectWallet();
    }
});

document.getElementById('faucetBtn').addEventListener('click', openFaucet);
document.getElementById('sendGMBtn').addEventListener('click', sendGM);

// MetaMask events - more conservative handling
window.addEventListener('load', () => {
    if (window.ethereum) {
        window.ethereum.on('accountsChanged', (accounts) => {
            uiLog('accountsChanged: ' + JSON.stringify(accounts));
            if (accounts.length === 0) {
                disconnectWallet();
            } else {
                // just update account and refresh data, don't force reconnect prompt
                account = accounts[0];
                uiLog('Switched to account: ' + account);
                document.getElementById('account').textContent = `account: ${account}`;
                try { updateTotalGM(); updateGMList(); checkCooldown(); } catch(e){}
            }
        });
        window.ethereum.on('chainChanged', (chainId) => {
            uiLog('chainChanged: ' + chainId);
            // When chain changes, reload contract & UI
            disconnectWallet();
            // small delay to avoid racing
            setTimeout(() => { connectWallet(); }, 500);
        });
        window.ethereum.on('disconnect', (err) => {
            uiLog('ethereum.disconnect: ' + JSON.stringify(err), true);
            disconnectWallet();
        });
    } else {
        uiLog('No window.ethereum available on load.', true);
    }
});

// Helpful note: some browsers don't inject MetaMask when page opened via file://.
// Serve via localhost (python -m http.server) if you see injection issues.
