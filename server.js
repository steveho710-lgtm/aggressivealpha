const express = require("express");
const cors    = require("cors");
const path    = require("path");
const https   = require("https");

const app    = express();
const PORT   = process.env.PORT || 3000;
const AV_KEY = "WK2KGZ1UUTGDFGR7";
const AV_URL = "https://www.alphavantage.co/query";

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ── Curated 24-stock watchlist ────────────────────────────────────────────────
// Excludes stocks already in portfolio: NVDA, META, MSFT, PLTR
// Fits perfectly within Alpha Vantage 25 calls/day free tier
const STOCKS = [
  // TECHNOLOGY
  { ticker:"AAPL",  name:"Apple",               sector:"Technology" },
  { ticker:"AMD",   name:"AMD",                  sector:"Technology" },
  { ticker:"GOOGL", name:"Alphabet",             sector:"Technology" },
  { ticker:"CRM",   name:"Salesforce",           sector:"Technology" },
  // FINANCIALS
  { ticker:"JPM",   name:"JPMorgan Chase",       sector:"Financials" },
  { ticker:"GS",    name:"Goldman Sachs",        sector:"Financials" },
  { ticker:"V",     name:"Visa",                 sector:"Financials" },
  // HEALTHCARE
  { ticker:"LLY",   name:"Eli Lilly",            sector:"Healthcare" },
  { ticker:"UNH",   name:"UnitedHealth",         sector:"Healthcare" },
  // CONSUMER
  { ticker:"AMZN",  name:"Amazon",               sector:"Consumer" },
  { ticker:"TSLA",  name:"Tesla",                sector:"Consumer" },
  { ticker:"COST",  name:"Costco",               sector:"Consumer" },
  // ENERGY
  { ticker:"XOM",   name:"ExxonMobil",           sector:"Energy" },
  { ticker:"CVX",   name:"Chevron",              sector:"Energy" },
  // INDUSTRIALS
  { ticker:"CAT",   name:"Caterpillar",          sector:"Industrials" },
  { ticker:"LMT",   name:"Lockheed Martin",      sector:"Industrials" },
  // COMMUNICATION
  { ticker:"NFLX",  name:"Netflix",              sector:"Communication" },
  { ticker:"UBER",  name:"Uber",                 sector:"Communication" },
  // AI & GROWTH
  { ticker:"ARM",   name:"ARM Holdings",         sector:"AI & Growth" },
  { ticker:"MSTR",  name:"MicroStrategy",        sector:"AI & Growth" },
  { ticker:"SMCI",  name:"Super Micro",          sector:"AI & Growth" },
  { ticker:"SOUN",  name:"SoundHound AI",        sector:"AI & Growth" },
  // MATERIALS
  { ticker:"NEM",   name:"Newmont Mining",       sector:"Materials" },
  { ticker:"FCX",   name:"Freeport-McMoRan",     sector:"Materials" },
];

// Market indices to show context
const INDEX_TICKERS = ["SPY","QQQ","GLD","UUP"];

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
  const url = `${AV_URL}?function=TIME_SERIES_DAILY&symbol=${ticker}&outputsize=compact&apikey=${AV_KEY}`;
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

// ── Alpha Vantage: Global quote (current price) ───────────────────────────────
async function fetchGlobalQuote(ticker) {
  const url  = `${AV_URL}?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${AV_KEY}`;
  const data = await fetchJSON(url);
  const q    = data["Global Quote"];
  if (!q || !q["05. price"]) throw new Error(`No quote for ${ticker}`);
  return {
    price:     parseFloat(q["05. price"]),
    prevClose: parseFloat(q["08. previous close"]),
    dayChgPct: parseFloat(q["10. change percent"]?.replace("%", "")),
    volume:    parseFloat(q["06. volume"]),
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

  // 52-week high/low from price history
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
    dividendYield: null, // requires extra API call — saved for premium
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

// ── /api/scan ─────────────────────────────────────────────────────────────────
// Fetches TIME_SERIES_DAILY for each of the 24 stocks = 24 API calls
// Stays within Alpha Vantage free tier (25 calls/day, 5 calls/min)
app.get("/api/scan", async (req, res) => {
  try {
    console.log(`🔍 Scanning ${STOCKS.length} curated stocks...`);
    const results = [], failed = [];

    for (let i = 0; i < STOCKS.length; i++) {
      const stock = STOCKS[i];
      console.log(`  [${i+1}/${STOCKS.length}] ${stock.ticker}...`);
      try {
        const series  = await fetchDailySeries(stock.ticker);
        const price   = series.closes[series.closes.length - 1];
        const prev    = series.closes[series.closes.length - 2];
        const dayChg  = prev ? ((price - prev) / prev) * 100 : 0;
        const scored  = scoreStock(stock, series.closes, series.highs, series.lows, series.volumes, price, dayChg);
        if (scored) {
          results.push(scored);
          console.log(`  ✅ ${stock.ticker} — $${price.toFixed(2)} | score: ${scored.score}`);
        }
      } catch(e) {
        console.log(`  ❌ ${stock.ticker}: ${e.message}`);
        failed.push(stock.ticker);
      }
      // Alpha Vantage free: 5 calls/min = wait 13s between calls
      if (i < STOCKS.length - 1) await sleep(13000);
    }

    if (!results.length) {
      return res.status(500).json({
        success: false,
        error: "No data returned. You may have hit the 25 calls/day limit — try again tomorrow, or check your Alpha Vantage API key."
      });
    }

    const sorted = results.sort((a, b) => b.score - a.score);
    console.log(`✅ Scan complete — ${results.length} stocks scored, ${failed.length} failed`);
    res.json({
      success:   true,
      results:   sorted,
      failed,
      total:     STOCKS.length,
      scannedAt: new Date().toISOString(),
    });

  } catch(err) {
    console.error("Scan error:", err);
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

// ── /api/health ───────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status:    "ok",
    message:   "AggressiveAlpha running!",
    stocks:    STOCKS.length,
    watchlist: STOCKS.map(s => s.ticker),
    dataSource:"Alpha Vantage (25 calls/day free tier)",
  });
});

// Serve frontend
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`⚡ AggressiveAlpha on http://localhost:${PORT}`);
  console.log(`   Watchlist: ${STOCKS.map(s => s.ticker).join(", ")}`);
});
