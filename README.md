<div align="center">

# 🦗 Mantis AI 

**Advanced Multi-Layer Market Regime Reasoning Engine**

[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Gemini](https://img.shields.io/badge/Gemini_AI-2.5_Flash-4285F4?logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)

</div>

---

## 🌟 Overview

**Mantis** is a sophisticated stock analysis platform that leverages the power of Large Language Models (LLMs) to provide deep, multi-layered market insights. By synthesizing raw price action, technical indicators, and symbolic market states, Mantis generates comprehensive reports to help traders understand market regimes and make informed decisions.

## 🚀 Key Features

- **🤖 AI-Driven Analysis**: Utilizes Google Gemini 2.5 Flash to synthesize market data and generate structured regime reports.
- **📊 Interactive Visualizations**: High-performance OHLC charts powered by `lightweight-charts`, including technical overlays (EMA, RSI, etc.).
- **🧩 Multi-Layer Context**: Analyzes data across four distinct layers:
  - **Raw OHLC**: Basic price action.
  - **Numerical Layer**: Advanced technical indicators.
  - **Symbolic Layer**: Encoded market states (Trend, Momentum, Volatility).
  - **Fundamentals Layer**: Company-specific metrics and valuation.
- **📄 Professional Reporting**: Export detailed AI-generated analysis reports to high-quality PDF files.
- **⚙️ Customizable Intelligence**: Tweak the "Master Prompt" and "Temperature" in real-time to adjust Mantis's reasoning style.
- **🇮🇳 Multiple Markets**: Native support for both US and Indian (NSE) stock markets.

## 🛠️ Tech Stack

- **Frontend**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite 6](https://vitejs.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/), [Motion](https://motion.dev/)
- **AI Engine**: [Google Generative AI (Gemini 2.5 Flash)](https://ai.google.dev/)
- **Charts**: [Lightweight Charts](https://tvlive.github.io/lightweight-charts/)
- **UI Components**: [Radix UI](https://www.radix-ui.com/), [Lucide React](https://lucide.dev/), [Shadcn UI](https://ui.shadcn.com/)
- **PDF Export**: [jsPDF](https://github.com/parallax/jsPDF), [html-to-image](https://github.com/bubkoo/html-to-image)

## 🚦 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (Latest LTS recommended)
- A Google Gemini API Key

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/stockgpt.git
   cd stockgpt
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env.local` file in the root directory and add your API key:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`.

## 📖 Usage Guide

1. **Enter a Ticker**: Type a stock symbol (e.g., `AAPL`, `TSLA`, or `RELIANCE` for India) in the input area.
2. **Select Parameters**: Use the dropdowns to choose the timeframe and lookback period.
3. **Analyze**: Mantis will fetch data from the Mantis API, generate symbolic states, and then trigger Gemini to produce a structured regime report.
4. **Export**: Click the "Download Report" button to save the entire analysis, including charts, as a PDF.
5. **Adjust Settings**: Use the sidebar to switch between "Precise", "Neutral", and "Creative" response styles, or modify the base system prompt.

## 📁 Project Structure

```text
├── components/          # Reusable UI components (Shadcn/custom)
├── lib/                 # Utility functions and helpers
├── src/
│   ├── components/      # Main feature components (Charts, Reports)
│   ├── services/        # API and AI service integrations
│   ├── App.tsx          # Main application logic
│   └── main.tsx         # Entry point
└── public/              # Static assets
```

## 📄 License

This project is licensed under the Apache-2.0 License. See the [LICENSE](LICENSE) file for details (if applicable).

---

<div align="center">
Built with ❤️ for the Trading Community.
</div>
