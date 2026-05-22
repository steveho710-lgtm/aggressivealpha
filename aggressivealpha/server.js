const express = require("express");
const cors    = require("cors");
const yahooFinance = require("yahoo-finance2").default;
const path    = require("path");

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve the frontend dashboard
app.use(express.static(path.join(__dirname, "public")));

// ── 100 US Stocks ─────────────────────────────────────────────────────────────
const STOCKS = [
  // TECHNOLOGY
  { ticker:"AAPL",  name:"Apple",               sector:"Technology" },
  { ticker:"MSFT",  name:"Microsoft",            sector:"Technology" },
  { ticker:"NVDA",  name:"NVIDIA",               sector:"Technology" },
  { ticker:"AMD",   name:"AMD",                  sector:"Technology" },
  { ticker:"META",  name:"Meta Platforms",       sector:"Technology" },
  { ticker:"GOOGL", name:"Alphabet",             sector:"Technology" },
  { ticker:"CRM",   name:"Salesforce",           sector:"Technology" },
  { ticker:"ADBE",  name:"Adobe",                sector:"Technology" },
  { ticker:"ORCL",  name:"Oracle",               sector:"Technology" },
  { ticker:"INTC",  name:"Intel",                sector:"Technology" },
  { ticker:"QCOM",  name:"Qualcomm",             sector:"Technology" },
  { ticker:"AMAT",  name:"Applied Materials",    sector:"Technology" },
  { ticker:"MU",    name:"Micron Technology",    sector:"Technology" },
  { ticker:"PLTR",  name:"Palantir",             sector:"Technology" },
  { ticker:"SNOW",  name:"Snowflake",            sector:"Technology" },
  // FINANCIALS
  { ticker:"JPM",   name:"JPMorgan Chase",       sector:"Financials" },
  { ticker:"BAC",   name:"Bank of America",      sector:"Financials" },
  { ticker:"GS",    name:"Goldman Sachs",        sector:"Financials" },
  { ticker:"MS",    name:"Morgan Stanley",       sector:"Financials" },
  { ticker:"WFC",   name:"Wells Fargo",          sector:"Financials" },
  { ticker:"BLK",   name:"BlackRock",            sector:"Financials" },
  { ticker:"SCHW",  name:"Charles Schwab",       sector:"Financials" },
  { ticker:"AXP",   name:"American Express",     sector:"Financials" },
  { ticker:"V",     name:"Visa",                 sector:"Financials" },
  { ticker:"MA",    name:"Mastercard",           sector:"Financials" },
  { ticker:"PYPL",  name:"PayPal",               sector:"Financials" },
  { ticker:"SQ",    name:"Block Inc",            sector:"Financials" },
  // HEALTHCARE
  { ticker:"JNJ",   name:"Johnson & Johnson",    sector:"Healthcare" },
  { ticker:"UNH",   name:"UnitedHealth",         sector:"Healthcare" },
  { ticker:"PFE",   name:"Pfizer",               sector:"Healthcare" },
  { ticker:"ABBV",  name:"AbbVie",               sector:"Healthcare" },
  { ticker:"MRK",   name:"Merck",                sector:"Healthcare" },
  { ticker:"TMO",   name:"Thermo Fisher",        sector:"Healthcare" },
  { ticker:"DHR",   name:"Danaher",              sector:"Healthcare" },
  { ticker:"LLY",   name:"Eli Lilly",            sector:"Healthcare" },
  { ticker:"AMGN",  name:"Amgen",                sector:"Healthcare" },
  { ticker:"GILD",  name:"Gilead Sciences",      sector:"Healthcare" },
  { ticker:"ISRG",  name:"Intuitive Surgical",   sector:"Healthcare" },
  { ticker:"MRNA",  name:"Moderna",              sector:"Healthcare" },
  // CONSUMER
  { ticker:"AMZN",  name:"Amazon",               sector:"Consumer" },
  { ticker:"TSLA",  name:"Tesla",                sector:"Consumer" },
  { ticker:"WMT",   name:"Walmart",              sector:"Consumer" },
  { ticker:"HD",    name:"Home Depot",           sector:"Consumer" },
  { ticker:"NKE",   name:"Nike",                 sector:"Consumer" },
  { ticker:"SBUX",  name:"Starbucks",            sector:"Consumer" },
  { ticker:"MCD",   name:"McDonald's",           sector:"Consumer" },
  { ticker:"COST",  name:"Costco",               sector:"Consumer" },
  { ticker:"TGT",   name:"Target",               sector:"Consumer" },
  { ticker:"LOW",   name:"Lowe's",               sector:"Consumer" },
  { ticker:"BKNG",  name:"Booking Holdings",     sector:"Consumer" },
  { ticker:"ABNB",  name:"Airbnb",               sector:"Consumer" },
  // ENERGY
  { ticker:"XOM",   name:"ExxonMobil",           sector:"Energy" },
  { ticker:"CVX",   name:"Chevron",              sector:"Energy" },
  { ticker:"COP",   name:"ConocoPhillips",       sector:"Energy" },
  { ticker:"SLB",   name:"Schlumberger",         sector:"Energy" },
  { ticker:"EOG",   name:"EOG Resources",        sector:"Energy" },
  { ticker:"MPC",   name:"Marathon Petroleum",   sector:"Energy" },
  { ticker:"VLO",   name:"Valero Energy",        sector:"Energy" },
  { ticker:"OXY",   name:"Occidental Pete",      sector:"Energy" },
  { ticker:"DVN",   name:"Devon Energy",         sector:"Energy" },
  { ticker:"HAL",   name:"Halliburton",          sector:"Energy" },
  // INDUSTRIALS
  { ticker:"CAT",   name:"Caterpillar",          sector:"Industrials" },
  { ticker:"BA",    name:"Boeing",               sector:"Industrials" },
  { ticker:"HON",   name:"Honeywell",            sector:"Industrials" },
  { ticker:"UPS",   name:"UPS",                  sector:"Industrials" },
  { ticker:"RTX",   name:"Raytheon",             sector:"Industrials" },
  { ticker:"LMT",   name:"Lockheed Martin",      sector:"Industrials" },
  { ticker:"DE",    name:"Deere & Co",           sector:"Industrials" },
  { ticker:"GE",    name:"GE Aerospace",         sector:"Industrials" },
  { ticker:"MMM",   name:"3M",                   sector:"Industrials" },
  { ticker:"FDX",   name:"FedEx",                sector:"Industrials" },
  // COMMUNICATION
  { ticker:"NFLX",  name:"Netflix",              sector:"Communication" },
  { ticker:"DIS",   name:"Disney",               sector:"Communication" },
  { ticker:"SPOT",  name:"Spotify",              sector:"Communication" },
  { ticker:"RBLX",  name:"Roblox",               sector:"Communication" },
  { ticker:"TTD",   name:"The Trade Desk",       sector:"Communication" },
  { ticker:"SNAP",  name:"Snap Inc",             sector:"Communication" },
  { ticker:"PINS",  name:"Pinterest",            sector:"Communication" },
  { ticker:"ROKU",  name:"Roku",                 sector:"Communication" },
  { ticker:"UBER",  name:"Uber",                 sector:"Communication" },
  { ticker:"LYFT",  name:"Lyft",                 sector:"Communication" },
  // AI & GROWTH
  { ticker:"MSTR",  name:"MicroStrategy",        sector:"AI & Growth" },
  { ticker:"ARM",   name:"ARM Holdings",         sector:"AI & Growth" },
  { ticker:"SMCI",  name:"Super Micro",          sector:"AI & Growth" },
  { ticker:"AI",    name:"C3.ai",                sector:"AI & Growth" },
  { ticker:"SOUN",  name:"SoundHound AI",        sector:"AI & Growth" },
  { ticker:"IONQ",  name:"IonQ",                 sector:"AI & Growth" },
  { ticker:"RGTI",  name:"Rigetti Computing",    sector:"AI & Growth" },
  { ticker:"RIVN",  name:"Rivian",               sector:"AI & Growth" },
  { ticker:"LCID",  name:"Lucid Group",          sector:"AI & Growth" },
  { ticker:"BBAI",  name:"BigBear.ai",           sector:"AI & Growth" },
  // MATERIALS
  { ticker:"NEM",   name:"Newmont Mining",       sector:"Materials" },
  { ticker:"FCX",   name:"Freeport-McMoRan",     sector:"Materials" },
  { ticker:"BHP",   name:"BHP Group ADR",        sector:"Materials" },
  { ticker:"RIO",   name:"Rio Tinto ADR",        sector:"Materials" },
  { ticker:"VALE",  name:"Vale ADR",             sector:"Materials" },
  { ticker:"CLF",   name:"Cleveland-Cliffs",     sector:"Materials" },
  { ticker:"X",     name:"US Steel",             sector:"Materials" },
  { ticker:"AA",    name:"Alcoa",                sector:"Materials" },
  { ticker:"MP",    name:"MP Materials",         sector:"Materials" },
];

const INDICES = ["SPY","QQQ","^VIX","GLD","UUP"];

// ── Technical Indicators ──────────────────────────────────────────────────────
function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) gains += d; else losses -= d;
  }
  const rs = gains / (losses || 0.001);
  return 100 - 100 / (1 + rs);
}

function calcEMA(closes, period) {
  if (closes.length < period) return null;
  const k = 2 / (period + 1);
  let e = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < closes.length; i++) e = closes[i] * k + e * (1 - k);
  return e;
}

function calcMACD(closes) {
  const e12 = calcEMA(closes, 12), e26 = calcEMA(closes, 26);
  return e12 && e26 ? e12 - e26 : null;
}

function calcATR(highs, lows, closes, period = 14) {
  if (closes.length < period + 1) return null;
  const trs = [];
  for (let i = closes.length - period; i < closes.length; i++)
    trs.push(Math.max(highs[i]-lows[i], Math.abs(highs[i]-closes[i-1]), Math.abs(lows[i]-closes[i-1])));
  return trs.reduce((a,b) => a+b, 0) / period;
}

function calcVolSpike(volumes) {
  if (volumes.length < 21) return 1;
  const avg = volumes.slice(-21,-1).reduce((a,b) => a+b, 0) / 20;
  return volumes[volumes.length-1] / (avg || 1);
}

// ── Score a stock ─────────────────────────────────────────────────────────────
function scoreStock(stock, closes, highs, lows, volumes, quote) {
  if (closes.length < 30) return null;
  const price    = quote.regularMarketPrice || closes[closes.length-1];
  const prevClose= quote.regularMarketPreviousClose || closes[closes.length-2];
  const dayChg   = ((price - prevClose) / prevClose) * 100;
  const mom5     = closes.length >= 6 ? ((price - closes[closes.length-6]) / closes[closes.length-6]) * 100 : 0;
  const rsi      = calcRSI(closes);
  const macdVal  = calcMACD(closes);
  const sma20    = closes.slice(-20).reduce((a,b)=>a+b,0) / 20;
  const sma50    = closes.length >= 50 ? closes.slice(-50).reduce((a,b)=>a+b,0)/50 : null;
  const ema9     = calcEMA(closes, 9);
  const atr      = calcATR(highs, lows, closes);
  const vs       = calcVolSpike(volumes);
  const w52High  = quote.fiftyTwoWeekHigh || Math.max(...closes);
  const w52Low   = quote.fiftyTwoWeekLow  || Math.min(...closes);
  const divYield = quote.trailingAnnualDividendYield ? quote.trailingAnnualDividendYield * 100 : null;
  const w52Range = w52High - w52Low;
  const w52Pos   = w52Range > 0 ? ((price - w52Low) / w52Range) * 100 : 50;

  let score = 0; const signals = [];

  if (rsi != null) {
    if      (rsi < 30) { score += 35; signals.push(`RSI deeply oversold (${rsi.toFixed(0)})`); }
    else if (rsi < 40) { score += 25; signals.push(`RSI oversold (${rsi.toFixed(0)})`); }
    else if (rsi < 50) { score += 10; signals.push(`RSI recovering (${rsi.toFixed(0)})`); }
  }
  if (macdVal > 0)            { score += 20; signals.push("MACD bullish"); }
  if (price > sma20)          { score += 10; signals.push("Above SMA20"); }
  if (sma50 && price > sma50) { score += 10; signals.push("Above SMA50"); }
  if (sma50 && sma20 > sma50) { score += 10; signals.push("Golden cross (SMA20>SMA50)"); }
  if (ema9 && price > ema9)   { score += 10; signals.push("Price above EMA9"); }
  if (vs > 2)                 { score += 20; signals.push(`Volume surge ${vs.toFixed(1)}x`); }
  else if (vs > 1.5)          { score += 10; signals.push(`Volume ${vs.toFixed(1)}x avg`); }
  if (mom5 > 5)               { score += 15; signals.push(`+${mom5.toFixed(1)}% 5-day momentum`); }
  else if (mom5 > 2)          { score +=  8; signals.push(`+${mom5.toFixed(1)}% 5-day move`); }
  if (dayChg > 1.5)           { score += 10; signals.push(`Up ${dayChg.toFixed(1)}% today`); }
  if (w52Pos < 25)            { score += 15; signals.push("Near 52-week low (value zone)"); }
  else if (w52Pos < 40)       { score +=  8; signals.push("Below 52-week midpoint"); }

  const stopBuf   = atr ? atr * 1.2 : price * 0.04;
  const targetBuf = atr ? atr * 2.2 : price * 0.08;
  const fmt = v => parseFloat(v.toFixed(v >= 10 ? 2 : 3));

  return {
    ...stock,
    score,
    confidence: Math.min(97, Math.round(score * 1.05)),
    price:       fmt(price),
    entry:       fmt(price),
    target:      fmt(price + targetBuf),
    stop:        fmt(price - stopBuf),
    upside:      ((targetBuf / price) * 100).toFixed(1),
    downside:    ((stopBuf  / price) * 100).toFixed(1),
    rr:          (targetBuf / stopBuf).toFixed(1),
    rsi:         rsi ? parseFloat(rsi.toFixed(1)) : null,
    dayChg:      parseFloat(dayChg.toFixed(2)),
    mom5:        parseFloat(mom5.toFixed(1)),
    volSpike:    parseFloat(vs.toFixed(1)),
    w52High:     fmt(w52High),
    w52Low:      fmt(w52Low),
    w52Pos:      parseFloat(w52Pos.toFixed(1)),
    divYield:    divYield ? parseFloat(divYield.toFixed(2)) : null,
    signals:     signals.slice(0, 5),
  };
}

// ── API: Scan all stocks ──────────────────────────────────────────────────────
app.get("/api/scan", async (req, res) => {
  try {
    console.log("🔍 Starting scan of 100 stocks...");
    const results = [], failed = [];

    for (const stock of STOCKS) {
      try {
        // Fetch 6 months of history + quote in parallel
        const [histResult, quote] = await Promise.all([
          yahooFinance.chart(stock.ticker, { period1: "6mo", interval: "1d" }),
          yahooFinance.quoteSummary(stock.ticker, { modules: ["price","summaryDetail"] }),
        ]);

        const quotes  = histResult.quotes.filter(q => q.close);
        if (quotes.length < 30) { failed.push(stock.ticker); continue; }

        const closes  = quotes.map(q => q.close);
        const highs   = quotes.map(q => q.high);
        const lows    = quotes.map(q => q.low);
        const volumes = quotes.map(q => q.volume || 0);
        const priceData = { ...quote.price, ...quote.summaryDetail };

        const scored = scoreStock(stock, closes, highs, lows, volumes, priceData);
        if (scored) results.push(scored);
        console.log(`  ✅ ${stock.ticker} — score: ${scored?.score}`);
      } catch (e) {
        console.log(`  ❌ ${stock.ticker} — ${e.message}`);
        failed.push(stock.ticker);
      }
    }

    const sorted = results.sort((a, b) => b.score - a.score);
    console.log(`✅ Scan complete. ${results.length} scored, ${failed.length} failed.`);
    res.json({ success: true, results: sorted, failed, scannedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── API: Market indices ───────────────────────────────────────────────────────
app.get("/api/indices", async (req, res) => {
  try {
    const data = {};
    for (const sym of INDICES) {
      try {
        const q = await yahooFinance.quoteSummary(sym, { modules: ["price"] });
        data[sym] = {
          price:     q.price.regularMarketPrice,
          changePct: q.price.regularMarketChangePercent * 100,
          label:     q.price.shortName || sym,
        };
      } catch {}
    }
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── API: Health check ─────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "AggressiveAlpha is running!" });
});

// Serve frontend for all other routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`⚡ AggressiveAlpha running on http://localhost:${PORT}`);
});
