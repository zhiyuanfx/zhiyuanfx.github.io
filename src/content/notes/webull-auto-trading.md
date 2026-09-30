---
title: 'Webull Auto Trading: An EA-Style Python Framework'
subtitle: 'Independent market data, reusable strategies, and broker execution'
date: 2026-07-30
keywords: ['Trading Systems', 'Python', 'FastAPI', 'WebSocket', 'Webull', 'InsightSentry']
---

Webull Auto Trading is a local framework for running Python trading strategies with streaming market data, paper trading, and live broker execution. It combines an InsightSentry data feed, a shared strategy runtime, Webull’s official trading SDK, and a browser-based operator console.

## Motivation

The starting point was the convenience of **MetaTrader’s Expert Advisor (EA) workflow**: define a strategy, configure an instance, and let it respond to market updates while monitoring its state in one place. I wanted a similar workflow around my Webull account.

There were two gaps to address. First, my Webull workflow lacked the integrated EA-style strategy environment I wanted, so the strategy engine and operator controls needed to live outside the broker. Second, although Webull provides a trading execution API, its market-data offering was more expensive than I wanted for this setup. I wanted a lower-cost data source that could support dependable automated operation.

The resulting design **separates market data from execution**. InsightSentry supplies streaming quotes and price series; Webull supplies account information and executes orders. The framework handles the work between them: interpreting data, evaluating strategies, checking execution conditions, tracking orders, and reconciling local state with the broker.

## Framework structure

<figure class="trading-framework" aria-labelledby="trading-framework-caption">
  <div class="framework-console"><span class="framework-label">Operator console</span><strong>React + TypeScript</strong><span>Mode selection · pause/resume · accounts · orders · stream status</span><span class="framework-connector">↕ FastAPI controls and status</span></div>
  <div class="framework-flow">
    <div class="framework-node"><span class="framework-label">01 / Data source</span><strong>InsightSentry</strong><span>Quote and price-series subscriptions over WebSocket</span></div>
    <span class="framework-arrow" aria-hidden="true">→</span>
    <div class="framework-node"><span class="framework-label">02 / Market-data layer</span><strong>Shared stream</strong><span>Reconnect · merge updates · validate quotes · in-memory bars</span></div>
    <span class="framework-arrow" aria-hidden="true">→</span>
    <div class="framework-node framework-node-accent"><span class="framework-label">03 / Python runtime</span><strong>Strategy instances</strong><span>Quotes · series · timers · account snapshots</span></div>
  </div>
  <div class="framework-branch-label">↓ Strategy decisions route by global runtime mode</div>
  <div class="framework-branches">
    <div class="framework-node"><span class="framework-label">Test mode</span><strong>Paper execution</strong><span>Real streaming data → simulated orders and fills</span><span>Local paper account and trade history</span></div>
    <div class="framework-node framework-node-live"><span class="framework-label">Live mode</span><strong>Execution checks → Webull SDK</strong><span>Enable flags · fresh quotes/accounts · previews · reconciliation</span><span>Market orders → Webull broker</span><span class="framework-feedback">↩ Order details, fills, balances, and positions feed back into the runtime</span></div>
  </div>
  <div class="framework-storage"><strong>SQLite ↔ Runtime</strong><span>Strategy control state · orders and fills · live intents · reconciliation and activity records</span><span>Quotes and bars stay in memory.</span></div>
  <figcaption id="trading-framework-caption">Market data and broker execution are separate services. FastAPI owns the runtime and background workers; the browser provides controls and visibility. Webull remains the source of truth for live orders and positions.</figcaption>
</figure>

## What we built

**A reusable strategy runtime.** Each strategy instance has its own identity, symbol mapping, parameters, and control state. Python strategies can respond to quotes, price series, account snapshots, and timer events. Separate YAML configurations define Test and Live instances, while SQLite preserves operator settings and durable strategy state across restarts. Strategies sharing a symbol retain separate local allocations even when their positions net together at the broker.

**Paper and live execution.** Test mode uses real InsightSentry data to simulate orders and fills. Live mode routes eligible actions through the official Webull SDK. The public repository includes a small Recycle Buy example that enters a position, manages fixed stop/target distances, and waits through a cooldown before re-entering. The strategy interface supports additional local implementations without changing the data or broker layers.

**An operator dashboard.** The React/Vite interface exposes strategy controls, account and order views, trade cycles, activity records, and market-stream status through FastAPI. Global and per-instance pause controls provide an explicit way to stop strategy evaluation. Pausing an instance cancels its pending local entries; it does not close an existing broker position.

## Reliability and execution control

An alternative data feed needs more than a working connection. The shared WebSocket consumer combines subscription requirements across enabled strategies, handles connection keepalives, and reconnects with exponential backoff. Quote updates are merged and validated, and stale quotes block execution. Stream status makes reconnects, missing credentials, and idle symbols visible to the operator.

Live transmission requires global Live mode, a master enable switch, per-instance permission, and successful quote, account, preview, and reconciliation checks. Persistent order intents and deterministic client order IDs help prevent duplicate submissions. Broker order-detail polling confirms fills; partial fills remain in flight, and rejected or uncertain mutations pause the strategy rather than being blindly retried.

Reconciliation compares Webull’s aggregate position with the framework’s strategy allocations plus a captured baseline for positions outside the framework. An unexplained mismatch pauses the affected strategies instead of silently adopting the position. Stop and target levels are based on confirmed broker fills.

Stops, targets, and trailing logic are **managed locally**, with live entries and exits submitted as market orders. Their operation therefore depends on the backend and its connections remaining available. This distinction matters when translating the familiar EA workflow into a service that runs outside the broker.

## Techniques and takeaway

The stack combines **Python, asyncio, WebSockets, FastAPI, Pydantic, SQLite, React, and TypeScript**. Its main architectural ideas are event-driven strategy callbacks, separation of data and execution adapters, explicit order states, durable control state, and broker reconciliation. Offline tests cover stream handling, strategy isolation, paper fills, persistence, and live execution checks without placing real orders.

The result is a configurable trading workbench: strategies share the same data connection, execution infrastructure, and monitoring tools. Separating these responsibilities lets me pursue a more economical data setup while keeping broker-confirmed orders and positions central to the execution process.

[View the project on GitHub](https://github.com/zhiyuanfx/Webull_Auto_Trading)
