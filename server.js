const express  = require("express");
const cors     = require("cors");
const path     = require("path");
const https    = require("https");
const cron     = require("node-cron");

const app    = express();
const PORT   = process.env.PORT || 3000;
const AV_KEY = "WK2KGZ1UUTGDFGR7";
const AV_URL = "https://www.alphavantage.co/query";

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ── Curated 24-stock watchlist ────────────────────────────────────────────────
// Excludes stocks already in portfolio: NVDA, META, MSFT, PLTR
const STOCKS = [
  { ticker:"AAPL",  name:"Apple",               sector:"Technology" },
  { ticker:"AMD",   name:"AMD",                  sector:"Technology" },
  { ticker:"GOOGL", name:"Alphabet",             sector:"Technology" },
  { ticker:"CRM",   name:"Salesforce",           sector:"Technology" },
  { ticker:"JPM",   name:"JPMorgan Chase",       sector:"Financials" },
  { ticker:"GS",    name:"Goldman Sachs",        sector:"Financials" },
  { ticker:"V",     name:"Visa",                 sector:"Financials" },
  { ticker:"LLY",   name:"Eli Lilly",            sector:"Healthcare" },
  { ticker:"UNH",   name:"UnitedHealth",         sector:"Healthcare" },
  { ticker:"AMZN",  name:"Amazon",               sector:"Consumer" },
  { ticker:"TSLA",  name:"Tesla",                sector:"Consumer" },
  { ticker:"COST",  name:"Costco",               sector:"Consumer" },
  { ticker:"XOM",   name:"ExxonMobil",           sector:"Energy" },
  { ticker:"CVX",   name:"Chevron",              sector:"Energy" },
  { ticker:"CAT",   name:"Caterpillar",          sector:"Industrials" },
  { ticker:"LMT",   name:"Lockheed Martin",      sector:"Industrials" },
  { ticker:"NFLX",  name:"Netflix",              sector:"Communication" },
  { ticker:"UBER",  name:"Uber",                 sector:"Communication" },
  { ticker:"ARM",   name:"ARM Holdings",         sector:"AI & Growth" },
  { ticker:"MSTR",  name:"MicroStrategy",        sector:"AI & Growth" },
  { ticker:"SMCI",  name:"Super Micro",          sector:"AI & Growth" },
  { ticker:"SOUN",  name:"SoundHound AI",        sector:"AI & Growth" },
  { ticker:"NEM",   name:"Newmont Mining",       sector:"Materials" },
  { ticker:"FCX",   name:"Freeport-McMoRan",     sector:"Materials" },
];

const INDEX_TICKERS = ["SPY","QQQ","GLD","UUP"];

// ── Cache — stores latest scan results in memory ──────────────────────────────
let cachedResults = null;
let cacheTime     = null;
let scanInProgress = false;

// ── HTTP helper ───────────────────────────────────────────────────────────────
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(new Error("JSON parse error")); }
      });
    }).on("error", reject);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Alpha Vantage: Daily time series ─────────────────────────────────────────
async function fetchDailySeries(ticker) {
  const url  = `${AV_URL}?function=TIME_SERIES_DAILY&symbol=${ticker}&outputsize=compact&apikey=${AV_KEY}`;
  const data = await fetchJSON(url);
  const series = data["Time Series (Daily)"];
  if (!series) throw new Error(data["Note"] || data["Information"] || `No series for ${ticker}`);
  const dates = Object.keys(series).sort();
  return {
    closes:  dates.map(d => parseFloat(series[d]["4. close"])),
    highs:   dates.map(d => parseFloat(series[d]["2. high"])),
    lows:    dates.map(d => parseFloat(series[d]["3. low"])),
    volumes: dates.map(d => parseFloat(series[d]["5. volume"])),
  };
}

// ── Alpha Vantage: Global quote ───────────────────────────────────────────────
async function fetchGlobalQuote(ticker) {
  const url  = `${AV_URL}?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${AV_KEY}`;
  const data = await fetchJSON(url);
  const q    = data["Global Quote"];
  if (!q || !q["05. price"]) throw new Error(`No quote for ${ticker}`);
  return {
    price:     parseFloat(q["05. price"]),
    dayChgPct: parseFloat(q["10. change percent"]?.replace("%", "")),
  };
}

// ── Technical Indicators ──────────────────────────────────────────────────────
function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return null;
  let g = 0, l = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) g += d; else l -= d;
  }
  return 100 - 100 / (1 + g / (l || 0.001));
}
function calcEMA(closes, period) {
  if (closes.length < period) return null;
  const k = 2 / (period + 1);
  let e = closes.slice(0, period).reduce((a,b) => a+b, 0) / period;
  for (let i = period; i < closes.length; i++) e = closes[i]*k + e*(1-k);
  return e;
}
function calcMACD(closes) {
  const e12 = calcEMA(closes,12), e26 = calcEMA(closes,26);
  return e12 && e26 ? e12 - e26 : null;
}
function calcATR(h, l, c, n = 14) {
  if (c.length < n+1) return null;
  const tr = [];
  for (let i = c.length-n; i < c.length; i++)
    tr.push(Math.max(h[i]-l[i], Math.abs(h[i]-c[i-1]), Math.abs(l[i]-c[i-1])));
  return tr.reduce((a,b) => a+b, 0) / n;
}
function calcVolSpike(volumes) {
  if (volumes.length < 21) return 1;
  const avg = volumes.slice(-21,-1).reduce((a,b) => a+b, 0) / 20;
  return volumes[volumes.length-1] / (avg || 1);
}

// ── Score engine ──────────────────────────────────────────────────────────────
function scoreStock(stock, closes, highs, lows, volumes, price, dayChg) {
  if (!closes || closes.length < 20) return null;

  const mom5    = closes.length >= 6 ? ((price - closes[closes.length-6]) / closes[closes.length-6]) * 100 : 0;
  const rsi     = calcRSI(closes);
  const macdVal = calcMACD(closes);
  const sma20   = closes.slice(-20).reduce((a,b) => a+b, 0) / 20;
  const sma50   = closes.length >= 50 ? closes.slice(-50).reduce((a,b) => a+b, 0) / 50 : null;
  const ema9    = calcEMA(closes, 9);
  const atr     = calcATR(highs, lows, closes);
  const vs      = calcVolSpike(volumes);
  const w52High = Math.max(...closes);
  const w52Low  = Math.min(...closes);
  const w52Range= w52High - w52Low;
  const w52Pos  = w52Range > 0 ? ((price - w52Low) / w52Range) * 100 : 50;

  let score = 0; const signals = [];

  if (rsi != null) {
    if      (rsi < 30) { score += 35; signals.push(`RSI deeply oversold (${rsi.toFixed(0)})`); }
    else if (rsi < 40) { score += 25; signals.push(`RSI oversold (${rsi.toFixed(0)})`); }
    else if (rsi < 50) { score += 10; signals.push(`RSI recovering (${rsi.toFixed(0)})`); }
  }
  if (macdVal > 0)           { score += 20; signals.push("MACD bullish"); }
  if (price > sma20)         { score += 10; signals.push("Above SMA20"); }
  if (sma50 && price > sma50){ score += 10; signals.push("Above SMA50"); }
  if (sma50 && sma20 > sma50){ score += 10; signals.push("Golden cross (SMA20>SMA50)"); }
  if (ema9 && price > ema9)  { score += 10; signals.push("Above EMA9"); }
  if (vs > 2)                { score += 20; signals.push(`Volume surge ${vs.toFixed(1)}x`); }
  else if (vs > 1.5)         { score += 10; signals.push(`Volume ${vs.toFixed(1)}x avg`); }
  if (mom5 > 5)              { score += 15; signals.push(`+${mom5.toFixed(1)}% 5-day momentum`); }
  else if (mom5 > 2)         { score +=  8; signals.push(`+${mom5.toFixed(1)}% 5-day move`); }
  if (dayChg > 1.5)          { score += 10; signals.push(`Up ${dayChg.toFixed(1)}% today`); }
  if (w52Pos < 25)           { score += 15; signals.push("Near 52-week low (value zone)"); }
  else if (w52Pos < 40)      { score +=  8; signals.push("Below 52-week midpoint"); }

  const stopBuf   = atr ? atr * 1.2 : price * 0.04;
  const targetBuf = atr ? atr * 2.2 : price * 0.08;
  const fmt = v => parseFloat(v.toFixed(v >= 100 ? 2 : v >= 10 ? 2 : 3));

  return {
    ...stock,
    week52High:    fmt(w52High),
    week52Low:     fmt(w52Low),
    dividendYield: null,
    score,
    signals:    signals.slice(0, 5),
    confidence: Math.min(97, Math.round(score * 1.05)),
    price:      fmt(price),
    entry:      fmt(price),
    target:     fmt(price + targetBuf),
    stop:       fmt(price - stopBuf),
    upside:     ((targetBuf / price) * 100).toFixed(1),
    downside:   ((stopBuf  / price) * 100).toFixed(1),
    rr:         (targetBuf / stopBuf).toFixed(1),
    rsi:        rsi ? parseFloat(rsi.toFixed(1)) : null,
    dayChg:     parseFloat(dayChg.toFixed(2)),
    mom5:       parseFloat(mom5.toFixed(1)),
    volSpike:   parseFloat(vs.toFixed(1)),
    w52Pos:     parseFloat(w52Pos.toFixed(1)),
  };
}

// ── Core scan function (used by both scheduler and manual trigger) ─────────────
async function runScan() {
  if (scanInProgress) {
    console.log("⏳ Scan already in progress, skipping...");
    return;
  }
  scanInProgress = true;
  console.log(`\n🔍 Starting scheduled scan of ${STOCKS.length} stocks at ${new Date().toISOString()}`);

  const results = [], failed = [];

  for (let i = 0; i < STOCKS.length; i++) {
    const stock = STOCKS[i];
    console.log(`  [${i+1}/${STOCKS.length}] ${stock.ticker}...`);
    try {
      const series = await fetchDailySeries(stock.ticker);
      const price  = series.closes[series.closes.length - 1];
      const prev   = series.closes[series.closes.length - 2];
      const dayChg = prev ? ((price - prev) / prev) * 100 : 0;
      const scored = scoreStock(stock, series.closes, series.highs, series.lows, series.volumes, price, dayChg);
      if (scored) {
        results.push(scored);
        console.log(`  ✅ ${stock.ticker} $${price.toFixed(2)} | score: ${scored.score}`);
      }
    } catch(e) {
      console.log(`  ❌ ${stock.ticker}: ${e.message}`);
      failed.push(stock.ticker);
    }
    if (i < STOCKS.length - 1) await sleep(13000);
  }

  if (results.length > 0) {
    cachedResults = {
      success:   true,
      results:   results.sort((a,b) => b.score - a.score),
      failed,
      total:     STOCKS.length,
      scannedAt: new Date().toISOString(),
      scheduled: true,
    };
    cacheTime = new Date();
    console.log(`✅ Scan complete — ${results.length} scored, cached at ${cacheTime.toISOString()}`);
  } else {
    console.log("❌ Scan returned no results — cache not updated");
  }
  scanInProgress = false;
}

// ── Scheduler: runs at 1:00 AM AEST = 3:00 PM UTC every weekday ──────────────
// Cron format: minute hour day month weekday
// Monday–Friday only (no point scanning on weekends when markets are closed)
cron.schedule("0 15 * * 1-5", () => {
  console.log("⏰ Scheduled scan triggered (1:00 AM AEST)");
  runScan();
}, { timezone: "UTC" });

console.log("⏰ Scheduler set: daily scan at 1:00 AM AEST (3:00 PM UTC), Mon–Fri");

// ── /api/scan ─────────────────────────────────────────────────────────────────
// Returns cached results instantly if available, otherwise runs fresh scan
app.get("/api/scan", async (req, res) => {
  const forceRefresh = req.query.refresh === "true";

  // Return cached results if fresh (less than 23 hours old) and not forcing refresh
  if (cachedResults && cacheTime && !forceRefresh) {
    const ageHours = (new Date() - cacheTime) / (1000 * 60 * 60);
    if (ageHours < 23) {
      console.log(`📦 Returning cached results (${ageHours.toFixed(1)}h old)`);
      return res.json({ ...cachedResults, fromCache: true, cacheAgeHours: parseFloat(ageHours.toFixed(1)) });
    }
  }

  // No cache or force refresh — run scan now
  try {
    await runScan();
    if (cachedResults) {
      res.json({ ...cachedResults, fromCache: false });
    } else {
      res.status(500).json({ success: false, error: "Scan failed — check Alpha Vantage API limit (25 calls/day)" });
    }
  } catch(err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── /api/indices ──────────────────────────────────────────────────────────────
app.get("/api/indices", async (req, res) => {
  try {
    const data = {};
    for (const sym of INDEX_TICKERS) {
      try {
        const q = await fetchGlobalQuote(sym);
        data[sym] = { price: q.price, changePct: q.dayChgPct, label: sym };
        await sleep(13000);
      } catch(e) {
        console.log(`Index ${sym} failed: ${e.message}`);
      }
    }
    res.json({ success: true, data });
  } catch(err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── /api/status ───────────────────────────────────────────────────────────────
app.get("/api/status", (req, res) => {
  const ageHours = cacheTime ? ((new Date() - cacheTime) / (1000 * 60 * 60)).toFixed(1) : null;
  res.json({
    status:        "ok",
    stocks:        STOCKS.length,
    watchlist:     STOCKS.map(s => s.ticker),
    scanInProgress,
    lastScan:      cacheTime ? cacheTime.toISOString() : "Never",
    cacheAgeHours: ageHours,
    nextScheduled: "Daily at 1:00 AM AEST (Mon–Fri)",
    dataSource:    "Alpha Vantage (25 calls/day free tier)",
  });
});

// ── /api/health ───────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "AggressiveAlpha running with auto-scheduler!" });
});

// Serve frontend
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`\n⚡ AggressiveAlpha running on port ${PORT}`);
  console.log(`   Watchlist (${STOCKS.length} stocks): ${STOCKS.map(s => s.ticker).join(", ")}`);
  console.log(`   Auto-scan: 1:00 AM AEST daily (Mon–Fri)`);
  console.log(`   Manual scan: GET /api/scan`);
  console.log(`   Force refresh: GET /api/scan?refresh=true`);
  console.log(`   Status: GET /api/status\n`);
});
