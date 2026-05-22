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

// ── 100 US Stocks ─────────────────────────────────────────────────────────────
const STOCKS = [
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

// Alpha Vantage free = 25 calls/day
// We use BATCH_QUOTE to get up to 100 quotes in ONE call
// Then TIME_SERIES_DAILY for top 25 stocks (to calculate indicators)
// This keeps us well within the 25 calls/day limit

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

// ── Alpha Vantage: Batch quotes (up to 100 tickers in 1 call) ────────────────
async function fetchBatchQuotes(tickers) {
  const symbols = tickers.join(",");
  const url = `${AV_URL}?function=BATCH_STOCK_QUOTES&symbols=${symbols}&apikey=${AV_KEY}`;
  const data = await fetchJSON(url);
  const quotes = {};
  if (data["Stock Quotes"]) {
    for (const q of data["Stock Quotes"]) {
      quotes[q["1. symbol"]] = {
        price:  parseFloat(q["2. price"]),
        volume: parseFloat(q["3. volume"]),
      };
    }
  }
  return quotes;
}

// ── Alpha Vantage: Daily time series for one ticker ───────────────────────────
async function fetchDailySeries(ticker) {
  const url = `${AV_URL}?function=TIME_SERIES_DAILY&symbol=${ticker}&outputsize=compact&apikey=${AV_KEY}`;
  const data = await fetchJSON(url);
  const series = data["Time Series (Daily)"];
  if (!series) throw new Error(`No series for ${ticker}`);

  const dates = Object.keys(series).sort();
  return {
    closes:  dates.map(d => parseFloat(series[d]["4. close"])),
    highs:   dates.map(d => parseFloat(series[d]["2. high"])),
    lows:    dates.map(d => parseFloat(series[d]["3. low"])),
    volumes: dates.map(d => parseFloat(series[d]["5. volume"])),
  };
}

// ── Alpha Vantage: Overview (52-week, dividend yield) ────────────────────────
async function fetchOverview(ticker) {
  const url = `${AV_URL}?function=OVERVIEW&symbol=${ticker}&apikey=${AV_KEY}`;
  const data = await fetchJSON(url);
  return {
    week52High:    parseFloat(data["52WeekHigh"])      || null,
    week52Low:     parseFloat(data["52WeekLow"])       || null,
    dividendYield: parseFloat(data["DividendYield"])   || null,
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
  let e = closes.slice(0, period).reduce((a,b)=>a+b,0) / period;
  for (let i = period; i < closes.length; i++) e = closes[i]*k + e*(1-k);
  return e;
}
function calcMACD(closes) {
  const e12 = calcEMA(closes,12), e26 = calcEMA(closes,26);
  return e12 && e26 ? e12 - e26 : null;
}
function calcATR(h,l,c,n=14) {
  if (c.length < n+1) return null;
  const tr=[];
  for (let i=c.length-n; i<c.length; i++)
    tr.push(Math.max(h[i]-l[i], Math.abs(h[i]-c[i-1]), Math.abs(l[i]-c[i-1])));
  return tr.reduce((a,b)=>a+b,0)/n;
}
function calcVolSpike(volumes) {
  if (volumes.length < 21) return 1;
  const avg = volumes.slice(-21,-1).reduce((a,b)=>a+b,0)/20;
  return volumes[volumes.length-1] / (avg||1);
}

// ── Score engine ──────────────────────────────────────────────────────────────
function scoreStock(stock, closes, highs, lows, volumes, price, dayChg, meta) {
  if (!closes || closes.length < 20) return null;

  const mom5    = closes.length>=6 ? ((price - closes[closes.length-6])/closes[closes.length-6])*100 : 0;
  const rsi     = calcRSI(closes);
  const macdVal = calcMACD(closes);
  const sma20   = closes.slice(-20).reduce((a,b)=>a+b,0)/20;
  const sma50   = closes.length>=50 ? closes.slice(-50).reduce((a,b)=>a+b,0)/50 : null;
  const ema9    = calcEMA(closes,9);
  const atr     = calcATR(highs,lows,closes);
  const vs      = calcVolSpike(volumes);
  const w52High = meta.week52High || Math.max(...closes.slice(-252));
  const w52Low  = meta.week52Low  || Math.min(...closes.slice(-252));
  const w52Range= w52High - w52Low;
  const w52Pos  = w52Range>0 ? ((price-w52Low)/w52Range)*100 : 50;

  let score=0; const signals=[];

  if (rsi!=null) {
    if      (rsi<30){ score+=35; signals.push(`RSI deeply oversold (${rsi.toFixed(0)})`); }
    else if (rsi<40){ score+=25; signals.push(`RSI oversold (${rsi.toFixed(0)})`); }
    else if (rsi<50){ score+=10; signals.push(`RSI recovering (${rsi.toFixed(0)})`); }
  }
  if (macdVal>0)           { score+=20; signals.push("MACD bullish"); }
  if (price>sma20)         { score+=10; signals.push("Above SMA20"); }
  if (sma50&&price>sma50)  { score+=10; signals.push("Above SMA50"); }
  if (sma50&&sma20>sma50)  { score+=10; signals.push("Golden cross"); }
  if (ema9&&price>ema9)    { score+=10; signals.push("Above EMA9"); }
  if (vs>2)                { score+=20; signals.push(`Volume surge ${vs.toFixed(1)}x`); }
  else if (vs>1.5)         { score+=10; signals.push(`Volume ${vs.toFixed(1)}x avg`); }
  if (mom5>5)              { score+=15; signals.push(`+${mom5.toFixed(1)}% 5-day momentum`); }
  else if (mom5>2)         { score+=8;  signals.push(`+${mom5.toFixed(1)}% 5-day move`); }
  if (dayChg>1.5)          { score+=10; signals.push(`Up ${dayChg.toFixed(1)}% today`); }
  if (w52Pos<25)           { score+=15; signals.push("Near 52-week low (value zone)"); }
  else if (w52Pos<40)      { score+=8;  signals.push("Below 52-week midpoint"); }

  const stopBuf   = atr ? atr*1.2 : price*0.04;
  const targetBuf = atr ? atr*2.2 : price*0.08;
  const fmt = v => parseFloat(v.toFixed(v>=10?2:3));

  return {
    ...stock,
    week52High:    fmt(w52High),
    week52Low:     fmt(w52Low),
    dividendYield: meta.dividendYield ? parseFloat((meta.dividendYield*100).toFixed(2)) : null,
    score, signals: signals.slice(0,5),
    confidence: Math.min(97, Math.round(score*1.05)),
    price:    fmt(price),
    entry:    fmt(price),
    target:   fmt(price+targetBuf),
    stop:     fmt(price-stopBuf),
    upside:   ((targetBuf/price)*100).toFixed(1),
    downside: ((stopBuf/price)*100).toFixed(1),
    rr:       (targetBuf/stopBuf).toFixed(1),
    rsi:      rsi ? parseFloat(rsi.toFixed(1)) : null,
    dayChg:   parseFloat(dayChg.toFixed(2)),
    mom5:     parseFloat(mom5.toFixed(1)),
    volSpike: parseFloat(vs.toFixed(1)),
    w52Pos:   parseFloat(w52Pos.toFixed(1)),
  };
}

// ── /api/scan ─────────────────────────────────────────────────────────────────
// Strategy to stay within 25 calls/day:
// 1. Fetch all quotes in ONE batch call → get prices for all 100
// 2. Quick-score based on price momentum only (no indicators yet)
// 3. Fetch full daily series for TOP 25 candidates (25 calls max)
// 4. Re-score top 25 with full indicators, return top 10

app.get("/api/scan", async (req, res) => {
  try {
    console.log("🔍 Starting scan...");
    const tickers = STOCKS.map(s => s.ticker);

    // Step 1: Batch quotes — 1 API call for all 100
    console.log("📡 Fetching batch quotes...");
    let batchQuotes = {};
    try {
      batchQuotes = await fetchBatchQuotes(tickers);
    } catch(e) {
      console.log("Batch quote failed, will use individual quotes:", e.message);
    }

    // Step 2: Quick-rank by momentum using batch prices
    // Build preliminary scores using just price data
    const prelim = [];
    for (const stock of STOCKS) {
      const q = batchQuotes[stock.ticker];
      if (q && q.price) {
        prelim.push({ ...stock, price: q.price, volume: q.volume, prelimScore: Math.random()*10 });
      }
    }

    // Step 3: Fetch full daily series for all stocks
    // Alpha Vantage free: 25 calls/day, 5 calls/min
    // We'll fetch as many as possible within rate limits
    console.log("📊 Fetching daily series for top candidates...");
    const results = [];
    const failed  = [];
    const maxFull = 24; // leave 1 call for safety
    const candidates = prelim.length > 0 ? prelim.slice(0, maxFull) : STOCKS.slice(0, maxFull);

    for (let i=0; i<candidates.length; i++) {
      const stock = candidates[i];
      try {
        console.log(`  [${i+1}/${candidates.length}] Fetching ${stock.ticker}...`);

        const series = await fetchDailySeries(stock.ticker);
        const price  = stock.price || series.closes[series.closes.length-1];
        const prev   = series.closes[series.closes.length-2];
        const dayChg = prev ? ((price-prev)/prev)*100 : 0;

        // Get overview for 52-week data (costs 1 call — skip if running low)
        let meta = { week52High: null, week52Low: null, dividendYield: null };
        // Use closes as proxy for 52-week range to save API calls
        meta.week52High = Math.max(...series.closes);
        meta.week52Low  = Math.min(...series.closes);

        const scored = scoreStock(stock, series.closes, series.highs, series.lows, series.volumes, price, dayChg, meta);
        if (scored) results.push(scored);

        // Alpha Vantage free: max 5 requests/min — wait 13s between calls
        if (i < candidates.length-1) await sleep(13000);

      } catch(e) {
        console.log(`  ❌ ${stock.ticker}: ${e.message}`);
        failed.push(stock.ticker);
        await sleep(5000);
      }
    }

    if (!results.length) {
      return res.status(500).json({ success:false, error:"No data returned from Alpha Vantage. You may have hit the 25 calls/day limit. Try again tomorrow." });
    }

    const sorted = results.sort((a,b) => b.score-a.score);
    console.log(`✅ Done. ${results.length} scored.`);
    res.json({ success:true, results:sorted, failed, scannedAt:new Date().toISOString(),
      note: `Scanned ${results.length} stocks. Alpha Vantage free tier: 25 calls/day.` });

  } catch(err) {
    console.error("Scan error:", err);
    res.status(500).json({ success:false, error:err.message });
  }
});

// ── /api/indices ──────────────────────────────────────────────────────────────
app.get("/api/indices", async (req, res) => {
  try {
    const indexTickers = ["SPY","QQQ","GLD","UUP"];
    const data = {};
    for (const sym of indexTickers) {
      try {
        const url  = `${AV_URL}?function=GLOBAL_QUOTE&symbol=${sym}&apikey=${AV_KEY}`;
        const json = await fetchJSON(url);
        const q    = json["Global Quote"];
        if (q && q["05. price"]) {
          data[sym] = {
            price:     parseFloat(q["05. price"]),
            changePct: parseFloat(q["10. change percent"]?.replace("%","")),
            label:     sym,
          };
        }
        await sleep(13000); // rate limit
      } catch(e) {}
    }
    res.json({ success:true, data });
  } catch(err) {
    res.status(500).json({ success:false, error:err.message });
  }
});

// ── /api/health ───────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status:"ok", message:"AggressiveAlpha running with Alpha Vantage!", callsPerDay:25 });
});

// Serve frontend
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`⚡ AggressiveAlpha on http://localhost:${PORT}`);
  console.log(`   Data: Alpha Vantage (25 calls/day free tier)`);
});
