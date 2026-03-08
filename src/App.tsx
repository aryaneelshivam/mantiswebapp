/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Sparkles, ChevronDown, ChevronRight, Check, Loader2, LineChart, MessageSquare, PanelLeftClose, PanelLeftOpen, ArrowUp, Clock, Layers, Settings, FileText, Thermometer, Globe, Lock, AlertTriangle, Download } from 'lucide-react';
import { analyzeWithGemini, MASTER_PROMPT } from './services/geminiService';
import { AnalysisReportCard } from './components/AnalysisReport';
import { StockChart } from './components/StockChart';
import { FundamentalsCard } from './components/FundamentalsCard';
import { motion, AnimatePresence } from 'motion/react';
import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/ui/prompt-input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tool, ToolPart } from "@/components/ui/tool"
import { DataTable } from "@/components/ui/data-table"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import {
  Steps,
  StepsBar,
  StepsContent,
  StepsItem,
  StepsTrigger,
} from "@/components/ui/steps"
type Role = 'user' | 'assistant';

interface Message {
  id: string;
  role: Role;
  content: string;
  isSimulating?: boolean;
  params?: {
    ticker: string;
    timeframe: string;
    period: string;
  };
  apiData?: any;
  analysisReport?: any;
  isAnalyzing?: boolean;
}

const extractParams = (text: string) => {
  const tickerMatch = text.match(/\b[A-Z]{2,5}\b/);
  const ticker = tickerMatch ? tickerMatch[0] : 'NVDA';

  const tfMatch = text.match(/\b(\d+[mhdWMY])\b/i);
  const timeframe = tfMatch ? tfMatch[1].toUpperCase() : '1D';

  const windowMatch = text.match(/\b(\d+)(?:-day|-week|-month| rolling| window|d|w)\b/i);
  const window = windowMatch ? windowMatch[1] : '20';

  return { ticker, timeframe, window };
};

const ChainOfThought = ({ params, initialData, onComplete }: { params: any, initialData?: any, onComplete: (apiData: any) => void }) => {
  const [tools, setTools] = useState<ToolPart[]>(initialData ? [
    { type: "raw-ohlc", state: "output-available", output: <DataTable data={initialData.ohlc} /> },
    { type: "indicators", state: "output-available", output: <DataTable data={initialData.indicators} /> },
    { type: "encoded-market-states", state: "output-available", output: <DataTable data={initialData.encoded} /> },
    ...(initialData.fundamentals ? [{ type: "fundamentals", state: "output-available", output: <DataTable data={initialData.fundamentals} /> } as ToolPart] : [])
  ] : [
    { type: "raw-ohlc", state: "input-available", input: { ticker: params.ticker, interval: "1d" } },
    { type: "indicators", state: "input-available", input: { ticker: params.ticker } },
    { type: "encoded-market-states", state: "input-available", input: { ticker: params.ticker } },
    { type: "fundamentals", state: "input-available", input: { ticker: params.ticker } }
  ]);

  useEffect(() => {
    if (initialData) return;
    let isCancelled = false;

    const runAnalysis = async () => {
      const intervalMap: Record<string, string> = {
        '1m': '1m', '5m': '5m', '15m': '15m', '1H': '1h', '1D': '1d', '1W': '1wk'
      };
      const interval = intervalMap[params.timeframe] || '1d';

      const updateTool = (index: number, updates: Partial<ToolPart>) => {
        setTools(prev => prev.map((t, i) => i === index ? { ...t, ...updates } : t));
      };

      try {
        // Step 1: Raw OHLC
        updateTool(0, { state: "input-streaming" });
        const res1 = await fetch(`https://mantisframework.vercel.app/raw-ohlc/${params.ticker}?period=${params.period}&interval=${interval}`);
        const ohlcData = await res1.json();
        if (isCancelled) return;
        updateTool(0, { state: "output-available", output: <DataTable data={ohlcData} /> });

        // Step 2: Indicators
        updateTool(1, { state: "input-streaming" });
        const res2 = await fetch(`https://mantisframework.vercel.app/indicators/${params.ticker}?period=${params.period}&interval=${interval}`);
        const indicatorData = await res2.json();
        if (isCancelled) return;
        updateTool(1, { state: "output-available", output: <DataTable data={indicatorData} /> });

        // Step 3: Encoded Market States
        updateTool(2, { state: "input-streaming" });
        const res3 = await fetch(`https://mantisframework.vercel.app/encoded-market-states/${params.ticker}?period=${params.period}&interval=${interval}`);
        const encodedData = await res3.json();
        if (isCancelled) return;
        updateTool(2, { state: "output-available", output: <DataTable data={encodedData} /> });

        // Step 4: Fundamentals
        updateTool(3, { state: "input-streaming" });
        let fundamentalsData = null;
        try {
          const res4 = await fetch(`https://mantisframework.vercel.app/fundamentals/${params.ticker}`);
          fundamentalsData = await res4.json();
          if (isCancelled) return;
          updateTool(3, { state: "output-available", output: <DataTable data={fundamentalsData} /> });
        } catch {
          if (isCancelled) return;
          updateTool(3, { state: "output-error", errorText: "Fundamentals endpoint unavailable." });
        }

        // Trigger onComplete with the fetched datasets
        setTimeout(() => {
          if (!isCancelled) onComplete({ ohlc: ohlcData, indicators: indicatorData, encoded: encodedData, fundamentals: fundamentalsData });
        }, 500);

      } catch (error) {
        console.error("API Error:", error);
        setTools(prev => prev.map(t => t.state === "input-streaming" ? { ...t, state: "output-error", errorText: "Failed to fetch data." } : t));
        setTimeout(() => {
          if (!isCancelled) onComplete({ error: "Failed to fetch data from Mantis API." });
        }, 1000);
      }
    };

    runAnalysis();
    return () => { isCancelled = true; };
  }, [params.ticker]); // Removing onComplete from deps to prevent infinite loop


  return (
    <div className="flex flex-col gap-1 mb-6 mt-2">
      {tools.map((tool, idx) => (
        <div key={idx}>
          <Tool toolPart={tool} defaultOpen={false} className="border-white/5 bg-[#1a1a1a]/50" />
        </div>
      ))}
    </div>
  );
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [timeframe, setTimeframe] = useState('1D');
  const [period, setPeriod] = useState('3mo');
  const [model, setModel] = useState('Gemini');
  const [masterPrompt, setMasterPrompt] = useState(MASTER_PROMPT);
  const [temperature, setTemperature] = useState(0.5);
  const [isPromptDialogOpen, setIsPromptDialogOpen] = useState(false);
  const [tempPrompt, setTempPrompt] = useState(masterPrompt);
  const [market, setMarket] = useState<'US' | 'India'>('US');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const isLoading = messages.some(msg => msg.isSimulating);

  const validationWarning = useMemo(() => {
    const minuteIntervals = ['1m', '5m', '15m'];
    const intradayIntervals = ['1m', '5m', '15m', '1H'];
    const shortPeriods = ['1d', '5d'];
    const mediumPeriods = ['1d', '5d', '1mo'];
    if (minuteIntervals.includes(timeframe) && !shortPeriods.includes(period)) {
      return `${timeframe} interval only supports up to 7 days of data. Use period "5d" or shorter.`;
    }
    if (intradayIntervals.includes(timeframe) && !mediumPeriods.includes(period)) {
      return `${timeframe} interval only supports up to 60 days. Use period "1mo" or shorter.`;
    }
    return null;
  }, [timeframe, period]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const ticker = input.trim().toUpperCase();

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: ticker
    };

    const tickerWithMarket = market === 'India' ? `${ticker}.NS` : ticker;

    const assistantMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      isSimulating: true,
      params: {
        ticker: tickerWithMarket,
        timeframe: timeframe,
        period: period,
      }
    };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput('');
  };

  const handleSimulationComplete = async (id: string, apiData: any) => {
    // First update: stop tool simulation and show apiData
    setMessages(prev => prev.map(msg => {
      if (msg.id === id) {
        return {
          ...msg,
          isSimulating: false,
          isAnalyzing: !apiData.error, // start analyzing if no error
          apiData,
          content: apiData.error ? `**Error:** ${apiData.error}` : ""
        };
      }
      return msg;
    }));

    if (apiData.error) return;

    // Then run Gemini Analysis in the background
    try {
      const ticker = messages.find(m => m.id === id)?.params?.ticker || 'Unknown';
      const geminiReport = await analyzeWithGemini(apiData.indicators, apiData.encoded, ticker, masterPrompt, apiData.ohlc, apiData.fundamentals);

      setMessages(prev => prev.map(msg => {
        if (msg.id === id) {
          return {
            ...msg,
            isAnalyzing: false,
            analysisReport: geminiReport
          };
        }
        return msg;
      }));
    } catch (error: any) {
      console.error("Gemini Analysis Error:", error);
      setMessages(prev => prev.map(msg => {
        if (msg.id === id) {
          return {
            ...msg,
            isAnalyzing: false,
            content: `**Error starting Gemini Analysis:** ${error.message}`
          };
        }
        return msg;
      }));
    }
  };

  const handleDownloadPDF = async (msg: Message) => {
    if (!msg.apiData || !msg.apiData.ohlc || !msg.analysisReport) {
      alert("Missing data for PDF export (API data or Analysis Report).");
      return;
    }

    setDownloadingId(msg.id);
    const element = document.getElementById(`report-container-${msg.id}`);

    if (!element) {
      alert("Report container not found in DOM.");
      setDownloadingId(null);
      return;
    }

    // Step 1: Workaround for canvas failing on standard canvases (like lightweight-charts)
    // with html-to-image, canvas usually works better, but just in case we keep the clone
    const canvases = element.querySelectorAll('canvas');
    const canvasReplacements: { canvas: HTMLCanvasElement; img: HTMLImageElement }[] = [];

    canvases.forEach((canvas) => {
      try {
        const dataUrl = canvas.toDataURL('image/png');
        const img = document.createElement('img');
        img.src = dataUrl;
        img.width = canvas.width / (window.devicePixelRatio || 1); // Adjust for retina displays
        img.height = canvas.height / (window.devicePixelRatio || 1);
        img.style.position = canvas.style.position || 'relative';
        img.style.left = canvas.style.left || '0px';
        img.style.top = canvas.style.top || '0px';
        img.style.zIndex = canvas.style.zIndex || '1';
        img.className = canvas.className;

        canvas.parentNode?.insertBefore(img, canvas);
        canvas.style.display = 'none'; // Hide the original canvas

        canvasReplacements.push({ canvas, img });
      } catch (e) {
        console.warn("Could not clone canvas for PDF export. It may be tainted by cross-origin data.");
      }
    });

    try {
      // Temporarily adjust styling for better capture
      const originalBg = element.style.backgroundColor;
      element.style.backgroundColor = '#121212';
      element.style.padding = '20px';

      const imgData = await htmlToImage.toJpeg(element, {
        quality: 0.95,
        backgroundColor: '#121212',
        pixelRatio: 2, // High resolution
        style: {
          width: '1200px' // Force a specific width for consistent layout
        }
      });

      // Restore original styling
      element.style.backgroundColor = originalBg;
      element.style.padding = '';

      // Calculate PDF dimensions (A4 portrait)
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Create a temporary image object to get the dimensions of the generated image
      const img = new Image();
      img.src = imgData;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      // Calculate image dimensions to fit PDF width
      const imgWidth = pdfWidth;
      const imgHeight = (img.height * pdfWidth) / img.width;

      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      // Add subsequent pages if the content is longer than one page
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      const ticker = msg.params?.ticker || 'Stock';
      pdf.save(`${ticker}_Analysis_Report.pdf`);
    } catch (error: any) {
      console.error("Error generating PDF:", error);
      alert(`Error generating PDF: ${error.message || 'Unknown error'}`);
    } finally {
      // Step 2: Restore the original canvases and remove the temporary images
      canvasReplacements.forEach(({ canvas, img }) => {
        canvas.style.display = '';
        img.parentNode?.removeChild(img);
      });
      setDownloadingId(null);
    }
  };

  return (
    <div className="flex h-screen bg-[#212121] text-gray-100 font-sans overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="h-full bg-[#171717] flex-shrink-0 flex flex-col border-r border-white/5"
          >
            <div className="p-3">
              <button className="flex items-center gap-2 w-full hover:bg-[#2f2f2f] p-2 rounded-lg transition-colors text-sm font-medium">
                <div className="bg-white/10 p-1 rounded-full">
                  <Plus className="w-4 h-4" />
                </div>
                New chat
              </button>
            </div>

            <div className="px-3 pb-3 border-b border-white/5">
              <Dialog open={isPromptDialogOpen} onOpenChange={setIsPromptDialogOpen}>
                <DialogTrigger asChild>
                  <button
                    onClick={() => setTempPrompt(masterPrompt)}
                    className="flex items-center gap-2 w-full hover:bg-[#2f2f2f] p-2 rounded-lg transition-colors text-sm font-medium text-gray-400 hover:text-gray-200"
                  >
                    <div className="bg-white/5 p-1 rounded-full">
                      <Settings className="w-4 h-4" />
                    </div>
                    Change Master prompt
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-3xl bg-[#171717] border-white/10 text-gray-100 max-h-[75vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                      <FileText className="w-5 h-5 text-[#B8D8F8]" />
                      Edit Master Prompt
                    </DialogTitle>
                    <DialogDescription className="text-gray-400">
                      Configure the base instructions that guide Mantis's behavior and analysis style.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <Textarea
                      value={tempPrompt}
                      onChange={(e) => setTempPrompt(e.target.value)}
                      placeholder="Enter master instructions..."
                      className="min-h-[150px] bg-[#212121] border-white/10 focus:ring-[#B8D8F8]/50 resize-none text-sm leading-relaxed"
                    />
                  </div>
                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                      variant="outline"
                      onClick={() => setIsPromptDialogOpen(false)}
                      className="border-white/10 hover:bg-white/5 text-gray-400"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        setMasterPrompt(tempPrompt);
                        setIsPromptDialogOpen(false);
                      }}
                      className="bg-[#2f2f2f] hover:bg-[#3f3f3f] text-gray-200 border border-white/5"
                    >
                      Save Prompt
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Sidebar content removed per request */}
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-6">
              <div className="px-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  <Thermometer className="w-3.5 h-3.5" />
                  Response Style
                </div>
                <div className="flex bg-[#212121] rounded-xl p-1 border border-white/5 gap-0.5">
                  {([
                    { label: 'Precise', value: 0.2 },
                    { label: 'Neutral', value: 0.5 },
                    { label: 'Creative', value: 0.9 },
                  ] as const).map(({ label, value }) => (
                    <button
                      key={label}
                      onClick={() => setTemperature(value)}
                      className={`flex-1 px-3 py-2 rounded-lg text-[11px] font-semibold tracking-wide transition-all duration-200 ${temperature === value
                        ? 'bg-[#2f2f2f] text-gray-200 shadow-sm border border-white/5'
                        : 'text-gray-500 hover:text-gray-300'
                        }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-[1px] bg-white/5 mx-2" />

              <div className="px-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  <Globe className="w-3.5 h-3.5" />
                  Market
                </div>
                <div className="flex bg-[#212121] rounded-xl p-1 border border-white/5">
                  <button
                    onClick={() => setMarket('US')}
                    className={`flex-1 px-3 py-2 rounded-lg text-[11px] font-semibold tracking-wide transition-all duration-200 ${market === 'US'
                      ? 'bg-[#2f2f2f] text-[#B8D8F8] shadow-sm border border-white/5'
                      : 'text-gray-500 hover:text-gray-300'
                      }`}
                  >
                    🇺🇸 US
                  </button>
                  <button
                    onClick={() => setMarket('India')}
                    className={`flex-1 px-3 py-2 rounded-lg text-[11px] font-semibold tracking-wide transition-all duration-200 ${market === 'India'
                      ? 'bg-[#2f2f2f] text-[#FFD8B8] shadow-sm border border-white/5'
                      : 'text-gray-500 hover:text-gray-300'
                      }`}
                  >
                    🇮🇳 India
                  </button>
                </div>
                <p className="text-[9px] text-gray-600 mt-2 pl-1 tracking-wide">
                  {market === 'India' ? 'Tickers use .NS (NSE) suffix' : 'Standard US tickers'}
                </p>
              </div>

              <div className="h-[1px] bg-white/5 mx-2" />

              <div className="flex items-center gap-2 p-2 text-gray-400 text-sm">
                <MessageSquare className="w-4 h-4" />
                <span>Chat History</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative">
        {/* Header */}
        <header className="h-14 flex items-center px-4 justify-between sticky top-0 z-10 bg-[#212121]/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-[#2f2f2f] rounded-lg transition-colors text-gray-400 hover:text-gray-200"
            >
              {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2 text-lg font-medium text-gray-200">
              <svg width="24" height="24" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="mantisGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#B8D8F8" />
                    <stop offset="100%" stopColor="#C1E7C1" />
                  </linearGradient>
                </defs>
                {/* Mantis Head - triangular */}
                <path d="M50 12 L68 38 L32 38 Z" fill="url(#mantisGrad)" />
                {/* Eyes */}
                <circle cx="42" cy="28" r="4" fill="#212121" />
                <circle cx="58" cy="28" r="4" fill="#212121" />
                {/* Body */}
                <path d="M44 38 L56 38 L54 70 L46 70 Z" fill="url(#mantisGrad)" opacity="0.9" />
                {/* Left foreleg */}
                <path d="M44 42 L20 28 L16 18" stroke="url(#mantisGrad)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                {/* Right foreleg */}
                <path d="M56 42 L80 28 L84 18" stroke="url(#mantisGrad)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                {/* Left mid leg */}
                <path d="M45 54 L28 62 L22 72" stroke="url(#mantisGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.7" />
                {/* Right mid leg */}
                <path d="M55 54 L72 62 L78 72" stroke="url(#mantisGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.7" />
                {/* Abdomen */}
                <ellipse cx="50" cy="80" rx="10" ry="12" fill="url(#mantisGrad)" opacity="0.8" />
              </svg>
              <span className="font-semibold">Mantis</span>
              <span className={`text-sm font-normal px-2 py-0.5 rounded-full bg-white/5 border border-white/10 transition-colors ${model === 'Gemini' ? 'text-[#B8D8F8]' :
                model === 'ChatGPT' ? 'text-[#C1E7C1]' :
                  'text-[#FFD8B1]'
                }`}>
                {model}
              </span>
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-4">
              <h1 className="text-2xl text-center" style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>
                How can I help you analyze the market today?
              </h1>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto w-full pb-32 pt-6 px-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`mb-8 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'user' ? (
                    <div className="bg-[#2f2f2f] text-gray-100 px-5 py-3.5 rounded-3xl max-w-[80%] text-[15px] leading-relaxed">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="flex gap-4 max-w-full w-full">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 border border-white/5 mt-1">
                        <Sparkles className="w-4 h-4 text-gray-300" />
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        {msg.params && (
                          <ChainOfThought
                            params={msg.params}
                            initialData={msg.apiData}
                            onComplete={(apiData) => handleSimulationComplete(msg.id, apiData)}
                          />
                        )}

                        <div className="w-full">
                          <div id={`report-container-${msg.id}`} className="px-3 md:px-5 pb-4">
                            {msg.isAnalyzing && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="mt-4 flex flex-col gap-3"
                              >
                                <Steps defaultOpen>
                                  <StepsTrigger leftIcon={<Loader2 className="size-4 animate-spin text-[#B8D8F8]" />} className="text-[#B8D8F8] font-bold uppercase tracking-widest text-[12px]">
                                    Gemini 2.5 Flash is analyzing the data...
                                  </StepsTrigger>
                                  <StepsContent bar={<StepsBar className="mr-2 ml-1.5 opacity-30" />}>
                                    <div className="space-y-2 mt-2 opacity-80">
                                      <StepsItem className="text-[#B8D8F8]/80 text-[13px] flex items-center gap-2">
                                        <div className="size-1.5 rounded-full bg-[#B8D8F8]/50 animate-pulse" />
                                        Synthesizing Market Regimes
                                      </StepsItem>
                                      <StepsItem className="text-[#B8D8F8]/80 text-[13px] flex items-center gap-2">
                                        <div className="size-1.5 rounded-full bg-[#B8D8F8]/50 animate-pulse" style={{ animationDelay: '150ms' }} />
                                        Evaluating Cross-Layer Confidence
                                      </StepsItem>
                                      <StepsItem className="text-[#B8D8F8]/80 text-[13px] flex items-center gap-2">
                                        <div className="size-1.5 rounded-full bg-[#B8D8F8]/50 animate-pulse" style={{ animationDelay: '300ms' }} />
                                        Generating Narrative
                                      </StepsItem>
                                    </div>
                                  </StepsContent>
                                </Steps>
                              </motion.div>
                            )}

                            {msg.apiData && !msg.apiData.error && msg.apiData.ohlc && msg.apiData.indicators && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                              >
                                <StockChart ohlcData={msg.apiData.ohlc} indicatorData={msg.apiData.indicators} />
                              </motion.div>
                            )}

                            {msg.analysisReport && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4 }}
                              >
                                <AnalysisReportCard report={msg.analysisReport} ticker={msg.params?.ticker || ''} />
                              </motion.div>
                            )}

                            {msg.apiData && !msg.apiData.error && msg.apiData.fundamentals && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.3 }}
                              >
                                <FundamentalsCard data={msg.apiData.fundamentals} ticker={msg.params?.ticker || ''} />
                              </motion.div>
                            )}
                          </div>

                          {msg.content && !msg.analysisReport && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="text-gray-100 text-[15px] leading-relaxed prose prose-invert max-w-none"
                            >
                              {msg.content.split('\n\n').map((paragraph, i) => (
                                <p key={i} className="mb-4 last:mb-0" dangerouslySetInnerHTML={{
                                  __html: paragraph.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
                                }} />
                              ))}
                            </motion.div>
                          )}

                          {/* Download Button */}
                          {msg.analysisReport && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.8 }}
                              className="px-3 md:px-5 mt-2 flex justify-end"
                            >
                              <Button
                                onClick={() => handleDownloadPDF(msg)}
                                disabled={downloadingId === msg.id}
                                variant="outline"
                                className="bg-white/5 border-white/10 hover:bg-white/10 text-gray-300 gap-2 h-9 text-xs rounded-full transition-all"
                              >
                                {downloadingId === msg.id ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Generating PDF...
                                  </>
                                ) : (
                                  <>
                                    <Download className="w-3.5 h-3.5" />
                                    Download Report
                                  </>
                                )}
                              </Button>
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-3xl px-3 pb-3 md:px-5 md:pb-5">
          <PromptInput
            value={input}
            onValueChange={setInput}
            isLoading={isLoading}
            onSubmit={handleSubmit}
            className="border-white/10 bg-[#2f2f2f] relative z-10 w-full rounded-3xl border p-0 pt-1 shadow-lg"
          >
            <div className="flex flex-col">
              <PromptInputTextarea
                placeholder="Enter ticker symbol here..."
                className="min-h-[44px] pt-3 pl-4 text-gray-100 placeholder-gray-500 text-base leading-[1.3] sm:text-base md:text-base tracking-wider"
              />

              <PromptInputActions className="mt-5 flex w-full items-center justify-between gap-2 px-3 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex bg-white/5 p-1 rounded-full gap-0.5 border border-white/5">
                    {/* Gemini */}
                    <button
                      onClick={() => setModel('Gemini')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-200 ${model === 'Gemini' ? 'bg-[#B8D8F8]/10 text-[#B8D8F8]' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                        }`}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M12 0C12 6.627 6.627 12 0 12c6.627 0 12 5.373 12 12 0-6.627 5.373-12 12-12-6.627 0-12-5.373-12-12z" fill="currentColor" />
                      </svg>
                      Gemini
                    </button>
                    {/* ChatGPT (locked) */}
                    <button
                      disabled
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium text-gray-600 cursor-not-allowed opacity-50"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
                      </svg>
                      GPT
                      <Lock className="w-2.5 h-2.5" />
                    </button>
                    {/* Claude (locked) */}
                    <button
                      disabled
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium text-gray-600 cursor-not-allowed opacity-50"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.304 2.016L10.478 21.984h3.27l1.753-5.1h5.498l1.753 5.1H26l-6.696-19.968zm-.478 12.024l1.873-5.46 1.878 5.46zM7.2 2.016H3.93L-2 21.984h3.27l1.753-5.1h5.498l1.753 5.1h3.253L7.2 2.016zm-.478 12.024l1.873-5.46 1.878 5.46z" transform="scale(0.85) translate(2, 1)" />
                      </svg>
                      Claude
                      <Lock className="w-2.5 h-2.5" />
                    </button>
                  </div>

                  <div className="w-[1px] h-4 bg-white/10 mx-1" />

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 px-3 rounded-full border-white/10 bg-white/5 text-gray-400 hover:text-gray-200 hover:bg-white/10 transition-colors gap-2 text-xs">
                        <Clock className="w-3.5 h-3.5" />
                        {timeframe}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="bg-[#171717] border-white/10 text-gray-300 min-w-[100px]">
                      {['1m', '5m', '15m', '1H', '1D', '1W'].map(tf => (
                        <DropdownMenuItem
                          key={tf}
                          onClick={(e) => {
                            if (tf !== '1D') e.preventDefault();
                            else setTimeframe(tf);
                          }}
                          className={`text-xs flex items-center justify-between ${tf === '1D' ? 'focus:bg-white/10 focus:text-white cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
                        >
                          <span>{tf}</span>
                          {tf !== '1D' && <Lock className="w-2.5 h-2.5" />}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 px-3 rounded-full border-white/10 bg-white/5 text-gray-400 hover:text-gray-200 hover:bg-white/10 transition-colors gap-2 text-xs">
                        <LineChart className="w-3.5 h-3.5" />
                        {period}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="bg-[#171717] border-white/10 text-gray-300 min-w-[100px]">
                      {['1mo', '3mo', '6mo', '1y', '2y', '5y'].map(p => (
                        <DropdownMenuItem
                          key={p}
                          onClick={(e) => {
                            if (p !== '3mo') e.preventDefault();
                            else setPeriod(p);
                          }}
                          className={`text-xs flex items-center justify-between ${p === '3mo' ? 'focus:bg-white/10 focus:text-white cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
                        >
                          <span>{p}</span>
                          {p !== '3mo' && <Lock className="w-2.5 h-2.5" />}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>


                </div>

                {validationWarning && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[11px] font-medium w-full">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    {validationWarning}
                  </div>
                )}

                <div className="flex items-center gap-2">

                  <Button
                    size="icon"
                    className={`h-9 w-9 rounded-full transition-all ${input.trim()
                      ? 'bg-white text-black hover:bg-gray-200'
                      : 'bg-[#424242] text-gray-500 cursor-not-allowed'
                      }`}
                    onClick={(e) => {
                      e.preventDefault();
                      handleSubmit();
                    }}
                    disabled={!input.trim() && !isLoading}
                  >
                    {!isLoading ? (
                      <ArrowUp size={18} />
                    ) : (
                      <span className="h-3 w-3 rounded-sm bg-black animate-pulse" />
                    )}
                  </Button>
                </div>
              </PromptInputActions>
            </div>
          </PromptInput>
          <div className="text-center mt-3 text-xs text-gray-500">
            Mantis can make mistakes. Verify important financial decisions.
          </div>
        </div>
      </div>
    </div>
  );
}

