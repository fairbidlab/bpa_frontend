import { ethers } from 'ethers';
import BPAMarketABI from './BPAMarket.json';
import { CONTRACT_ADDRESSES } from './config';

// Connect to MetaMask
export async function connectWallet() {
    if (!window.ethereum) {
        throw new Error("MetaMask not found! Please install MetaMask.");
    }
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return { provider, signer, address: await signer.getAddress() };
}

// Get BPAMarket contract instance
export function getMarketContract(signer) {
    return new ethers.Contract(
        CONTRACT_ADDRESSES.BPAMarket,
        BPAMarketABI.abi,
        signer
    );
}

// Get all markets
export async function getAllMarkets(contract) {
    const count = await contract.marketCount();
    const markets = [];
    for (let i = 1; i <= Number(count); i++) {
        const market = await contract.markets(i);
        markets.push({
            id: i,
            name: market.name,
            status: ['Open', 'Closed', 'Resolved'][market.status],
            marketType: ['Money', 'PoI'][market.marketType],
            endTime: new Date(Number(market.endTime) * 1000),
            winningOutcome: market.winningOutcome,
            pairedMarketId: Number(market.pairedMarketId)
        });
    }
    return markets;
}

// Get orders for a market
export async function getMarketOrders(contract, marketId) {
    const count = await contract.orderCount();
    const orders = [];
    for (let i = 1; i <= Number(count); i++) {
        const order = await contract.orders(i);
        if (Number(order.marketId) === marketId) {
            orders.push({
                id: i,
                player: order.player,
                outcome: order.outcome,
                quantity: ethers.formatEther(order.quantity),
                limitPrice: ethers.formatEther(order.limitPrice),
                status: ['Pending', 'Cleared', 'Rejected'][order.status],
                accepted: ethers.formatEther(order.accepted)
            });
        }
    }
    return orders;
}

// Submit order
export async function submitOrder(contract, marketId, outcome, quantity, limitPrice) {
    const oracleFee = await contract.oracleFeePerOrder();
    const tx = await contract.submitOrder(
        marketId,
        outcome,
        ethers.parseEther(quantity.toString()),
        ethers.parseEther(limitPrice.toString()),
        0, // Buy
        { value: oracleFee }
    );
    return await tx.wait();
}

// Get player position
export async function getPlayerPosition(contract, playerAddress, marketId, outcome) {
    const position = await contract.positions(playerAddress, marketId, outcome);
    return ethers.formatEther(position);
}

// Get claimable balance
export async function getClaimableBalance(contract, playerAddress) {
    const balance = await contract.claimableBalance(playerAddress);
    return ethers.formatEther(balance);
}

// Claim balance
export async function claimBalance(contract) {
    const tx = await contract.claimBalance();
    return await tx.wait();
}