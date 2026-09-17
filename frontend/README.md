# BLAZELY

### The On-Chain Launchpad Protocol with Bonding-Curve Liquidity, Realtime Trade Indexing, and Cross-Chain Bridge Integration

---

## Executive Summary

**Blazely** is a production-grade decentralized token launchpad that eliminates the cold-start liquidity problem plaguing new token launches. By combining a Solidity bonding-curve smart contract, a realtime on-chain event indexer, and a terminal-aesthetic trading terminal, Blazely enables anyone to deploy a token in a single transaction with instant, continuous price discovery — no manual liquidity seeding, no market makers, no DEX listing fees.

The protocol automatically graduates tokens from the internal bonding curve to a Uniswap pool once a liquidity threshold is reached, creating a frictionless path from zero to full DEX liquidity. A cross-chain bridge (deBridge, 25+ chains), a token vesting vault, a live leaderboard, and an AI-powered support assistant round out a complete DeFi launch ecosystem.

**Target Market:** Token creators, traders, and DeFi protocols on EVM chains who need permissionless, instant, transparent token launches with built-in liquidity mechanics.

---

## High-Level Architecture

Blazely operates as a **four-layer full-stack protocol**:

```
┌─────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                     │
│  React + Vite + Tailwind CSS + Framer Motion + ConnectKit │
│  Terminal-aesthetic dark UI (obsidian + signature teal)   │
├─────────────────────────────────────────────────────────┤
│                    REALTIME DATA LAYER                     │
│  Supabase Postgres + Realtime Channels (postgres_changes)  │
│  WebSocket trade stream (sub-second price updates)         │
│  Batched flush buffers (150ms / 2500ms coalescing)         │
├─────────────────────────────────────────────────────────┤
│                  EVENT INDEXING LAYER                      │
│  listen-and-save.js (Node.js ethers.js listener)           │
│  Backfill + realtime WebSocket event capture               │
│  Bought/Sold events → USD computation → Supabase upsert    │
├─────────────────────────────────────────────────────────┤
│                   SMART CONTRACT LAYER                     │
│  LaunchpadFactory.sol — token deployment factory           │
│  LaunchpadToken.sol — ERC-20 token template                 │
│  Bonding curve buy/sell with automatic graduation          │
└─────────────────────────────────────────────────────────┘
```

### Data Flow: From On-Chain Event to User Screen

1. A user calls `buy()` or `sell()` on the Launchpad contract via the BuySell terminal
2. The contract emits a `Bought` or `Sold` event with token address, trader, ETH amount, and token amount
3. `listen-and-save.js` captures the event via WebSocket RPC, calls `getPriceUsd()` to compute USD value, and upserts into the Supabase `transactions` table
4. Supabase Realtime fires a `postgres_changes` INSERT event to all subscribed clients
5. The `TradeAlertsMarquee` renders the new trade in a scrolling ticker; `TokenInfoPage` spring-animates the market cap / price / volume counters; the `Home` feed reorders tokens by last-trade time
6. A parallel WebSocket stream pushes raw trade data for sub-second card-level price updates with buy-flash animations

---

## Technical Deep-Dive

### Smart Contract Layer

**`contracts/LaunchpadToken.sol`** — A minimal, gas-optimized ERC-20 implementation:

- Standard `transfer`, `approve`, `transferFrom` with zero-address validation
- Internal `_mint` used only at construction (no inflation, no admin minting)
- `Launchpad` factory contract deploys new tokens via `createToken(name, symbol, initialSupply, creator)` and emits `TokenCreated` events for off-chain indexing

**`contracts/LaunchpadFactory.json`** — Compiled ABI for the deployed launchpad contract, exposing:
- `create(name, symbol)` — payable function that deploys a token and optionally performs an initial buy
- `buy(token)` — payable; purchases tokens along the bonding curve with ETH
- `sell(token, amount)` — sells tokens back to the curve for ETH (requires ERC-20 approval)
- `getPriceUsd(token)` — view function returning the current USD-denominated token price (1e18 scaled)

### Event Indexing Layer (`listen-and-save.js`)

A production Node.js service that bridges on-chain events to the Supabase database:

- **Backfill mode** (`BACKFILL_ONLY=true`): Chunked historical log fetch (default 5000 blocks/chunk) from a configurable start block
- **Realtime mode**: WebSocket provider listens for live `Bought`/`Sold` events
- **USD computation**: `computeUsdFromToken()` converts token amounts + 1e18-scaled price to a 6-decimal USD string using BigNumber arithmetic
- **USD threshold filtering**: Skips dust transactions below `$5` to keep the database clean
- **Idempotent upserts**: Uses `tx_hash` as the unique conflict key, so reprocessing is safe
- **Auto-reconnect**: WebSocket close triggers process restart (designed for pm2/systemd process managers)

### Realtime Data Layer

Blazely uses **two parallel realtime pipelines** for different latency requirements:

**Pipeline 1 — Supabase Realtime (postgres_changes):**
- `TradeAlertsMarquee`: Subscribes to INSERT on `transactions` table → renders scrolling trade ticker
- `TokenInfoPage`: Subscribes to UPDATE on `tokens` table (filtered by address) → spring-animated market cap / price / volume counters with a 2500ms flush buffer to coalesce rapid updates
- `TrendingTokens`: Subscribes to changes on `token_metrics_latest` and `tokens` tables → re-fetches trending token list
- `Home` page: Subscribes to token updates for live card reordering

**Pipeline 2 — Direct WebSocket Trade Stream:**
- `Home` page establishes a WebSocket connection to a trade-stream server
- Incoming trades are buffered in a `Map` and flushed every 150ms via `requestAnimationFrame`
- Buy trades trigger `buyEmitter.emit("buy", address)` which causes the corresponding `TokenCard` to flash
- Heartbeat ping/pong with exponential backoff reconnection (1s → 30s max)

### Presentation Layer

**Tech Stack:** React 18, Vite, Tailwind CSS, Framer Motion, wagmi, ConnectKit, ethers.js, viem, TanStack Query, lightweight-charts, lucide-react, Supabase JS client

**Design System:**
- **Background:** `#030712` (obsidian black), `#0b0f19` (panel surface)
- **Accent:** `#96d6cd` (signature teal) — used for CTAs, active states, progress bars, buy indicators
- **Typography:** JetBrains Mono / Fira Code for all data; uppercase tracking-widest for labels
- **Borders:** `slate-900` hairline borders, zero border-radius (industrial/terminal aesthetic)
- **Animations:** Framer Motion spring physics for counters, layout animations for tab indicators, AnimatePresence for route transitions

**Key Pages:**

| Page | Route | Function |
|------|-------|----------|
| Welcome | `/` (first visit) | Onboarding gate with animated intro |
| Home | `/` | Token registry feed with filtering, sorting, search, pagination, realtime trade ticker, trending tokens, AI chat |
| Create Token | `/create` | 3-step deployment wizard: specification → transmitting → verified, with logo upload, social links, initial buy |
| Token Info | `/token/:address` | Full trading terminal: chart, buy/sell panel, top holders, recent transactions, comments, bonding curve progress; lazy-loads graduated view for Uniswap-listed tokens |
| Bridge | `/bridge` | deBridge cross-chain swap widget (25+ chains) |
| Leaderboard | `/leaderboard` | Ranked token list by market cap or 24h volume |
| Locking | `/locking` | Token vesting vault with timelock creation, progress tracking, and activity feed |
| Profile | `/profile` | User portfolio with created tokens, transaction history, social metrics |
| Public Profile | `/user/:walletAddress` | Public-facing wallet profile |

**Swap Lifecycle (`useBuySellLogic` hook):**
1. Read ERC-20 `decimals` and `allowance` for the connected wallet
2. If selling and allowance is insufficient → `approve(launchpadAddress, maxUint256)`
3. Wait for approval confirmation → refetch allowance
4. If buying → `buy(tokenAddress)` with ETH value; if selling → `sell(tokenAddress, amountWei)`
5. Wait for transaction receipt → clear amount, refetch balances
6. Full error handling: insufficient balance, missing contract address, transaction reverts, user rejection

---

## Roadmap

### Phase 1 — Foundation (Complete)
- Bonding-curve launchpad smart contract (deploy, buy, sell, graduate)
- Realtime event indexer with Supabase persistence
- Terminal-aesthetic trading terminal with live charts
- Wallet integration (wagmi + ConnectKit, WalletConnect support)
- Token creation wizard with logo upload and social metadata
- Cross-chain bridge integration (deBridge, 25+ chains)

### Phase 2 — Ecosystem Expansion (In Progress)
- Token locking/vesting vault with beneficiary assignment
- AI-powered support assistant with token metadata queries
- Public profile pages with portfolio tracking
- Leaderboard with market cap and volume rankings
- Graduated token view (Uniswap pool integration)

### Phase 3 — Scale & Institutional
- **Multi-chain deployment** — Expand beyond Sepolia to Base, Arbitrum, and mainnet
- **Permissioned launches** — KYC-gated token creation for compliant token offerings
- **Launchpad analytics dashboard** — Creator metrics, token performance analytics, investor tracking
- **Liquidity migration automation** — On-chain graduation to Uniswap V3 concentrated liquidity
- **Token vesting as a service** — Standalone vesting product for third-party token teams
- **Subgraph integration** — The Graph protocol for decentralized event indexing (replacing centralized listener)

### Phase 4 — Institutional & Enterprise
- **White-label launchpad SDK** — Embeddable launchpad infrastructure for other DeFi protocols
- **Institutional token launch** — Auction-style launches with whitelisted participants and tiered pricing
- **Regulatory compliance module** — Jurisdiction-aware token creation with built-in transfer restrictions
- **Cross-chain token bridge** — Native token bridging for Blazely-launched tokens across all supported chains
- **Revenue sharing** — Protocol fee distribution to BLZ stakers
- **DAO governance** — On-chain governance for protocol parameter changes (curve coefficients, graduation threshold, fees)

---

## Strategic Value

### For Token Creators
Blazely reduces token launch from a multi-day, multi-thousand-dollar process to a **single transaction under one minute**. No liquidity seeding, no DEX listing coordination, no market maker negotiations. The bonding curve provides instant price discovery and liquidity from the first trade.

### For Traders & Investors
Real-time on-chain data indexing with sub-second WebSocket updates means traders see price movements, trade flows, and holder distributions as they happen — not minutes later. The bonding curve guarantees executable prices with no slippage from order book gaps.

### For DeFi Protocols & Partners
Blazely's architecture is designed for white-label deployment. The smart contract layer, event indexer, and realtime data pipeline are modular and chain-agnostic. Protocols can integrate Blazely's launchpad as a service, offering token creation to their users without building the infrastructure themselves.

### For Investors & VCs
Blazely addresses a verified market gap: the token launch process on EVM chains remains fragmented, expensive, and technically inaccessible to non-developers. The protocol captures value through:
- **Launch fees** — A percentage of each token's initial buy
- **Trading fees** — A spread on bonding-curve buy/sell transactions
- **Graduation fees** — A percentage of the liquidity migrated to Uniswap
- **Bridge fees** — Revenue share from deBridge cross-chain transactions
- **Premium features** — Enhanced analytics, priority listing, and white-label deployment

The total addressable market spans every EVM-based token launch — a market that processed over $2B in launch liquidity across 2024. Blazely's one-click, self-graduating model is architecturally superior to existing solutions that require manual liquidity management.

---

## Tech Stack

| Category | Technology |
|----------|-----------|
| Smart Contracts | Solidity ^0.8.0, Hardhat |
| Frontend | React 18, Vite, TypeScript-ready (JSX) |
| Styling | Tailwind CSS, custom terminal design system |
| Animation | Framer Motion (spring physics, layout animations) |
| Wallet | wagmi, viem, ConnectKit, WalletConnect |
| Charts | lightweight-charts (TradingView) |
| Backend | Supabase (Postgres, Realtime, Storage, Auth) |
| Event Indexing | Node.js, ethers.js, WebSocket RPC |
| Cross-Chain | deBridge widget (25+ chains) |
| Icons | lucide-react |

---

## License

MIT
