import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: 'AIzaSyDneQe0Ykps4uFxwHBY_z2zt-1yrON8i88' });

export const MASTER_PROMPT = `You are an advanced multi-layer market regime reasoning engine operating on MANTIS-generated datasets.

MODE: Structured symbolic and numerical regime synthesis.

1. **[raw ohlc dataset]** — Raw Open, High, Low, Close, and Volume data.

2. **[indicators dataset]** — Technical indicators including momentum indicators,
   moving averages, volatility metrics, and return-based features.

3. **[encoded states dataset]** — Categorical/encoded market states describing 
   Trend, Momentum, Volatility, Market Structure, Candle Patterns, 
   and State Transition signals.

4. **[fundamentals dataset]** — (If available) Company fundamentals, earnings, valuation metrics, etc.

Scan all datasets, identify all columns and map them to their roles. 
Use the LAST 50 ROWS for all analysis. Be concise — no long paragraphs. 
Use metrics, labels, and short explanations only.

Generate a structured report in the following format:

═══════════════════════════════════════════
        MARKET ANALYSIS REPORT
        Asset: [detect from data if possible]
        Date Range: [first to last date in sample]
        Generated: [today's date]
═══════════════════════════════════════════

─────────────────────────────────────────
 1. MARKET REGIME
─────────────────────────────────────────
  Trend        : [Bullish / Bearish / Neutral] — [1 line reason]
  Momentum     : [Strong / Weak / Fading] — [1 line reason]  
  Volatility   : [High / Medium / Low] — [1 line reason]
  Structure    : [Trending / Ranging / Transitioning]

─────────────────────────────────────────
 2. PRICE ACTION SUMMARY
─────────────────────────────────────────
  Recent Candles   : [Describe last 3–5 candles in 1–2 lines]
  Pattern Detected : [Name pattern or "None"]
  Price Behaviour  : [Trending / Consolidating / Reversing]
  HH/HL or LH/LL  : [State which structure is forming]

─────────────────────────────────────────
 3. KEY LEVELS
─────────────────────────────────────────
  Strong Resistance : [Price level] — [reason]
  Weak Resistance   : [Price level] — [reason]
  Strong Support    : [Price level] — [reason]  
  Weak Support      : [Price level] — [reason]
  EMA Support/Res   : [EMA level acting as S/R if any]

─────────────────────────────────────────
 4. SENTIMENT ANALYSIS  
─────────────────────────────────────────
  Overall Sentiment : [Bullish / Bearish / Neutral]
  
  Indicator Sentiment:
  • RSI         : [value] → [Overbought / Oversold / Neutral]
  • Stochastic  : [value] → [Overbought / Oversold / Neutral]
  • ADX         : [value] → [Trending / Weak trend]
  • EMA Spread  : [Widening / Narrowing] → [Bullish / Bearish bias]
  • Volume Trend: [Rising / Falling / Flat] → [confirms / denies move]
  
  State Sentiment (from encoded file):
  • Momentum State      : [value from file]
  • Volatility Shift    : [value from file]
  • Trend Transition    : [value from file]
  • Structure Transition: [value from file]

  Sentiment Score : [Bullish X/7 | Bearish X/7 | Neutral X/7]

─────────────────────────────────────────
 5. SIGNAL CONFLUENCE
─────────────────────────────────────────
  Confluence Rating : [Strong / Moderate / Weak]
  Agreeing Signals  : [list in 1 line]
  Conflicting Signals: [list in 1 line or "None"]

─────────────────────────────────────────
 6. PREDICTION
─────────────────────────────────────────
  Direction   : [Bullish / Bearish / Neutral]
  Confidence  : [High / Medium / Low] — [X%] (0–100%)
  Reasoning   : [2–3 lines max]
  Watch Level : [Key level that confirms or breaks the thesis]

─────────────────────────────────────────
 7. TRADING BIAS
─────────────────────────────────────────
  Bias         : [Long / Short / Wait]
  Entry        : [Condition or price level]
  Target 1     : [Price]
  Target 2     : [Price]
  Invalidation : [Price or signal]
  Risk Context : [1 line on current volatility / sizing note]

═══════════════════════════════════════════
  SUMMARY : [3 lines max — the single most important 
             takeaway from this analysis]
═══════════════════════════════════════════

Keep every section tight. No unnecessary elaboration. 
If a signal is not detectable from the data, write "N/A".`;

export async function analyzeWithGemini(
  indicatorData: any,
  encodedData: any,
  ticker: string,
  customMasterPrompt?: string,
  ohlcData?: any,
  fundamentalsData?: any
): Promise<string> {
  // Send latest 50 rows of datasets in compact JSON
  const indicatorRows = (Array.isArray(indicatorData) ? indicatorData : []).slice(-50);
  const encodedRows = (encodedData?.states ? encodedData.states :
    Array.isArray(encodedData) ? encodedData : []).slice(-50);
  const ohlcRows = (Array.isArray(ohlcData) ? ohlcData : []).slice(-50);

  let userPrompt = `Analyze the following MANTIS-generated datasets for ticker: ${ticker}

RAW OHLC LAYER (${ohlcRows.length} rows):
${JSON.stringify(ohlcRows)}

NUMERICAL LAYER (Indicators - ${indicatorRows.length} rows):
${JSON.stringify(indicatorRows)}

SYMBOLIC LAYER (Encoded Market States - ${encodedRows.length} rows):
${JSON.stringify(encodedRows)}`;

  if (fundamentalsData) {
    userPrompt += `\n\nFUNDAMENTALS LAYER:\n${JSON.stringify(fundamentalsData)}`;
  }

  userPrompt += `

Provide your structured regime analysis following the report format specified in the system prompt. Factor in ALL data layers — technical indicators and encoded market states — for a comprehensive analysis.`;

  const MAX_RETRIES = 3;
  let lastError: any;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[Gemini] Attempt ${attempt}/${MAX_RETRIES} — sending to Gemini 2.5 Flash...`);

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: (customMasterPrompt || MASTER_PROMPT) + '\n\n' + userPrompt,
        config: {
          temperature: 0.3,
          maxOutputTokens: 65536,
        }
      });

      const text = response.text || '';
      console.log('[Gemini] Response text:', text);
      return text;

    } catch (err: any) {
      lastError = err;
      const isRateLimit = err?.message?.includes('429') || err?.message?.includes('RESOURCE_EXHAUSTED') || err?.toString?.()?.includes('429');

      if (isRateLimit && attempt < MAX_RETRIES) {
        const delay = attempt * 4000; // 4s, 8s
        console.warn(`[Gemini] Rate limited. Retrying in ${delay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw err;
      }
    }
  }

  throw lastError;
}
