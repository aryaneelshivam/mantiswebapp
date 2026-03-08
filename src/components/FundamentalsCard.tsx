import React from 'react';
import {
    Building2, TrendingUp, DollarSign, Landmark, PieChart, Target,
    Users, Globe, ExternalLink, ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';

interface FundamentalsCardProps {
    data: any;
    ticker: string;
}

const fmt = (n: number | null | undefined): string => {
    if (n == null) return 'N/A';
    if (Math.abs(n) >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
    if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
    if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
    if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
    return n.toFixed(2);
};

const pct = (n: number | null | undefined): string => {
    if (n == null) return 'N/A';
    return `${(n * 100).toFixed(2)}%`;
};

const val = (n: number | null | undefined): string => {
    if (n == null) return 'N/A';
    return n.toFixed(2);
};

const MetricCard = ({ label, value, color = '#d1d5db', sub }: { label: string; value: string; color?: string; sub?: string }) => (
    <div className="bg-white/[0.03] rounded-lg p-3 border border-white/5">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-1">{label}</div>
        <div className="text-lg font-bold font-mono" style={{ color }}>{value}</div>
        {sub && <div className="text-[10px] text-gray-500 mt-0.5">{sub}</div>}
    </div>
);

const MarginBar = ({ label, value, color }: { label: string; value: number | null; color: string }) => {
    if (value == null) return null;
    const width = Math.max(0, Math.min(100, Math.abs(value * 100)));
    const isNegative = value < 0;
    return (
        <div className="flex items-center gap-3 py-1.5">
            <span className="text-[11px] text-gray-400 font-medium w-[90px] flex-shrink-0">{label}</span>
            <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden relative">
                <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${width}%`, backgroundColor: isNegative ? '#ef5350' : color }}
                />
            </div>
            <span className="text-[11px] font-mono font-semibold w-[52px] text-right" style={{ color: isNegative ? '#ef5350' : color }}>
                {pct(value)}
            </span>
        </div>
    );
};

const SectionHeader = ({ icon, title, accent }: { icon: React.ReactNode; title: string; accent: string }) => (
    <div className="flex items-center gap-2.5 mb-3 pb-2 border-b border-white/5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accent}18`, color: accent }}>
            {icon}
        </div>
        <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: accent }}>{title}</span>
    </div>
);

export const FundamentalsCard: React.FC<FundamentalsCardProps> = ({ data, ticker }) => {
    if (!data) return null;

    const { profile, valuation, financials, dividends, balanceSheet, targetsAndEstimates } = data;

    const recColor = (rec: string | null) => {
        if (!rec) return '#FFD8B1';
        const r = rec.toLowerCase();
        if (r === 'buy' || r === 'strong_buy' || r === 'strongbuy') return '#C1E7C1';
        if (r === 'sell' || r === 'strong_sell') return '#FFB8B8';
        return '#FFD8B1';
    };

    return (
        <div className="mt-4 space-y-3">
            {/* Header */}
            <div className="rounded-xl border border-white/5 p-5" style={{ background: 'linear-gradient(135deg, rgba(149,117,205,0.06) 0%, rgba(30,30,30,1) 50%, rgba(184,216,248,0.06) 100%)' }}>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-2">
                    Stock Fundamentals
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-2xl font-bold text-white tracking-wide">{profile?.shortName || ticker}</div>
                </div>
                {profile && (
                    <div className="flex items-center gap-3 mt-3 flex-wrap">
                        {profile.sector && (
                            <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#9575CD]/10 text-[#9575CD] border border-[#9575CD]/20 font-semibold">
                                {profile.sector}
                            </span>
                        )}
                        {profile.industry && (
                            <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#4FC3F7]/10 text-[#4FC3F7] border border-[#4FC3F7]/20 font-semibold">
                                {profile.industry}
                            </span>
                        )}
                        {profile.country && (
                            <span className="text-[10px] px-2.5 py-1 rounded-full bg-white/5 text-gray-400 border border-white/10 font-semibold flex items-center gap-1">
                                <Globe className="w-3 h-3" /> {profile.country}
                            </span>
                        )}
                        {profile.fullTimeEmployees && (
                            <span className="text-[10px] px-2.5 py-1 rounded-full bg-white/5 text-gray-400 border border-white/10 font-semibold flex items-center gap-1">
                                <Users className="w-3 h-3" /> {profile.fullTimeEmployees.toLocaleString()} employees
                            </span>
                        )}
                        {profile.website && (
                            <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-[10px] px-2.5 py-1 rounded-full bg-white/5 text-[#B8D8F8] border border-white/10 font-semibold flex items-center gap-1 hover:bg-white/10 transition-colors">
                                <ExternalLink className="w-3 h-3" /> Website
                            </a>
                        )}
                    </div>
                )}
            </div>

            {/* Valuation */}
            {valuation && (
                <div className="rounded-xl border border-white/5 bg-[#1a1a1a]/50 p-4">
                    <SectionHeader icon={<DollarSign className="w-4 h-4" />} title="Valuation" accent="#B8D8F8" />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <MetricCard label="Market Cap" value={fmt(valuation.marketCap)} color="#B8D8F8" />
                        <MetricCard label="Enterprise Value" value={fmt(valuation.enterpriseValue)} color="#B8D8F8" />
                        <MetricCard label="Trailing P/E" value={val(valuation.trailingPE)} color={valuation.trailingPE && valuation.trailingPE > 30 ? '#FFB8B8' : '#C1E7C1'} />
                        <MetricCard label="Forward P/E" value={val(valuation.forwardPE)} color={valuation.forwardPE && valuation.forwardPE > 30 ? '#FFB8B8' : '#C1E7C1'} />
                        <MetricCard label="PEG Ratio" value={val(valuation.pegRatio)} />
                        <MetricCard label="Price / Book" value={val(valuation.priceToBook)} />
                        <MetricCard label="Price / Sales" value={val(valuation.priceToSalesTrailing12Months)} />
                        <MetricCard label="EV / EBITDA" value={val(valuation.enterpriseToEbitda)} />
                    </div>
                </div>
            )}

            {/* Financials */}
            {financials && (
                <div className="rounded-xl border border-white/5 bg-[#1a1a1a]/50 p-4">
                    <SectionHeader icon={<TrendingUp className="w-4 h-4" />} title="Financial Performance" accent="#C1E7C1" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                        <MetricCard label="Total Revenue" value={fmt(financials.totalRevenue)} color="#C1E7C1" />
                        <MetricCard label="Revenue / Share" value={val(financials.revenuePerShare)} color="#C1E7C1" />
                        <MetricCard
                            label="Revenue Growth"
                            value={pct(financials.revenueGrowth)}
                            color={financials.revenueGrowth > 0 ? '#C1E7C1' : '#FFB8B8'}
                        />
                    </div>
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-2 mt-1">Margins</div>
                    <MarginBar label="Gross" value={financials.grossMargins} color="#C1E7C1" />
                    <MarginBar label="EBITDA" value={financials.ebitdaMargins} color="#81C784" />
                    <MarginBar label="Operating" value={financials.operatingMargins} color="#4FC3F7" />
                    <MarginBar label="Profit" value={financials.profitMargins} color="#B8D8F8" />
                </div>
            )}

            {/* Balance Sheet + Dividends */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {balanceSheet && (
                    <div className="rounded-xl border border-white/5 bg-[#1a1a1a]/50 p-4">
                        <SectionHeader icon={<Landmark className="w-4 h-4" />} title="Balance Sheet" accent="#FFD8B1" />
                        <div className="space-y-2">
                            <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                                <span className="text-[11px] text-gray-400">Total Cash</span>
                                <span className="text-[13px] font-bold font-mono text-[#C1E7C1]">{fmt(balanceSheet.totalCash)}</span>
                            </div>
                            <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                                <span className="text-[11px] text-gray-400">Total Debt</span>
                                <span className="text-[13px] font-bold font-mono text-[#FFB8B8]">{fmt(balanceSheet.totalDebt)}</span>
                            </div>
                            <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                                <span className="text-[11px] text-gray-400">Debt / Equity</span>
                                <span className="text-[13px] font-bold font-mono text-gray-200">{val(balanceSheet.debtToEquity)}</span>
                            </div>
                            <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                                <span className="text-[11px] text-gray-400">Book Value</span>
                                <span className="text-[13px] font-bold font-mono text-gray-200">{val(balanceSheet.bookValue)}</span>
                            </div>
                            <div className="flex justify-between items-center py-1.5">
                                <span className="text-[11px] text-gray-400">Cash / Share</span>
                                <span className="text-[13px] font-bold font-mono text-gray-200">{val(balanceSheet.totalCashPerShare)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {dividends && (
                    <div className="rounded-xl border border-white/5 bg-[#1a1a1a]/50 p-4">
                        <SectionHeader icon={<PieChart className="w-4 h-4" />} title="Dividends" accent="#9575CD" />
                        {dividends.dividendYield ? (
                            <div className="space-y-2">
                                <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                                    <span className="text-[11px] text-gray-400">Dividend Yield</span>
                                    <span className="text-[13px] font-bold font-mono text-[#9575CD]">{pct(dividends.dividendYield)}</span>
                                </div>
                                <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                                    <span className="text-[11px] text-gray-400">Dividend Rate</span>
                                    <span className="text-[13px] font-bold font-mono text-gray-200">{val(dividends.dividendRate)}</span>
                                </div>
                                <div className="flex justify-between items-center py-1.5">
                                    <span className="text-[11px] text-gray-400">Payout Ratio</span>
                                    <span className="text-[13px] font-bold font-mono text-gray-200">{pct(dividends.payoutRatio)}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-6 text-gray-500">
                                <Minus className="w-6 h-6 mb-2 opacity-40" />
                                <span className="text-[11px] font-semibold uppercase tracking-widest">No Dividend</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Analyst Targets */}
            {targetsAndEstimates && (
                <div className="rounded-xl border border-white/5 bg-[#1a1a1a]/50 p-4">
                    <SectionHeader icon={<Target className="w-4 h-4" />} title="Analyst Consensus" accent="#F8E8B8" />
                    <div className="flex items-center gap-4 mb-4">
                        <div
                            className="px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider border"
                            style={{
                                color: recColor(targetsAndEstimates.recommendationKey),
                                backgroundColor: `${recColor(targetsAndEstimates.recommendationKey)}10`,
                                borderColor: `${recColor(targetsAndEstimates.recommendationKey)}30`,
                            }}
                        >
                            {targetsAndEstimates.recommendationKey || 'N/A'}
                        </div>
                        <div className="text-[11px] text-gray-400">
                            Based on <span className="text-gray-200 font-semibold">{targetsAndEstimates.numberOfAnalystOpinions || 0}</span> analyst opinions
                        </div>
                    </div>

                    {/* Price Target Range */}
                    {targetsAndEstimates.targetLowPrice && targetsAndEstimates.targetHighPrice && (
                        <div className="mt-3">
                            <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-3">Price Target Range</div>
                            <div className="relative h-3 bg-white/5 rounded-full overflow-hidden">
                                {/* Mean marker */}
                                {targetsAndEstimates.targetMeanPrice && (() => {
                                    const low = targetsAndEstimates.targetLowPrice;
                                    const high = targetsAndEstimates.targetHighPrice;
                                    const range = high - low;
                                    const meanPos = range > 0 ? ((targetsAndEstimates.targetMeanPrice - low) / range) * 100 : 50;
                                    const medianPos = targetsAndEstimates.targetMedianPrice ? ((targetsAndEstimates.targetMedianPrice - low) / range) * 100 : meanPos;
                                    return (
                                        <>
                                            <div className="absolute h-full bg-gradient-to-r from-[#FFB8B8]/30 via-[#F8E8B8]/40 to-[#C1E7C1]/30 rounded-full" style={{ left: '0%', width: '100%' }} />
                                            <div className="absolute w-1 h-full bg-[#F8E8B8] rounded-full" style={{ left: `${meanPos}%` }} title={`Mean: ${targetsAndEstimates.targetMeanPrice}`} />
                                            <div className="absolute w-1 h-full bg-[#B8D8F8] rounded-full" style={{ left: `${medianPos}%` }} title={`Median: ${targetsAndEstimates.targetMedianPrice}`} />
                                        </>
                                    );
                                })()}
                            </div>
                            <div className="flex justify-between mt-2 text-[11px] font-mono">
                                <span className="text-[#FFB8B8] font-semibold">{val(targetsAndEstimates.targetLowPrice)}</span>
                                <div className="flex gap-4">
                                    <span className="text-[#F8E8B8]">Mean: <span className="font-semibold">{val(targetsAndEstimates.targetMeanPrice)}</span></span>
                                    <span className="text-[#B8D8F8]">Median: <span className="font-semibold">{val(targetsAndEstimates.targetMedianPrice)}</span></span>
                                </div>
                                <span className="text-[#C1E7C1] font-semibold">{val(targetsAndEstimates.targetHighPrice)}</span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
