import React, { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries, LineSeries, HistogramSeries, IChartApi, Time, ColorType, SeriesMarker, createSeriesMarkers } from 'lightweight-charts';
import { Eye, EyeOff } from 'lucide-react';

interface StockChartProps {
    ohlcData: any[];
    indicatorData: any[];
}

export function StockChart({ ohlcData, indicatorData }: StockChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);

    // Overlay toggles
    const [showEma9, setShowEma9] = useState(true);
    const [showEma21, setShowEma21] = useState(true);
    const [showCrossovers, setShowCrossovers] = useState(true);
    const [showBollinger, setShowBollinger] = useState(true);

    // Bottom pane toggles
    const [showVolume, setShowVolume] = useState(true);
    const [showRsi, setShowRsi] = useState(true);
    const [showAdx, setShowAdx] = useState(false);
    const [showStoch, setShowStoch] = useState(true);

    useEffect(() => {
        if (!chartContainerRef.current || !Array.isArray(ohlcData) || ohlcData.length === 0 || !Array.isArray(indicatorData) || indicatorData.length === 0) return;

        const sortedOhlc = [...ohlcData].sort((a, b) => new Date(a.Date || a.time).getTime() - new Date(b.Date || b.time).getTime());
        const sortedIndicators = [...indicatorData].sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime());

        // Detect if data is intraday (multiple points per day)
        const dateStrs = sortedOhlc.map(item => {
            const d = new Date(item.Date || item.time);
            return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        });
        const isIntraday = new Set(dateStrs).size < sortedOhlc.length;

        const parseTime = (d: string): Time | null => {
            if (!d) return null;
            const date = new Date(d);
            if (isNaN(date.getTime())) return null;
            if (isIntraday) {
                // Use Unix timestamp (seconds) for intraday
                return Math.floor(date.getTime() / 1000) as unknown as Time;
            }
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}` as unknown as Time;
        };

        // Parse OHLC
        const candleData = sortedOhlc.map(item => {
            const time = parseTime(item.Date || item.time);
            if (!time) return null;
            return {
                time: time as Time,
                open: item.Open || item.open,
                high: item.High || item.high,
                low: item.Low || item.low,
                close: item.Close || item.close,
            };
        }).filter(Boolean) as any[];

        // Parse all indicator arrays
        const ema9Data: any[] = [];
        const ema21Data: any[] = [];
        const volumeData: any[] = [];
        const rsiData: any[] = [];
        const adxData: any[] = [];
        const stochData: any[] = [];
        const bbUpperData: any[] = [];
        const bbLowerData: any[] = [];

        sortedIndicators.forEach(item => {
            const time = parseTime(item.Date);
            if (!time) return;
            const t = time as Time;
            if (item.ema9 != null) ema9Data.push({ time, value: item.ema9 });
            if (item.ema21 != null) ema21Data.push({ time, value: item.ema21 });
            if (item.Volume != null) {
                volumeData.push({
                    time,
                    value: item.Volume,
                    color: (item.Close || 0) >= (item.Open || 0) ? 'rgba(38,166,154,0.4)' : 'rgba(239,83,80,0.4)',
                });
            }
            if (item.rsi != null) rsiData.push({ time, value: item.rsi });
            if (item.adx != null && item.adx > 0) adxData.push({ time, value: item.adx });
            if (item.stoch != null) stochData.push({ time, value: item.stoch });
            // Bollinger Bands: Close ± 2 * rolling_std * Close
            if (item.rolling_std != null && item.Close != null) {
                const upper = item.Close * (1 + 2 * item.rolling_std);
                const lower = item.Close * (1 - 2 * item.rolling_std);
                bbUpperData.push({ time, value: upper });
                bbLowerData.push({ time, value: lower });
            }
        });

        // EMA crossover markers
        const crossoverMarkers: SeriesMarker<Time>[] = [];
        for (let i = 1; i < sortedIndicators.length; i++) {
            const prev = sortedIndicators[i - 1];
            const curr = sortedIndicators[i];
            const currTime = parseTime(curr.Date);
            if (!currTime) continue;
            if (prev.ema9 != null && prev.ema21 != null && curr.ema9 != null && curr.ema21 != null) {
                const prevDiff = prev.ema9 - prev.ema21;
                const currDiff = curr.ema9 - curr.ema21;
                if (prevDiff <= 0 && currDiff > 0) {
                    crossoverMarkers.push({ time: currTime as Time, position: 'belowBar', color: '#FFD700', shape: 'arrowUp', text: 'Golden' });
                } else if (prevDiff >= 0 && currDiff < 0) {
                    crossoverMarkers.push({ time: currTime as Time, position: 'aboveBar', color: '#FF00FF', shape: 'arrowDown', text: 'Death' });
                }
            }
        }

        // --- Calculate dynamic pane layout ---
        const bottomPanes: { id: string; height: number }[] = [];
        if (showVolume) bottomPanes.push({ id: 'volume', height: 0.10 });
        const hasOscillator = showRsi || showAdx || showStoch;
        if (hasOscillator) bottomPanes.push({ id: 'oscillator', height: 0.18 });

        const totalBottom = bottomPanes.reduce((s, p) => s + p.height, 0);
        const mainBottom = Math.max(totalBottom + 0.02, 0.05);

        // Stack panes from bottom up
        const paneMargins: Record<string, { top: number; bottom: number }> = {};
        let curBottom = 0;
        for (const pane of bottomPanes) {
            paneMargins[pane.id] = { top: 1 - curBottom - pane.height, bottom: curBottom };
            curBottom += pane.height;
        }

        const chartHeight = 400 + bottomPanes.length * 70;

        // --- Build chart ---
        if (chartRef.current) chartRef.current.remove();

        const chart = createChart(chartContainerRef.current, {
            layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#9ca3af' },
            grid: { vertLines: { color: 'rgba(255,255,255,0.05)' }, horzLines: { color: 'rgba(255,255,255,0.05)' } },
            width: chartContainerRef.current.clientWidth,
            height: chartHeight,
            timeScale: { timeVisible: true, secondsVisible: false, borderColor: 'rgba(255,255,255,0.1)' },
            rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)', scaleMargins: { top: 0.05, bottom: mainBottom } },
        });
        chartRef.current = chart;

        // === Candlestick ===
        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#26a69a', downColor: '#ef5350', borderVisible: false,
            wickUpColor: '#26a69a', wickDownColor: '#ef5350',
        });
        candleSeries.setData(candleData);
        if (showCrossovers && crossoverMarkers.length > 0) createSeriesMarkers(candleSeries, crossoverMarkers);

        // === EMA 9 ===
        if (showEma9 && ema9Data.length > 0) {
            const s = chart.addSeries(LineSeries, { color: '#B8D8F8', lineWidth: 2 });
            s.setData(ema9Data);
        }

        // === EMA 21 ===
        if (showEma21 && ema21Data.length > 0) {
            const s = chart.addSeries(LineSeries, { color: '#FFD8B8', lineWidth: 2 });
            s.setData(ema21Data);
        }

        // === Bollinger Bands ===
        if (showBollinger && bbUpperData.length > 0) {
            const upper = chart.addSeries(LineSeries, { color: 'rgba(149,117,205,0.6)', lineWidth: 1 });
            upper.setData(bbUpperData);
            const lower = chart.addSeries(LineSeries, { color: 'rgba(149,117,205,0.6)', lineWidth: 1 });
            lower.setData(bbLowerData);
        }

        // === Volume histogram ===
        if (showVolume && volumeData.length > 0 && paneMargins['volume']) {
            const s = chart.addSeries(HistogramSeries, { priceScaleId: 'volume', priceFormat: { type: 'volume' } });
            chart.priceScale('volume').applyOptions({ scaleMargins: paneMargins['volume'] });
            s.setData(volumeData);
        }

        // === Oscillator pane (RSI / ADX / Stoch) ===
        if (hasOscillator && paneMargins['oscillator']) {
            if (showRsi && rsiData.length > 0) {
                const s = chart.addSeries(LineSeries, { color: '#c084f5', lineWidth: 2, priceScaleId: 'oscillator' });
                s.setData(rsiData);
            }
            if (showAdx && adxData.length > 0) {
                const s = chart.addSeries(LineSeries, { color: '#4FC3F7', lineWidth: 2, priceScaleId: 'oscillator' });
                s.setData(adxData);
            }
            if (showStoch && stochData.length > 0) {
                const s = chart.addSeries(LineSeries, { color: '#FFB74D', lineWidth: 2, priceScaleId: 'oscillator' });
                s.setData(stochData);
            }
            chart.priceScale('oscillator').applyOptions({ scaleMargins: paneMargins['oscillator'] });
        }

        chart.timeScale().fitContent();

        const resizeObs = new ResizeObserver(entries => {
            if (entries.length && chart) chart.applyOptions({ width: entries[0].contentRect.width });
        });
        resizeObs.observe(chartContainerRef.current);

        return () => { resizeObs.disconnect(); if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; } };
    }, [ohlcData, indicatorData, showEma9, showEma21, showCrossovers, showBollinger, showVolume, showRsi, showAdx, showStoch]);

    if (!ohlcData || !indicatorData || ohlcData.length === 0) return null;

    const Toggle = ({ label, show, setShow, color }: { label: string; show: boolean; setShow: (s: boolean) => void; color: string }) => (
        <button
            onClick={() => setShow(!show)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${show ? 'bg-[#2f2f2f] text-gray-200 border-white/10' : 'bg-transparent text-gray-500 border-transparent hover:bg-white/5'}`}
            style={{ borderLeftColor: show ? color : 'transparent', borderLeftWidth: show ? '3px' : '0px' }}
        >
            {show ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {label}
        </button>
    );

    return (
        <div className="w-full bg-[#1a1a1a] rounded-xl border border-white/5 overflow-hidden flex flex-col my-6">
            <div className="flex items-center gap-2 p-3 border-b border-white/5 bg-[#212121] flex-wrap">
                <span className="text-sm font-semibold text-gray-300 mr-2">Chart</span>
                <Toggle label="EMA (9)" show={showEma9} setShow={setShowEma9} color="#B8D8F8" />
                <Toggle label="EMA (21)" show={showEma21} setShow={setShowEma21} color="#FFD8B8" />
                <Toggle label="EMA Cross" show={showCrossovers} setShow={setShowCrossovers} color="#FFD700" />
                <Toggle label="Bollinger" show={showBollinger} setShow={setShowBollinger} color="#9575CD" />
                <div className="w-px h-4 bg-white/10" />
                <Toggle label="Volume" show={showVolume} setShow={setShowVolume} color="#26a69a" />
                <Toggle label="RSI" show={showRsi} setShow={setShowRsi} color="#c084f5" />
                <Toggle label="ADX" show={showAdx} setShow={setShowAdx} color="#4FC3F7" />
                <Toggle label="Stochastic" show={showStoch} setShow={setShowStoch} color="#FFB74D" />
            </div>
            <div ref={chartContainerRef} className="w-full relative" style={{ minHeight: '400px' }} />
        </div>
    );
}
