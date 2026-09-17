# Blazely Protocol Documentation

> The on-chain launchpad protocol with bonding-curve liquidity, realtime trade indexing, and automatic Uniswap graduation.

---

## Table of Contents

- [Introduction](#introduction)
- [What Is Blazely?](#what-is-blazely)
- [How It Works](#how-it-works)
- [Getting Started](#getting-started)
- [Creating a Token](#creating-a-token)
- [Trading on the Bonding Curve](#trading-on-the-bonding-curve)
- [Token Graduation](#token-graduation)
- [The Trading Terminal](#the-trading-terminal)
- [Cross-Chain Bridge](#cross-chain-bridge)
- [Token Locking Vault](#token-locking-vault)
- [Leaderboard](#leaderboard)
- [Profile & Portfolio](#profile--portfolio)
- [AI Support Assistant](#ai-support-assistant)
- [Architecture Overview](#architecture-overview)
- [Smart Contracts](#smart-contracts)
- [Event Indexing Service](#event-indexing-service)
- [Realtime Data Pipeline](#realtime-data-pipeline)
- [Frontend Technology Stack](#frontend-technology-stack)
- [Database Schema](#database-schema)
- [Deployment Guide](#deployment-guide)
- [Environment Variables](#environment-variables)
- [Security Considerations](#security-considerations)
- [FAQ](#faq)
- [Risk Disclosure](#risk-disclosure)

---

## Introduction

Blazely is a decentralized token launchpad protocol deployed on EVM-compatible blockchains. It enables anyone to deploy a new ERC-20 token in a single transaction with instant bonding-curve liquidity — no manual liquidity seeding, no market makers, no DEX listing fees required.

The protocol automatically graduates tokens from the internal bonding curve to a Uniswap pool once a liquidity threshold is reached, creating a frictionless path from zero to full DEX liquidity.

This documentation covers everything from user-facing features to deep technical architecture, deployment instructions, and security considerations.

---

## What Is Blazely?

Blazely solves the **cold-start liquidity problem** in token launches. Traditional token launches require founders to:

1. Write and deploy a smart contract
2. Manually seed a liquidity pool on a DEX (Uniswap, SushiSwap)
3. Provide both sides of the liquidity pair (token + ETH)
4. Manage market making and price discovery
5. Handle DEX listing coordination

This process is expensive, technically complex, and time-consuming. Blazely collapses all of this into a **single transaction**.

### Core Value Proposition

| Traditional Launch | Blazely Launch |
|---|---|
| Multi-day process | Under 60 seconds |
| Manual liquidity seeding | Automatic bonding curve |
| Requires technical knowledge | No coding required |
| DEX listing fees | Zero listing fees |
| Manual price discovery | Algorithmic price discovery |
| Separate market making | Built into the curve |

### Key Features

- **One-Click Token Deployment** — Deploy an ERC-20 token with logo, social links, and initial buy in a single transaction
- **Bonding Curve Liquidity** — Automatic price discovery via algorithmic bonding curve
- **Automatic Graduation** — Tokens graduate to Uniswap pools when the liquidity threshold is reached
- **Realtime Trade Indexing** — On-chain events captured and streamed to the UI in under one second
- **Cross-Chain Bridge** — Integrated deBridge widget supporting 25+ chains
- **Token Vesting Vault** — Timelock escrow with beneficiary assignment
- **AI Support Assistant** — Terminal-integrated chat for token metadata queries
- **Live Leaderboard** — Ranked token listings by market cap or 24h volume
- **Trading Terminal** — Full-featured terminal with charts, buy/sell, top holders, and comments

---

## How It Works

Blazely operates as a four-layer full-stack protocol. Here is the end-to-end flow from token creation to trading:

### Step 1: Token Creation

A user connects their wallet and visits the Create Token page. They provide:

- Token name and symbol
- Logo image (uploaded to Supabase Storage)
- Social links (website, Twitter, Telegram)
- Optional initial buy amount (ETH)

The frontend calls the `create()` function on the Launchpad smart contract, which:

1. Deploys a new `LaunchpadToken` contract with the specified name, symbol, and initial supply
2. Registers the token in the bonding curve
3. If an initial buy amount was provided, purchases tokens along the curve with the sent ETH
4. Emits a `TokenCreated` event
5. The frontend saves token metadata (logo, socials) to Supabase

### Step 2: Bonding Curve Trading

Once a token is created, anyone can buy or sell it through the bonding curve:

- **Buying:** A user sends ETH to the `buy()` function and receives tokens at the current curve price
- **Selling:** A user approves the launchpad contract to spend their tokens, then calls `sell()` to return tokens and receive ETH

The bonding curve mathematically determines the price based on the total supply and the amount of ETH in the pool. As more people buy, the price increases along the curve. As people sell, the price decreases.

### Step 3: Realtime Indexing

Every `Bought` and `Sold` event is captured by the event indexing service (`listen-and-save.js`):

1. A Node.js process maintains a WebSocket connection to an RPC provider
2. When a `Bought` or `Sold` event is emitted, the listener captures it
3. The listener calls `getPriceUsd()` on the contract to compute the USD value
4. The transaction is upserted into the Supabase `transactions` table (using `tx_hash` as the unique key)
5. Supabase Realtime fires a `postgres_changes` event to all subscribed frontend clients
6. The UI updates in under one second — trade ticker, token cards, charts, and counters

### Step 4: Token Graduation

When a token's bonding curve reaches 100% (the liquidity threshold is met), the token "graduates":

1. The protocol automatically creates a Uniswap V2 liquidity pool
2. The bonding curve liquidity is migrated to the Uniswap pool
3. The token is now tradeable on Uniswap with standard AMM mechanics
4. The token card displays a `[ STATUS: GRADUATED ]` badge
5. The trading terminal switches to the graduated view with Uniswap pool data

---

## Getting Started

### Prerequisites

- A Web3 wallet (MetaMask, WalletConnect, Coinbase Wallet, or any wallet supported by ConnectKit)
- ETH on the Sepolia testnet for gas and trading
- A modern web browser (Chrome, Firefox, Safari, Edge)

### Connecting Your Wallet

1. Navigate to the Blazely application
2. On the welcome screen, click "Enter Protocol"
3. Click the "Connect Wallet" button in the top navigation bar
4. Select your wallet provider (MetaMask, WalletConnect, etc.)
5. Approve the connection request in your wallet
6. Your wallet address will appear in the navigation bar

### Getting Testnet ETH

Since Blazely runs on Sepolia testnet, you need testnet ETH:

1. Visit a Sepolia faucet (search "Sepolia faucet" on Google)
2. Paste your wallet address
3. Receive testnet ETH (usually 0.5-2 ETH)
4. Use this ETH for gas fees and trading on Blazely

---

## Creating a Token

### Step-by-Step Guide

1. **Connect your wallet** (see Getting Started above)
2. **Click "Launch App"** then navigate to the Create Token page
3. **Fill in token details:**
   - **Name:** The full name of your token (e.g., "NovaPad")
   - **Symbol:** The ticker symbol (e.g., "NOVA") — 3-6 characters recommended
   - **Description:** A brief description of your project
4. **Upload a logo:**
   - Click the upload area
   - Select a square image (PNG, JPG, or WebP)
   - Recommended size: 256x256px or larger
   - The logo is stored in Supabase Storage
5. **Add social links (optional):**
   - Website URL
   - Twitter/X handle
   - Telegram group link
6. **Set initial buy (optional):**
   - Enter the amount of ETH you want to use for an initial buy
   - This gives you an initial token holding
7. **Review and deploy:**
   - Click "Deploy Token"
   - Your wallet will prompt you to confirm the transaction
   - Wait for block confirmation (usually 5-15 seconds on Sepolia)
8. **Token is live:**
   - Your token appears in the token registry feed
   - It is immediately tradeable on the bonding curve
   - Other users can find it via search, trending, or the leaderboard

### Token Creation Costs

- **Gas fee:** The transaction requires gas (paid in ETH)
- **Initial buy (optional):** Any ETH you choose to spend for an initial token allocation
- **No platform fee:** Token creation is free (only gas costs apply)

---

## Trading on the Bonding Curve

### How the Bonding Curve Works

The bonding curve is a mathematical formula that determines the token price based on the current state of the pool. Key properties:

- **Price increases with buys:** As more ETH enters the pool, the token price rises along the curve
- **Price decreases with sells:** As tokens are sold back, the price drops along the curve
- **Continuous liquidity:** The curve always provides executable prices — no order book, no slippage gaps
- **Deterministic pricing:** The price is purely a function of the pool state, not market sentiment

### Buying Tokens

1. **Navigate to a token page** by clicking any token card in the registry feed
2. **Find the Buy/Sell panel** on the right side of the trading terminal
3. **Enter the amount of ETH** you want to spend
4. **Review the estimated output:**
   - The panel shows the estimated token amount you will receive
   - The current price per token is displayed
5. **Click "Buy":**
   - Your wallet prompts you to confirm the transaction
   - Wait for block confirmation
   - The token card flashes with a buy animation
   - The trade appears in the realtime trade ticker at the top of the page
   - Your token balance updates

### Selling Tokens

1. **Navigate to the token page**
2. **Find the Buy/Sell panel**
3. **Switch to the Sell tab**
4. **Enter the amount of tokens** you want to sell
5. **First-time sellers: Approve the contract:**
   - If you have not sold this token before, you need to approve the launchpad contract to transfer your tokens
   - Click "Approve" — your wallet prompts a transaction
   - Wait for approval confirmation
   - This is a one-time operation per token
6. **Click "Sell":**
   - Your wallet prompts you to confirm the transaction
   - Wait for block confirmation
   - You receive ETH from the bonding curve
   - The trade appears in the realtime ticker

### Understanding the Progress Bar

Each token card displays a bonding curve progress bar:

- **0% — 99%:** The token is still on the bonding curve
- **100%:** The token has graduated to Uniswap
- The progress percentage represents how close the token is to graduation
- Higher progress means the price has risen significantly and the liquidity pool has grown

---

## Token Graduation

### What Is Graduation?

When a token's bonding curve reaches 100%, the protocol automatically "graduates" the token:

1. A Uniswap V2 liquidity pool is created
2. The bonding curve's liquidity (token + ETH) is deposited into the Uniswap pool
3. The token is now tradeable on Uniswap with standard AMM (Automated Market Maker) mechanics
4. The bonding curve is no longer used for this token

### What Changes After Graduation?

| Before Graduation | After Graduation |
|---|---|
| Trading via bonding curve | Trading via Uniswap AMM |
| Price set by curve formula | Price set by Uniswap x*y=k formula |
| No slippage (curve guarantees price) | Standard AMM slippage applies |
| Progress bar shows curve fill | "GRADUATED" badge displayed |
| Standard trading terminal | Graduated trading terminal with Uniswap data |

### How to Check Graduation Status

- On the token card, look for the `[ STATUS: GRADUATED ]` badge
- On the token page, the bonding curve progress bar shows 100%
- The trading terminal switches to the graduated view automatically

---

## The Trading Terminal

The token information page (`/token/:address`) is a full-featured trading terminal with the following components:

### Token Header

- Token name and symbol
- Logo image
- Current price (updates in realtime)
- Market cap
- 24h volume
- Social links (website, Twitter, Telegram)
- Bonding curve progress bar

### Chart Panel

- Candlestick chart powered by TradingView's lightweight-charts library
- Timeframe selector: 5m, 1H, 1D
- Metric toggle: Price or Market Cap
- Realtime candle updates

### Buy/Sell Panel

- Tab switcher between Buy and Sell
- ETH input field with quick-amount buttons
- Estimated token output
- Current price display
- Approve flow for selling (ERC-20 allowance)
- Transaction status indicators (pending, success, error)
- Slippage and balance validation

### Top Holders

- List of top token holders by balance
- Holder addresses (truncated)
- Percentage of total supply
- Realtime updates

### Recent Transactions

- List of recent buy/sell transactions for this token
- Trader address, type (buy/sell), ETH amount, token amount
- Transaction hash link to block explorer
- Realtime updates via Supabase

### Comments

- Community comment section for each token
- Requires wallet connection to post
- Comments stored in Supabase
- Realtime updates

### Bonding Curve Progress

- Visual progress bar showing how close the token is to graduation
- Percentage display
- Animated fill with spring physics
- "GRADUATED" badge when complete

---

## Cross-Chain Bridge

Blazely integrates the deBridge widget for cross-chain asset transfers.

### How to Use the Bridge

1. **Navigate to the Bridge page** from the navigation menu
2. **Wait for the widget to load** (the deBridge script loads asynchronously)
3. **Select input chain** — Choose from 25+ supported chains including:
   - Ethereum Mainnet (Chain ID: 1)
   - Optimism (Chain ID: 10)
   - BNB Smart Chain (Chain ID: 56)
   - Gnosis (Chain ID: 100)
   - Polygon (Chain ID: 137)
   - Base (Chain ID: 8453)
   - Arbitrum (Chain ID: 42161)
   - Avalanche (Chain ID: 43114)
   - And many more
4. **Select output chain** — Choose the destination chain
5. **Enter the amount** to bridge
6. **Select the token** to bridge
7. **Review the route** and fees
8. **Confirm the transaction** in your wallet
9. **Wait for completion** — The bridge typically completes in 1-10 minutes depending on the chains

### Supported Features

- Cross-chain token transfers
- Built-in swap during bridge (deSwap mode)
- Custom routing
- Real-time status tracking

---

## Token Locking Vault

The Locking page (`/locking`) provides a timelock escrow system for tokens and LP positions.

### How to Create a Lock

1. **Navigate to the Locking page** from the navigation menu
2. **Fill in the lock configuration:**
   - **Token Contract Address:** The ERC-20 contract address of the token to lock
   - **Amount to Lock:** The number of tokens to lock
   - **Lock Duration:** Choose from preset durations:
     - 7 Days
     - 30 Days
     - 90 Days
     - 180 Days
     - 365 Days
     - Custom Duration (enter any number of days)
   - **Beneficiary Address (optional):** The address that will receive the tokens when the lock expires. Defaults to your connected wallet address if left blank.
3. **Click "Create Escrow Lock"**
4. **Confirm the transaction** in your wallet
5. **Wait for block confirmation**
6. The lock appears in your active locks list

### Managing Active Locks

- **View all locks:** The active locks table shows all your locks with token name, amount, lock date, release date, and progress
- **Search:** Filter by token symbol or name
- **Filter by status:** All, Locked, or Matured
- **Progress tracking:** Each lock shows a progress bar with:
  - Percentage elapsed
  - Days remaining
  - ASCII-art progress bar (terminal style)
  - CSS progress bar
- **Unlock:** When a lock has matured (unlock date has passed), a "Release Locked Assets" button appears. Click it to claim your tokens.

### Lock Statistics

The dashboard displays aggregate statistics:
- Total locks created
- Total value locked (TVL)
- Active users
- Average lock duration

### Important Notes

- Locked tokens **cannot** be retrieved or transferred before the lock duration expires
- The beneficiary address is set at creation and cannot be changed
- Locks are on-chain and immutable — no admin override exists
- Always double-check the token address and amount before creating a lock

---

## Leaderboard

The Leaderboard page (`/leaderboard`) ranks all tokens on the protocol.

### Features

- **Sort by Market Cap:** Tokens ranked by current market capitalization
- **Sort by 24h Volume:** Tokens ranked by trading volume in the last 24 hours
- **Realtime updates:** Rankings update via Supabase Realtime channels
- **Animated transitions:** Tokens smoothly reposition when rankings change
- **Click to view:** Click any token to navigate to its trading terminal

### How Rankings Are Calculated

- **Market Cap:** Calculated as `current_price x total_supply`
- **24h Volume:** Sum of all trade USD values in the last 24 hours
- Data is sourced from the Supabase `top_tokens_ranked` view
- Rankings update in realtime as new trades are indexed

---

## Profile & Portfolio

### Your Profile

Navigate to the Profile page (`/profile`) to view:

- **Created Tokens:** Tokens you have deployed through the protocol
- **Portfolio Assets:** Tokens you currently hold
- **Transaction History:** Your complete trading history
- **Social Metrics:** Connected social accounts and metrics
- **Social Connect:** Link your Twitter, Telegram, and website

### Public Profile

Every wallet has a public profile page at `/user/:walletAddress`. This shows:

- The wallet's created tokens
- Their transaction history
- Public social links
- Portfolio holdings (if visible)

---

## AI Support Assistant

Blazely includes an AI-powered support assistant accessible from the home page.

### How to Use

1. **Click the chat icon** in the bottom-right corner of the home page
2. **Type your question** in the input field
3. **Press Enter or click Send**
4. The AI processes your request and returns a response

### What You Can Ask

- **Token information:** "Tell me about token 0x1234..."
- **Creator details:** "Who created $NOVA?"
- **Price data:** "What's the price of $BLZ?"
- **Market metrics:** "What's the market cap of $QNTM?"
- **Social links:** "What's the Twitter for $FLUX?"

### Response Format

The AI returns structured token detail cards with:
- Token name and symbol
- Current price
- Market cap
- Volume
- Creator address (with copy button)
- Social links (clickable)

---

## Architecture Overview

Blazely is a four-layer full-stack protocol:

```
+-----------------------------------------------------------+
|                    PRESENTATION LAYER                     |
|  React + Vite + Tailwind CSS + Framer Motion + ConnectKit |
|  Terminal-aesthetic dark UI (obsidian + signature teal)   |
+-----------------------------------------------------------+
|                    REALTIME DATA LAYER                     |
|  Supabase Postgres + Realtime Channels (postgres_changes)  |
|  WebSocket trade stream (sub-second price updates)         |
|  Batched flush buffers (150ms / 2500ms coalescing)         |
+-----------------------------------------------------------+
|                  EVENT INDEXING LAYER                      |
|  listen-and-save.js (Node.js ethers.js listener)           |
|  Backfill + realtime WebSocket event capture               |
|  Bought/Sold events -> USD computation -> Supabase upsert  |
+-----------------------------------------------------------+
|                   SMART CONTRACT LAYER                     |
|  LaunchpadFactory.sol -- token deployment factory          |
|  LaunchpadToken.sol -- ERC-20 token template               |
|  Bonding curve buy/sell with automatic graduation          |
+-----------------------------------------------------------+
```

### Data Flow: From On-Chain Event to User Screen

1. A user calls `buy()` or `sell()` on the Launchpad contract via the BuySell terminal
2. The contract emits a `Bought` or `Sold` event with token address, trader, ETH amount, and token amount
3. `listen-and-save.js` captures the event via WebSocket RPC, calls `getPriceUsd()` to compute USD value, and upserts into the Supabase `transactions` table
4. Supabase Realtime fires a `postgres_changes` INSERT event to all subscribed clients
5. The `TradeAlertsMarquee` renders the new trade in a scrolling ticker; `TokenInfoPage` spring-animates the market cap / price / volume counters; the `Home` feed reorders tokens by last-trade time
6. A parallel WebSocket stream pushes raw trade data for sub-second card-level price updates with buy-flash animations

---

## Smart Contracts

### LaunchpadToken.sol

A minimal, gas-optimized ERC-20 implementation:

```solidity
contract LaunchpadToken {
    string public name;
    string public symbol;
    uint8 public decimals = 18;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    constructor(string memory _name, string memory _symbol, uint256 _initialSupply, address _creator) {
        name = _name;
        symbol = _symbol;
        _mint(_creator, _initialSupply);
    }
}
```

**Key features:**
- Standard `transfer`, `approve`, `transferFrom` with zero-address validation
- Internal `_mint` used only at construction (no inflation, no admin minting)
- No admin functions, no pause, no upgradeability -- fully immutable

### LaunchpadFactory.sol

The factory contract that deploys new tokens:

```solidity
contract Launchpad {
    event TokenCreated(
        address indexed tokenAddress,
        address indexed creator,
        string name,
        string symbol,
        uint256 initialSupply,
        address indexed deployer
    );

    function createToken(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address creator
    ) public returns (address) {
        LaunchpadToken newToken = new LaunchpadToken(name, symbol, initialSupply, creator);
        emit TokenCreated(address(newToken), creator, name, symbol, initialSupply, msg.sender);
        return address(newToken);
    }
}
```

### Launchpad Contract (Deployed ABI)

The deployed launchpad contract (`BlazelyLaunchpad.json`) exposes:

| Function | Type | Description |
|---|---|---|
| `create(name, symbol)` | payable | Deploys a new token and optionally performs an initial buy |
| `buy(token)` | payable | Purchases tokens along the bonding curve with ETH |
| `sell(token, amount)` | nonpayable | Sells tokens back to the curve for ETH (requires approval) |
| `getPriceUsd(token)` | view | Returns the current USD-denominated token price (1e18 scaled) |

### Events

| Event | Parameters | Description |
|---|---|---|
| `TokenCreated` | tokenAddress, creator, name, symbol, initialSupply, deployer | Emitted when a new token is deployed |
| `Bought` | token, buyer, ethIn, tokensOut | Emitted when a buy occurs on the bonding curve |
| `Sold` | token, seller, tokensIn, ethOut | Emitted when a sell occurs on the bonding curve |

---

## Event Indexing Service

The `listen-and-save.js` file is a production Node.js service that bridges on-chain events to the Supabase database.

### How It Works

1. **Initialization:**
   - Connects to an HTTP RPC provider for block queries
   - Connects to a WebSocket RPC provider for realtime event listening
   - Creates ethers.js Contract instances with the launchpad ABI

2. **Backfill Mode** (`BACKFILL_ONLY=true`):
   - Fetches historical `Bought` and `Sold` events in chunks (default 5000 blocks per chunk)
   - Processes each event: fetches block timestamp, calls `getPriceUsd()`, computes USD value
   - Upserts each transaction to Supabase with `tx_hash` as the conflict key
   - Skips dust transactions below the USD threshold (default $5)
   - Exits after backfill is complete

3. **Realtime Mode** (default):
   - Registers WebSocket event listeners for `Bought` and `Sold` events
   - When an event is received, processes it identically to backfill
   - Automatically reconnects on WebSocket close (relies on process manager like pm2)
   - Heartbeat monitoring with ping/pong

### USD Computation

The service converts token amounts to USD using the contract's `getPriceUsd()` function:

```
usd = tokenAmount x priceUsdScaled / 1e36
```

Where:
- `tokenAmount` is the raw token amount (BigNumber)
- `priceUsdScaled` is the 1e18-scaled USD price from the contract
- The result is a 6-decimal USD string

### Running the Indexer

```bash
# Set environment variables
export SUPABASE_URL=your_supabase_url
export SUPABASE_KEY=your_supabase_service_role_key
export RPC_HTTP=your_http_rpc_url
export RPC_WS=your_websocket_rpc_url
export CONTRACT_ADDRESS=deployed_launchpad_address
export START_BLOCK=deployment_block_number
export CHUNK_SIZE=5000
export USD_THRESHOLD=5

# Run backfill only
BACKFILL_ONLY=true node listen-and-save.js

# Run realtime listener (after backfill)
node listen-and-save.js
```

### Recommended Process Management

Use pm2 or systemd to keep the indexer running:

```bash
# Using pm2
pm2 start listen-and-save.js --name blazely-indexer
pm2 save
pm2 startup

# Using systemd
# Create /etc/systemd/system/blazely-indexer.service
# Then: systemctl enable blazely-indexer && systemctl start blazely-indexer
```

---

## Realtime Data Pipeline

Blazely uses two parallel realtime pipelines for different latency requirements.

### Pipeline 1: Supabase Realtime (postgres_changes)

This pipeline uses Supabase's built-in Realtime feature to push database changes to connected clients.

**TradeAlertsMarquee:**
- Subscribes to INSERT events on the `transactions` table
- Renders new trades in a scrolling ticker at the top of the page
- Deduplicates by `tx_hash` to prevent duplicate alerts
- Emits buy events to the `buyEmitter` for card flash animations

**TokenInfoPage:**
- Subscribes to UPDATE events on the `tokens` table (filtered by token address)
- Uses a 2500ms flush buffer to coalesce rapid updates into smooth transitions
- Spring-animates market cap, price, and volume counters
- Updates the chart with new candle data

**TrendingTokens:**
- Subscribes to changes on `token_metrics_latest` and `tokens` tables
- Re-fetches the trending token list when any change occurs
- Displays the top 10 tokens by 24h volume

**Home Page:**
- Subscribes to token updates for live card reordering
- When a buy trade occurs, the corresponding token card moves to the front of the list (if sorted by "Last Trade")

### Pipeline 2: Direct WebSocket Trade Stream

This pipeline provides sub-second price updates for the token registry feed.

**How it works:**
1. The Home page establishes a WebSocket connection to a trade-stream server
2. Incoming trades are buffered in a `Map` keyed by token address
3. Every 150ms, the buffer is flushed via `requestAnimationFrame`
4. Each token's price and last-trade data are updated in the UI
5. Buy trades trigger `buyEmitter.emit("buy", address)` which causes the corresponding `TokenCard` to flash

**Resilience:**
- Heartbeat ping/pong every 20 seconds
- If no pong received within 40 seconds, the connection is closed
- Exponential backoff reconnection: 1s -> 1.5s -> 2.25s -> ... -> 30s max
- HTTPS detection: automatically upgrades `ws://` to `wss://` when loaded via HTTPS
- Loopback detection: skips localhost connections on public production domains

---

## Frontend Technology Stack

| Category | Technology |
|---|---|
| Framework | React 18 |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| Animation | Framer Motion (spring physics, layout animations) |
| Wallet | wagmi, viem, ConnectKit, WalletConnect |
| Charts | lightweight-charts (TradingView) |
| Backend | Supabase (Postgres, Realtime, Storage, Auth) |
| Event Indexing | Node.js, ethers.js, WebSocket RPC |
| Cross-Chain | deBridge widget (25+ chains) |
| Icons | lucide-react |
| Data Fetching | TanStack Query (React Query) |

### Design System

- **Background:** `#030712` (obsidian black), `#0b0f19` (panel surface)
- **Accent:** `#96d6cd` (signature teal) -- used for CTAs, active states, progress bars, buy indicators
- **Typography:** JetBrains Mono for data/labels, Inter for body text
- **Borders:** Slate-900 hairline borders, zero border-radius (industrial/terminal aesthetic)
- **Animations:** Framer Motion spring physics for counters, layout animations for tab indicators, AnimatePresence for route transitions

### Key Components

| Component | File | Purpose |
|---|---|---|
| Navbar | `components/Navbar.jsx` | Top navigation with wallet connect |
| Home | `pages/Home.jsx` | Token registry feed with filtering, sorting, search, pagination |
| CreateToken | `pages/CreateToken.jsx` | 3-step token deployment wizard |
| TokenInfoPage | `pages/TokenInfoPage.jsx` | Full trading terminal |
| BuySell | `components/BuySell.jsx` | Buy/sell swap panel |
| Chart | `components/Chart.jsx` | Candlestick chart |
| TokenCard | `components/TokenCard.jsx` | Token card for the registry feed |
| TradeAlertsMarquee | `components/TradeAlertsMarquee.jsx` | Realtime trade ticker |
| TrendingTokens | `components/TrendingTokens.jsx` | Trending tokens carousel |
| BondingCurveProgress | `components/BondingCurveProgress.jsx` | Animated progress bar |
| AIChatSupport | `components/AIChatSupport.jsx` | AI chat assistant |
| Bridge | `pages/Bridge.jsx` | deBridge cross-chain widget |
| Locking | `pages/Locking.jsx` | Token vesting vault |
| Leaderboard | `pages/Leaderboard.jsx` | Ranked token list |

### Key Hooks

| Hook | File | Purpose |
|---|---|---|
| useBuySellLogic | `hooks/useBuySellLogic.js` | Full swap lifecycle: allowance check -> approve -> buy/sell -> receipt |
| useTokenSocket | `hooks/useTokenSocket.js` | WebSocket connection for realtime token data |
| useTransactions | `hooks/useTransactions.js` | Fetches and subscribes to token transactions |

---

## Database Schema

### Tables

#### `tokens`

Stores metadata for all tokens created on the protocol.

| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| address | text | Token contract address (lowercase) |
| name | text | Token name |
| symbol | text | Token symbol |
| logo_path | text | Path to logo in Supabase Storage |
| telegram | text | Telegram link |
| website | text | Website URL |
| twitter | text | Twitter/X URL |
| graduated | boolean | Whether the token has graduated to Uniswap |
| created_at | timestamptz | Creation timestamp |
| market_cap | numeric | Current market cap |
| volume_24h | numeric | 24-hour trading volume |
| price | numeric | Current token price |
| last_trade_at | timestamptz | Timestamp of last trade |

#### `transactions`

Stores all buy/sell transactions indexed from the blockchain.

| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| tx_hash | text | Unique transaction hash (conflict key) |
| address | text | Token contract address (lowercase) |
| user_address | text | Trader wallet address (lowercase) |
| type | text | "buy" or "sell" |
| token_amount | text | Token amount (raw string) |
| eth_amount | text | ETH amount (decimal string) |
| usd_value | text | USD value (6-decimal string) |
| price_source | text | Price source (default: "launchpad_getPriceUsd") |
| block_number | integer | Block number of the transaction |
| created_at | timestamptz | Transaction timestamp |

#### `token_metrics_latest`

Stores the latest computed metrics for each token (used by TrendingTokens).

| Column | Type | Description |
|---|---|---|
| address | text | Token contract address |
| volume_24h | numeric | 24-hour volume |
| market_cap | numeric | Current market cap |

#### `top_tokens_ranked`

A view that ranks tokens by market cap and volume (used by Leaderboard).

#### `comments`

Stores community comments for each token.

| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| token_address | text | Token contract address |
| user_address | text | Commenter wallet address |
| content | text | Comment text |
| created_at | timestamptz | Comment timestamp |

### Storage

- **Bucket: `logos`** -- Stores token logo images uploaded during token creation
- Public URLs are generated via `supabase.storage.from('logos').getPublicUrl(path)`

### Realtime Channels

| Channel | Table | Event | Used By |
|---|---|---|---|
| `trade-alerts-stream` | transactions | INSERT | TradeAlertsMarquee |
| `realtime-trending-tokens` | token_metrics_latest, tokens | * | TrendingTokens |
| (dynamic) | tokens | UPDATE | TokenInfoPage |

---

## Deployment Guide

### Prerequisites

- Node.js 18+ and npm
- A Supabase project (with Postgres, Realtime, and Storage enabled)
- An Ethereum RPC provider (HTTP + WebSocket endpoints)
- A deployed Launchpad smart contract
- A WalletConnect project ID

### Step 1: Clone the Repository

```bash
git clone https://github.com/ayastech-hub/blazely
cd blazely
```

### Step 2: Install Frontend Dependencies

```bash
cd frontend
npm install
```

### Step 3: Configure Environment Variables

Create a `.env` file in the `frontend` directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
VITE_TRADES_WS=ws://localhost:8080
```

### Step 4: Set Up Supabase Database

Run the following SQL in your Supabase SQL editor:

```sql
-- Create tokens table
CREATE TABLE tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  address text UNIQUE NOT NULL,
  name text NOT NULL,
  symbol text NOT NULL,
  logo_path text,
  telegram text,
  website text,
  twitter text,
  graduated boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  market_cap numeric DEFAULT 0,
  volume_24h numeric DEFAULT 0,
  price numeric DEFAULT 0,
  last_trade_at timestamptz
);

-- Create transactions table
CREATE TABLE transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tx_hash text UNIQUE NOT NULL,
  address text NOT NULL,
  user_address text NOT NULL,
  type text NOT NULL,
  token_amount text,
  eth_amount text,
  usd_value text,
  price_source text DEFAULT 'launchpad_getPriceUsd',
  block_number integer,
  created_at timestamptz DEFAULT now()
);

-- Create comments table
CREATE TABLE comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  token_address text NOT NULL,
  user_address text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE tokens;

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true);
```

### Step 5: Deploy the Smart Contract

Deploy the Launchpad contract to your target chain (Sepolia for testing):

```bash
# Using Hardhat
npx hardhat compile
npx hardhat run scripts/deploy.js --network sepolia
```

Note the deployed contract address -- you will need it for the indexer and frontend ABI.

### Step 6: Configure and Run the Event Indexer

Create a `.env` file in the `frontend` directory (or wherever you run the indexer):

```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_role_key
RPC_HTTP=your_http_rpc_url
RPC_WS=your_websocket_rpc_url
CONTRACT_ADDRESS=your_deployed_contract_address
START_BLOCK=deployment_block_number
CHUNK_SIZE=5000
USD_THRESHOLD=5
```

Run the backfill first, then start the realtime listener:

```bash
# Backfill historical events
BACKFILL_ONLY=true node listen-and-save.js

# Start realtime listener
node listen-and-save.js
```

### Step 7: Start the Frontend

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

### Step 8: Build for Production

```bash
npm run build
npm run preview
```

The built files will be in the `dist/` directory and can be deployed to any static hosting provider (Vercel, Netlify, Cloudflare Pages, etc.).

---

## Environment Variables

### Frontend (`.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `VITE_WALLETCONNECT_PROJECT_ID` | Yes | WalletConnect project ID |
| `VITE_TRADES_WS` | No | WebSocket URL for the trade stream server (default: `ws://localhost:8080`) |

### Event Indexer (`.env`)

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_KEY` | Yes | Supabase service role key (server key, NOT the anon key) |
| `RPC_HTTP` | Yes | HTTP RPC endpoint URL |
| `RPC_WS` | Yes | WebSocket RPC endpoint URL |
| `CONTRACT_ADDRESS` | Yes | Deployed Launchpad contract address |
| `START_BLOCK` | No | Block to start backfill from (default: 0) |
| `END_BLOCK` | No | Optional end block for backfill (default: latest) |
| `CHUNK_SIZE` | No | Block chunk size for backfill (default: 5000) |
| `USD_THRESHOLD` | No | Minimum USD to store (default: 5) |
| `BACKFILL_ONLY` | No | If "true", run backfill and exit (default: false) |

---

## Security Considerations

### Smart Contract Security

- **No admin functions:** The LaunchpadToken contract has no admin functions, no minting after deployment, no pause, and no upgradeability. Once deployed, the token is fully immutable.
- **Zero-address validation:** All transfer functions validate against the zero address.
- **Allowance checks:** `transferFrom` checks both balance and allowance before executing.
- **Bonding curve math:** The bonding curve uses fixed-point arithmetic to prevent overflow/underflow.

### Frontend Security

- **No private keys:** The frontend only uses the Supabase anon key, which has no privileged access. All data access is controlled by Row Level Security (RLS) policies.
- **Wallet connection:** Wallet connection is handled by ConnectKit/wagmi, which uses standard WalletConnect protocols. No private keys are ever stored or transmitted.
- **Transaction signing:** All transactions are signed by the user's wallet. The frontend never has access to private keys.

### Event Indexer Security

- **Service role key:** The indexer uses the Supabase service role key, which bypasses RLS. This key should never be exposed to the frontend or stored in the browser.
- **Idempotent upserts:** All database writes use `tx_hash` as the conflict key, so reprocessing the same event is safe and will not create duplicates.
- **USD threshold:** Dust transactions below the threshold are skipped to prevent database bloat.

### Best Practices for Users

- **Always verify token addresses** before buying or selling
- **Check the bonding curve progress** -- tokens near graduation may have different risk profiles
- **Be aware of slippage** when selling (especially after graduation to Uniswap)
- **Never share your private keys** -- Blazely staff will never ask for them
- **Use a dedicated wallet** for interacting with new protocols

---

## FAQ

### General

**Q: What chain does Blazely run on?**
A: Blazely is currently deployed on the Sepolia testnet. Mainnet deployment is planned for Phase 3.

**Q: Do I need to code to create a token?**
A: No. The Create Token wizard handles everything -- just fill in the form, upload a logo, and confirm the transaction.

**Q: How much does it cost to create a token?**
A: You only pay gas fees (in ETH). There is no platform fee for token creation.

**Q: Can I create a token without an initial buy?**
A: Yes. The initial buy is optional. You can deploy the token and let others provide the first buy.

### Trading

**Q: What is a bonding curve?**
A: A bonding curve is a mathematical formula that determines the token price based on the pool's current state. As more ETH enters the pool (buys), the price increases. As ETH leaves (sells), the price decreases.

**Q: Is there slippage on the bonding curve?**
A: The bonding curve provides deterministic pricing -- the price you see is the price you get (minus gas). There is no order-book slippage. However, large trades relative to the pool size will move the price significantly.

**Q: What happens when a token graduates?**
A: The bonding curve liquidity is migrated to a Uniswap V2 pool. The token is then tradeable on Uniswap with standard AMM mechanics (including slippage).

**Q: Can I sell after graduation?**
A: Yes. After graduation, you sell through Uniswap instead of the bonding curve. The trading terminal handles this automatically.

### Locking

**Q: Can I unlock my tokens before the lock period ends?**
A: No. Locks are immutable on-chain. There is no admin override. Tokens can only be released after the lock duration expires.

**Q: Can I change the beneficiary address after creating a lock?**
A: No. The beneficiary is set at lock creation and cannot be changed.

**Q: What happens if I lock LP tokens?**
A: LP tokens represent your share of a liquidity pool. Locking them prevents you from withdrawing your liquidity until the lock expires.

### Bridge

**Q: How long does a bridge transfer take?**
A: Typically 1-10 minutes depending on the source and destination chains. Some chains may take longer.

**Q: What are the bridge fees?**
A: Bridge fees vary by chain and token. The deBridge widget displays the fees before you confirm the transaction.

---

## Risk Disclosure

> **RISK NOTE: SPECULATIVE PROTOCOL ASSETS INDUCE CAPITAL EXPOSURE. OPERATE WITH AUTONOMY.**

Trading tokens on bonding curves is a high-risk activity. Token prices are volatile and can go to zero. You should never invest more than you can afford to lose.

Key risks include:

- **Impermanent loss:** After graduation, providing liquidity on Uniswap exposes you to impermanent loss
- **Smart contract risk:** Despite audits and best practices, smart contracts may contain bugs
- **Liquidity risk:** Low-liquidity tokens may be difficult to sell without significant price impact
- **Rug risk:** Token creators may hold a large portion of the supply and could sell (rug pull)
- **Bridge risk:** Cross-chain bridges have historically been targets for exploits

Always do your own research (DYOR) before interacting with any token or protocol.

---

## License

MIT

---

## Links

- **Repository:** [github.com/ayastech-hub/blazely](https://github.com/ayastech-hub/blazely)
- **Supabase:** [supabase.com](https://supabase.com)
- **ConnectKit:** [docs.connectkit.io](https://docs.connectkit.io)
- **deBridge:** [debridge.com](https://debridge.com)
- **TradingView Charts:** [tradingview.com](https://tradingview.com)

---

*Last updated: July 2026*
