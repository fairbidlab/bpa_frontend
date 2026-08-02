import React, { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWriteContract, useReadContract, useReadContracts, useAccount } from 'wagmi';
import { parseEther } from 'viem';
import BPAMarketABI from './contracts/BPAMarket.json';
import { CONTRACT_ADDRESSES } from './contracts/config';
import './App.css';
import EventCalendarABI from './contracts/EventCalendar.json';
import AgentPoIABI from './contracts/AgentPoI.json';

const CALENDAR_ADDRESS = '0xb2b72569505E54bA335e18A3e3d4b1cdCc129c9C';
const MIN_STAKE = '0.001';
const MARKET_ADDRESS = CONTRACT_ADDRESSES.BPAMarket;
const RPC_URL = 'https://eth-sepolia.g.alchemy.com/v2/dGJhIAT-IAiPWg8s23bd1';

function App() {
  const [markets, setMarkets] = useState([]);
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('order');
  const [side, setSide] = useState('buy');
  const [outcome, setOutcome] = useState(0);
  const [quantity, setQuantity] = useState('1');
  const [limitPrice, setLimitPrice] = useState('0.5');
  const [organizerMode, setOrganizerMode] = useState(false);
  const [agentCategory, setAgentCategory] = useState('sport');
  const [pariAmounts, setPariAmounts] = useState({});
  const [lpAmount, setLpAmount] = useState('');
  const [minDistortion, setMinDistortion] = useState('10');
  const [crossingOnly, setCrossingOnly] = useState(false);
  const [distortionDirection, setDistortionDirection] = useState('undervalued');
  const [maxRisk, setMaxRisk] = useState('5');
  const [maxPositions, setMaxPositions] = useState('3');
  const [stopLoss, setStopLoss] = useState('20');
  const [agentActive, setAgentActive] = useState(false);
  const [agentLog, setAgentLog] = useState([]);
  const { writeContract } = useWriteContract();
  const { address } = useAccount();

  // Agent PoI from blockchain
  const AGENT_POI_ADDRESS = CONTRACT_ADDRESSES.AgentPoI;
  const ORACLE_ADDRESS = '0x7EbBA4d53Bd30Cb834585227Ced6e53e189dBa90';
  const { data: agentPoIData } = useReadContract({
    address: AGENT_POI_ADDRESS,
    abi: AgentPoIABI.abi,
    functionName: 'getAgentPoI',
    args: [ORACLE_ADDRESS],
    chainId: 11155111,
  });
  const { data: footballPoI } = useReadContract({ address: AGENT_POI_ADDRESS, abi: AgentPoIABI.abi, functionName: 'getCategoryPoI', args: [ORACLE_ADDRESS, 'football'], chainId: 11155111 });
  const { data: userPoIData } = useReadContract({ address: AGENT_POI_ADDRESS, abi: AgentPoIABI.abi, functionName: 'getAgentPoI', args: [address || ORACLE_ADDRESS], chainId: 11155111 });
  const { data: userFootballPoI } = useReadContract({ address: AGENT_POI_ADDRESS, abi: AgentPoIABI.abi, functionName: 'getCategoryPoI', args: [address || ORACLE_ADDRESS, 'football'], chainId: 11155111 });
  const { data: userFinancePoI } = useReadContract({ address: AGENT_POI_ADDRESS, abi: AgentPoIABI.abi, functionName: 'getCategoryPoI', args: [address || ORACLE_ADDRESS, 'finance'], chainId: 11155111 });
  const { data: userPoliticsPoI } = useReadContract({ address: AGENT_POI_ADDRESS, abi: AgentPoIABI.abi, functionName: 'getCategoryPoI', args: [address || ORACLE_ADDRESS, 'politics'], chainId: 11155111 });
  const { data: userWeatherPoI } = useReadContract({ address: AGENT_POI_ADDRESS, abi: AgentPoIABI.abi, functionName: 'getCategoryPoI', args: [address || ORACLE_ADDRESS, 'weather'], chainId: 11155111 });
  const { data: userRarePoI } = useReadContract({ address: AGENT_POI_ADDRESS, abi: AgentPoIABI.abi, functionName: 'getCategoryPoI', args: [address || ORACLE_ADDRESS, 'rare'], chainId: 11155111 });
  const { data: financePoI } = useReadContract({ address: AGENT_POI_ADDRESS, abi: AgentPoIABI.abi, functionName: 'getCategoryPoI', args: [ORACLE_ADDRESS, 'finance'], chainId: 11155111 });
  const { data: politicsPoI } = useReadContract({ address: AGENT_POI_ADDRESS, abi: AgentPoIABI.abi, functionName: 'getCategoryPoI', args: [ORACLE_ADDRESS, 'politics'], chainId: 11155111 });
  const { data: weatherPoI } = useReadContract({ address: AGENT_POI_ADDRESS, abi: AgentPoIABI.abi, functionName: 'getCategoryPoI', args: [ORACLE_ADDRESS, 'weather'], chainId: 11155111 });
  const { data: rarePoI } = useReadContract({ address: AGENT_POI_ADDRESS, abi: AgentPoIABI.abi, functionName: 'getCategoryPoI', args: [ORACLE_ADDRESS, 'rare'], chainId: 11155111 });

  // DAO Calendar state
  const [daoTab, setDaoTab] = useState(false);
  const [profileTab, setProfileTab] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [newEventName, setNewEventName] = useState('');
  const [newEventOutcomes, setNewEventOutcomes] = useState('Home,Draw,Away');
  const [newEventDate, setNewEventDate] = useState('');
  const [calendarLoading, setCalendarLoading] = useState(false);

  const { data: marketCount } = useReadContract({
    address: MARKET_ADDRESS,
    abi: BPAMarketABI.abi,
    functionName: 'marketCount',
    chainId: 11155111,
  });

  const marketIds = marketCount
    ? Array.from({ length: Number(marketCount) }, (_, i) => i + 1).filter(i => i % 2 === 1)
    : [1, 3];

  const { data: marketsData } = useReadContracts({
    contracts: marketIds.map(id => ({
      address: MARKET_ADDRESS,
      abi: BPAMarketABI.abi,
      functionName: 'markets',
      args: [id],
      chainId: 11155111,
    })),
  });
  useEffect(() => {
    setMarkets([
      {id:3, name:'England vs Germany - Premier League 2026', outcomes:['England','Draw','Germany'], status:0},
    ]);
    setSelectedMarket({id:3, name:'England vs Germany - Premier League 2026', outcomes:['England','Draw','Germany'], status:0});
  }, []);

  function parseMarket(r) {
    if (!r) return null;
    // wagmi v2 returns array-like tuple
    return {
      name: r.name || r[0] || 'Unknown',
      outcomes: Array.isArray(r[1] || r.outcomes) ? (r[1] || r.outcomes) : [],
      status: Number(r[2] ?? r.status ?? 0),
      currentBatch: Number(r[3] ?? r.currentBatch ?? 0),
      totalVolume: Number(r[4] ?? r.totalVolume ?? 0),
    };
  }

  async function fetchMarketPrices(marketId) {
    try {
      const provider = new (await import('ethers')).ethers.JsonRpcProvider(RPC_URL);
      const contract = new (await import('ethers')).ethers.Contract(MARKET_ADDRESS, BPAMarketABI.abi, provider);
      const batch = await contract.getCurrentBatch(marketId);
      return batch;
    } catch { return null; }
  }

  async function handleOrder(e) {
    e.preventDefault();
    if (!selectedMarket) return;
    const price = parseFloat(limitPrice);
    const qty = parseInt(quantity);
    const funds = parseEther('0.002');  // oracle fee only
    alert('outcome: ' + selectedMarket.outcomes[outcome] + ' qty:' + qty + ' price:' + Math.round(price * 1e18));
    if (window.ethereum) {
      const ethers = await import('ethers');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(MARKET_ADDRESS, BPAMarketABI.abi, signer);
      try {
        await contract.submitOrder(
          selectedMarket.id,
          selectedMarket.outcomes[outcome],
          qty,
          ethers.parseEther(price.toFixed(18)),
          side === 'buy' ? 0 : 1,
          {value: funds}
        );
      } catch(e) { if (!e.message?.includes('rejected')) alert('Error: ' + (e.reason || e.message)); }
    }
  }

  function handlePoI() {
    if (!selectedMarket) return;
    const poiMarketId = selectedMarket.id + 1;
    writeContract({
      address: MARKET_ADDRESS,
      abi: BPAMarketABI.abi,
      functionName: 'submitOrder',
      args: [poiMarketId, 0, outcome, 1, Math.round(parseFloat(limitPrice) * 1e18)],
      value: parseEther('0.001'),
    });
  }

  function toggleAgent() {
    setAgentActive(a => {
      if (!a) setAgentLog(l => [...l, `[${new Date().toLocaleTimeString()}] Agent started.`]);
      else setAgentLog(l => [...l, `[${new Date().toLocaleTimeString()}] Agent stopped.`]);
      return !a;
    });
  }

  async function loadCalendarEvents() {
    setCalendarLoading(true);
    try {
      const provider = new (await import('ethers')).ethers.JsonRpcProvider(RPC_URL);
      const contract = new (await import('ethers')).ethers.Contract(CALENDAR_ADDRESS, EventCalendarABI.abi, provider);
      const events = await contract.getApprovedEvents();
      setCalendarEvents(events);
    } catch (e) { console.error(e); }
    setCalendarLoading(false);
  }

  function proposeEvent() {
    if (!newEventName || !newEventDate) return;
    const outcomes = newEventOutcomes.split(',').map(s => s.trim());
    const dateUnix = Math.floor(new Date(newEventDate).getTime() / 1000);
    writeContract({
      address: CALENDAR_ADDRESS,
      abi: EventCalendarABI.abi,
      functionName: 'proposeEvent',
      args: [newEventName, outcomes, dateUnix, 'sport'],
      value: parseEther(MIN_STAKE),
    });
  }

  function voteEvent(eventId, approve) {
    writeContract({
      address: CALENDAR_ADDRESS,
      abi: EventCalendarABI.abi,
      functionName: 'vote',
      args: [eventId, approve],
      value: parseEther(MIN_STAKE),
    });
  }

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="logo">BPA Market — Web4 Prediction Market</div>
        <div className="header-right">
          <button className={!daoTab ? 'nav-btn active' : 'nav-btn'} onClick={() => setDaoTab(false)}>Markets</button>
          <button className={daoTab ? 'nav-btn active' : 'nav-btn'} onClick={() => { setDaoTab(true); setProfileTab(false); loadCalendarEvents(); }}>DAO Calendar</button>
          <button className={profileTab ? 'nav-btn active' : 'nav-btn'} onClick={() => { setProfileTab(true); setDaoTab(false); }}>My Profile</button>
          <ConnectButton />
        </div>
      </header>

      {!daoTab && !profileTab ? (
        <div className="main-layout">
          <div className="market-list">
            <div className="market-list-header">
              <span>Markets</span>
              <button className="refresh-btn" onClick={() => {}}>Refresh</button>
            </div>
            {markets.map(m => (
              <div key={m.id} className={selectedMarket?.id === m.id ? 'market-item selected' : 'market-item'} onClick={() => setSelectedMarket(m)}>
                <div className="market-name">{m.name}</div>
                <div className="market-status">Open</div>
              </div>
            ))}
          </div>

          {selectedMarket && (
            <div className="market-detail">
              <h2>{selectedMarket.name}</h2>
              <div className="tabs">
                <button className={tab === 'order' ? 'tab active' : 'tab'} onClick={() => setTab('order')}>Manual Order</button>
                <button className={tab === 'parimutuel' ? 'tab active' : 'tab'} onClick={() => setTab('parimutuel')}>Parimutuel</button>
                <button className={tab === 'agent' ? 'tab active' : 'tab'} onClick={() => setTab('agent')}>AI Agent</button>
              </div>

              {tab === 'order' && (
                <div className="order-form">
                  <form onSubmit={handleOrder}>
                    <div className="form-group">
                      <label>Side</label>
                      <div className="side-buttons">
                        <button type="button" className={side === 'buy' ? 'side-btn buy active' : 'side-btn buy'} onClick={() => setSide('buy')}>Buy</button>
                        <button type="button" className={side === 'sell' ? 'side-btn sell active' : 'side-btn sell'} onClick={() => setSide('sell')}>Sell</button>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Outcome</label>
                      <div className="outcome-buttons">
                        {selectedMarket.outcomes.map((o, i) => (
                          <button type="button" key={i} className={outcome === i ? 'outcome-btn active' : 'outcome-btn'} onClick={() => setOutcome(i)}>{o}</button>
                        ))}
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Quantity</label>
                      <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} min="1" required />
                    </div>
                    <div className="form-group">
                      <label>Limit Price (0-1)</label>
                      <input type="number" value={limitPrice} onChange={e => setLimitPrice(e.target.value)} min="0.01" max="0.99" step="0.01" required />
                    </div>
                    <div className="form-group toggle-group">
                      <label>Order Type</label>
                      <button type="button" className={limitPrice === '0.999' ? 'toggle on' : 'toggle off'} onClick={() => setLimitPrice(limitPrice === '0.999' ? '0.5' : '0.999')}>
                        {limitPrice === '0.999' ? 'Market Order' : 'Limit Order'}
                      </button>
                    </div>

                    <button type="submit" className="submit-btn">Submit Order</button>
                  </form>


                </div>
              )}

              {tab === 'parimutuel' && (
                <div className="order-form">
                  <h3 style={{marginBottom:'16px',color:'#c9a84c'}}>Parimutuel Betting</h3>
                  <div className="form-group">
                    <label>Select outcomes and enter amount (ETH)</label>
                    {selectedMarket && selectedMarket.outcomes.map((o, i) => (
                      <div key={i} style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'8px'}}>
                        <span style={{width:'120px',color:'#e2e8f0'}}>{o}</span>
                        <input
                          type="number"
                          placeholder="0.00 ETH"
                          min="0"
                          step="0.001"
                          style={{width:'120px',padding:'6px',background:'#0f1117',border:'1px solid #2e3347',color:'#e2e8f0',borderRadius:'4px'}}
                          value={pariAmounts[i] || ''}
                          onChange={e => setPariAmounts(prev => ({...prev, [i]: e.target.value}))}
                        />
                      </div>
                    ))}
                  </div>
                  <div style={{color:'#8892a4',fontSize:'0.8rem',marginBottom:'12px'}}>
                    💡 Parimutuel Player: bet on any outcome → PoI counted, win/lose on your stake<br/>
                    💡 LP Provider: stake on ALL outcomes proportionally → maintain liquidity, earn LP fee (PoI not counted — you are not predicting, you are providing liquidity)
                  </div>
                  <button className="submit-btn" onClick={async () => {
                    if (!selectedMarket) return;
                    const filledIndex = selectedMarket.outcomes.findIndex((_, i) => parseFloat(pariAmounts[i] || '0') > 0);
                    const o = filledIndex >= 0 ? selectedMarket.outcomes[filledIndex] : selectedMarket.outcomes[0];
                    const amount = filledIndex >= 0 ? parseFloat(pariAmounts[filledIndex] || '0') : 0;
                    if (amount > 0 && window.ethereum) {
                      try {
                        const { BrowserProvider, Contract, parseEther: pe } = await import('ethers');
                        const provider = new BrowserProvider(window.ethereum);
                        const signer = await provider.getSigner();
                        const contract = new Contract(MARKET_ADDRESS, BPAMarketABI.abi, signer);
                        await contract.submitOrder(
                          selectedMarket.id, o, 1,
                          pe('0.999'),
                          0,
                          {value: pe('0.002')}
                        );
                      } catch(e) {
                        if (!e.message?.includes('rejected')) alert('Error: ' + e.reason || e.message);
                      }
                    }
                  }}>Place Bets</button>
                  <div className="poi-section" style={{marginTop:'16px'}}>
                    <div className="form-group" style={{marginBottom:'8px'}}>
                      <label>Total Amount (ETH)</label>
                      <input type="number" placeholder="0.00" min="0" step="0.001"
                        style={{width:'120px',padding:'6px',background:'#0f1117',border:'1px solid #2e3347',color:'#e2e8f0',borderRadius:'4px'}}
                        value={lpAmount} onChange={e => setLpAmount(e.target.value)} />
                    </div>
                    <button className="poi-btn" onClick={async () => {
                      if (!selectedMarket || !lpAmount || parseFloat(lpAmount) <= 0) return;
                      if (window.ethereum) {
                        const { BrowserProvider, Contract, parseEther: pe } = await import('ethers');
                        const provider = new BrowserProvider(window.ethereum);
                        const signer = await provider.getSigner();
                        const contract = new Contract(MARKET_ADDRESS, BPAMarketABI.abi, signer);
                        try {
                        await contract.submitSeedOrder(selectedMarket.id, {value: pe(parseFloat(lpAmount).toFixed(6))});
                        } catch(e) { if (!e.message?.includes('rejected')) alert('Error: ' + (e.reason || e.message)); }
                      }
                      if (!selectedMarket) return;
                      let totalAmount = 0;
                      selectedMarket.outcomes.forEach((o, i) => {
                        totalAmount += parseFloat(pariAmounts[i] || '0');
                      });
                      if (totalAmount > 0) {
                        writeContract({
                          address: MARKET_ADDRESS,
                          abi: BPAMarketABI.abi,
                          functionName: 'submitSeedOrder',
                          args: [selectedMarket.id],
                          value: parseEther(totalAmount.toFixed(6)),
                        });
                      }
                    }}>💧 Provide Liquidity (LP Seed)</button>
                    <small>Must have PoI NFT — earn LP fee, liquidity provider role</small>
                  </div>
                </div>
              )}
              {tab === 'agent' && (
                <div className="agent-form">
                  <div className="agent-block">
                    <h3>1. Category & Model</h3>
                    <div className="category-buttons">
                      {['sport', 'politics', 'weather', 'rare', 'finance'].map(cat => (
                        <button key={cat} className={agentCategory === cat ? 'cat-btn active' : 'cat-btn'} onClick={() => setAgentCategory(cat)}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="agent-block">
                    <h3>2. Distortion Settings</h3>
                    <div className="form-group">
                      <label>Coefficient Format</label>
                      <div className="format-buttons">
                        {['decimal', 'american', 'fractional'].map(f => (
                          <button key={f} className="fmt-btn">{f.charAt(0).toUpperCase() + f.slice(1)}</button>
                        ))}
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Direction</label>
                      <div className="side-buttons">
                        <button className={distortionDirection === 'overvalued' ? 'side-btn active' : 'side-btn'} onClick={() => setDistortionDirection('overvalued')}>Market Overvalues</button>
                        <button className={distortionDirection === 'undervalued' ? 'side-btn active' : 'side-btn'} onClick={() => setDistortionDirection('undervalued')}>Market Undervalues</button>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Min Distortion Threshold: {minDistortion}%</label>
                      <input type="range" min="1" max="50" value={minDistortion} onChange={e => setMinDistortion(e.target.value)} />
                    <div className="form-group"><label><input type="checkbox" checked={crossingOnly} onChange={e => setCrossingOnly(e.target.checked)} style={{marginRight:"8px"}}/> Only if predicted winner changes (crossing 50%)</label></div>
                    </div>
                  </div>
                  <div className="agent-block">
                    <h3>3. Risk Management</h3>
                    <div className="form-group">
                      <label>Max Risk per Bet: {maxRisk}% of capital</label>
                      <input type="range" min="1" max="20" value={maxRisk} onChange={e => setMaxRisk(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Max Open Positions: {maxPositions}</label>
                      <input type="range" min="1" max="10" value={maxPositions} onChange={e => setMaxPositions(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Stop Loss: {stopLoss}%</label>
                      <input type="range" min="5" max="50" value={stopLoss} onChange={e => setStopLoss(e.target.value)} />
                    </div>
                  </div>
                  <div className="agent-block">
                    <h3>4. Agent Management</h3>
                    <div className="agent-poi-display" style={{background:'#1a1d2e',borderRadius:'8px',padding:'12px',marginBottom:'12px',border:'1px solid #c9a84c'}}>
                      <div style={{color:'#c9a84c',fontWeight:'600',marginBottom:'8px'}}>🤖 Agent PoI Score</div>
                      <div style={{color:'#e2e8f0',fontSize:'1.2rem',marginBottom:'8px'}}>
                        Total: {agentPoIData ? (Number(agentPoIData[0]) / 1e18).toFixed(4) : '—'}
                      </div>
                      <div style={{fontSize:'0.8rem',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px'}}>
                        <span style={{color:'#8892a4'}}>⚽ Sport:</span><span style={{color: footballPoI && Number(footballPoI[0]) >= 0 ? '#22c55e' : '#f87171'}}>{footballPoI ? (Number(footballPoI[0]) / 1e18).toFixed(4) : '0'}</span>
                        <span style={{color:'#8892a4'}}>💰 Finance:</span><span style={{color: financePoI && Number(financePoI[0]) >= 0 ? '#22c55e' : '#f87171'}}>{financePoI ? (Number(financePoI[0]) / 1e18).toFixed(4) : '0'}</span>
                        <span style={{color:'#8892a4'}}>🗳️ Politics:</span><span style={{color: politicsPoI && Number(politicsPoI[0]) >= 0 ? '#22c55e' : '#f87171'}}>{politicsPoI ? (Number(politicsPoI[0]) / 1e18).toFixed(4) : '0'}</span>
                        <span style={{color:'#8892a4'}}>🌤️ Weather:</span><span style={{color: weatherPoI && Number(weatherPoI[0]) >= 0 ? '#22c55e' : '#f87171'}}>{weatherPoI ? (Number(weatherPoI[0]) / 1e18).toFixed(4) : '0'}</span>
                        <span style={{color:'#8892a4'}}>⚡ Rare:</span><span style={{color: rarePoI && Number(rarePoI[0]) >= 0 ? '#22c55e' : '#f87171'}}>{rarePoI ? (Number(rarePoI[0]) / 1e18).toFixed(4) : '0'}</span>
                      </div>
                      <div style={{color:'#8892a4',fontSize:'0.75rem',marginTop:'6px'}}>
                        Total predictions: {agentPoIData ? Number(agentPoIData[1]).toString() : '0'}
                      </div>
                      <div style={{marginTop:'8px',fontSize:'0.85rem'}}>
                        {(() => {
                          const count = agentPoIData ? Number(agentPoIData[1]) : 0;
                          const total = agentPoIData ? Number(agentPoIData[0]) / 1e18 : 0;
                          const avg = count > 0 ? total / count : 0;
                          if (count >= 200 && avg > 0.40) return <span style={{color:'#a855f7'}}>🔮 Oracle</span>;
                          if (count >= 100 && avg > 0.25) return <span style={{color:'#06b6d4'}}>💎 Platinum</span>;
                          if (count >= 50 && avg > 0.15) return <span style={{color:'#c9a84c'}}>🥇 Gold</span>;
                          if (count >= 20 && avg > 0.05) return <span style={{color:'#9ca3af'}}>🥈 Silver</span>;
                          if (count >= 10 && avg > 0.00) return <span style={{color:'#92400e'}}>🥉 Bronze</span>;
                          return <span style={{color:'#8892a4'}}>— Unranked</span>;
                        })()}
                      </div>
                    </div>
                    <div className="agent-status">
                      <span className={agentActive ? 'status-dot active' : 'status-dot'} />
                      <span>{agentActive ? 'Active' : 'Inactive'}</span>
                      <button className={agentActive ? 'agent-btn stop' : 'agent-btn start'} onClick={toggleAgent}>
                        {agentActive ? '■ Stop Agent' : '▶ Start Agent'}
                      </button>
                    </div>
                    <div className="agent-log">
                      {agentLog.length === 0 ? <p>No activity yet</p> : agentLog.map((log, i) => <p key={i}>{log}</p>)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : profileTab ? (
        <div className="profile-panel">
          <h2 style={{color:'#c9a84c',marginBottom:'20px'}}>👤 My Profile</h2>
          {address ? (
            <div>
              <div style={{background:'#1a1d2e',borderRadius:'8px',padding:'16px',marginBottom:'16px',border:'1px solid #2e3347'}}>
                <div style={{color:'#8892a4',fontSize:'0.85rem',marginBottom:'4px'}}>Wallet Address</div>
                <div style={{color:'#e2e8f0',fontFamily:'monospace'}}>{address}</div>
              </div>
              <div style={{background:'#1a1d2e',borderRadius:'8px',padding:'16px',marginBottom:'16px',border:'1px solid #c9a84c'}}>
                <div style={{color:'#c9a84c',fontWeight:'600',marginBottom:'12px'}}>🏆 My PoI Score</div>
                <div style={{fontSize:'1.5rem',color:'#e2e8f0',marginBottom:'8px'}}>
                  {agentPoIData ? (Number(agentPoIData[0]) / 1e18).toFixed(4) : '0.0000'}
                </div>
                <div style={{fontSize:'0.8rem',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px'}}>
                  <span style={{color:'#8892a4'}}>⚽ Sport:</span><span style={{color:'#22c55e'}}>{footballPoI ? (Number(footballPoI[0]) / 1e18).toFixed(4) : '0'}</span>
                  <span style={{color:'#8892a4'}}>💰 Finance:</span><span style={{color:'#22c55e'}}>{financePoI ? (Number(financePoI[0]) / 1e18).toFixed(4) : '0'}</span>
                  <span style={{color:'#8892a4'}}>🗳️ Politics:</span><span style={{color:'#22c55e'}}>{politicsPoI ? (Number(politicsPoI[0]) / 1e18).toFixed(4) : '0'}</span>
                  <span style={{color:'#8892a4'}}>🌤️ Weather:</span><span style={{color:'#22c55e'}}>{weatherPoI ? (Number(weatherPoI[0]) / 1e18).toFixed(4) : '0'}</span>
                  <span style={{color:'#8892a4'}}>⚡ Rare:</span><span style={{color:'#22c55e'}}>{rarePoI ? (Number(rarePoI[0]) / 1e18).toFixed(4) : '0'}</span>
                </div>
                <div style={{marginTop:'12px'}}>
                  {(() => {
                    const count = agentPoIData ? Number(agentPoIData[1]) : 0;
                    const total = agentPoIData ? Number(agentPoIData[0]) / 1e18 : 0;
                    const avg = count > 0 ? total / count : 0;
                    if (count >= 200 && avg > 0.40) return <span style={{color:'#a855f7',fontSize:'1.1rem'}}>🔮 Oracle Level</span>;
                    if (count >= 100 && avg > 0.25) return <span style={{color:'#06b6d4',fontSize:'1.1rem'}}>💎 Platinum Level</span>;
                    if (count >= 50 && avg > 0.15) return <span style={{color:'#c9a84c',fontSize:'1.1rem'}}>🥇 Gold Level</span>;
                    if (count >= 20 && avg > 0.05) return <span style={{color:'#9ca3af',fontSize:'1.1rem'}}>🥈 Silver Level</span>;
                    if (count >= 10 && avg > 0.00) return <span style={{color:'#92400e',fontSize:'1.1rem'}}>🥉 Bronze Level</span>;
                    return <span style={{color:'#8892a4',fontSize:'1.1rem'}}>— Unranked</span>;
                  })()}
                </div>
              </div>
            </div>
          ) : (
            <div style={{color:'#8892a4',textAlign:'center',padding:'40px'}}>
              Please connect your wallet to view your profile.
            </div>
          )}
        </div>
      ) : (
        <div className="dao-panel">
          <div className="dao-propose">
            <h2>Propose New Event</h2>
            <div className="form-group">
              <label>Event Name</label>
              <input type="text" value={newEventName} onChange={e => setNewEventName(e.target.value)} placeholder="e.g. England vs Ghana - World Cup" />
            </div>
            <div className="form-group">
              <label>Outcomes (comma separated)</label>
              <input type="text" value={newEventOutcomes} onChange={e => setNewEventOutcomes(e.target.value)} placeholder="Home,Draw,Away" />
            </div>
            <div className="form-group">
              <label>Event Date</label>
              <input type="date" value={newEventDate} onChange={e => setNewEventDate(e.target.value)} />
            </div>
            <button className="submit-btn" onClick={proposeEvent}>Propose Event</button>
          </div>
          <div className="dao-events">
            <h2>Approved Events</h2>
            <button className="refresh-btn" onClick={loadCalendarEvents}>Refresh</button>
            {calendarLoading ? <p>Loading...</p> : calendarEvents.map((ev, i) => (
              <div key={i} className="event-card">
                <div className="event-name">{ev.name}</div>
                <div className="event-outcomes">{ev.outcomes?.join(', ')}</div>
                <div className="event-actions">
                  <button className="vote-btn yes" onClick={() => voteEvent(ev.id, true)}>✓ Approve</button>
                  <button className="vote-btn no" onClick={() => voteEvent(ev.id, false)}>✗ Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;