import os
import sys
import json
import requests
import anthropic

def verify_payment(tx_hash, required_amount_eth=0.0001):
    """Verify that the tx_hash is a valid payment to Treasury."""
    try:
        # Check transaction on Sepolia (testnet) or Polygon (mainnet)
        rpc_url = os.environ.get('RPC_URL', 'https://eth-sepolia.g.alchemy.com/v2/dGJhIAT-IAiPWg8s23bd1')
        treasury = os.environ.get('TREASURY_ADDRESS', '0x04262f22F4B9341B332735a2F3212614f64d5233').lower()
        
        payload = {
            "jsonrpc": "2.0",
            "method": "eth_getTransactionByHash",
            "params": [tx_hash],
            "id": 1
        }
        response = requests.post(rpc_url, json=payload, timeout=10)
        tx = response.json().get('result')
        
        if not tx:
            return False, "Transaction not found"
        
        # Check recipient is Treasury
        if tx.get('to', '').lower() != treasury:
            return False, "Payment not sent to Treasury"
        
        # Check amount >= required
        value_wei = int(tx.get('value', '0x0'), 16)
        value_eth = value_wei / 1e18
        if value_eth < required_amount_eth:
            return False, f"Payment too small: {value_eth:.6f} ETH (need {required_amount_eth} ETH)"
        
        return True, f"Payment verified: {value_eth:.6f} ETH"
    except Exception as e:
        return False, f"Verification error: {e}"

def answer_question(question, category, tx_hash):
    """Answer a question using Claude API."""
    
    # Verify payment first
    paid, msg = verify_payment(tx_hash)
    if not paid:
        return f"❌ Payment not verified: {msg}\n\nPlease pay 0.0001 ETH (~$0.10) to Treasury address and include your tx_hash in the question."
    
    # Build system prompt with BPA knowledge
    system_prompt = """You are the AI support agent for BPA (Batch Prediction Auction) Web4 platform - a decentralized prediction market.

Key facts about BPA:
- Decentralized prediction market on Polygon blockchain
- Uses Batch Auction Clearing (Baron-Lange algorithm)
- PoI NFT required to participate ($0.79 crypto / $0.99 fiat)
- Fix Bet: fixed payout limit orders
- Pool Bet: market maker orders (LP only)
- Sell orders allowed after first batch (0.1% fee)
- Node operators run node.py and earn $0.10 per batch
- GovernanceDAO: top-50 PoC holders vote on upgrades (80% required)
- DisputeOracle: dispute resolution by PoC-weighted jurors
- TSS: Threshold Signature Scheme protects funds

Answer concisely and helpfully. If you don't know something specific, say so."""

    client = anthropic.Anthropic(api_key=os.environ.get('ANTHROPIC_API_KEY'))
    
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=500,
        system=system_prompt,
        messages=[
            {"role": "user", "content": f"Category: {category}\n\nQuestion: {question}"}
        ]
    )
    
    answer = message.content[0].text
    return f"✅ Payment verified\n\n**AI Answer:**\n\n{answer}\n\n---\n*Answered by BPA AI Support Agent*"

if __name__ == "__main__":
    # Read from environment variables set by GitHub Actions
    question = os.environ.get('QUESTION', '')
    category = os.environ.get('CATEGORY', 'general')
    tx_hash = os.environ.get('TX_HASH', '')
    discussion_number = os.environ.get('DISCUSSION_NUMBER', '')
    
    if not question:
        print("No question provided")
        sys.exit(1)
    
    answer = answer_question(question, category, tx_hash)
    
    # Save answer to file for GitHub Actions to post
    with open('answer.txt', 'w') as f:
        f.write(answer)
    
    print("Answer generated successfully")
