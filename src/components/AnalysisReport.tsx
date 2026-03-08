import React, { useMemo } from 'react';
import {
    TrendingUp, TrendingDown, Minus, Activity, BarChart3,
    Target, Brain, Crosshair, Eye, Layers, Shield
} from 'lucide-react';

interface AnalysisReportCardProps {
    report: string;
    ticker: string;
}

interface ParsedSection {
    number: string;
    title: string;
    lines: string[];
}

interface ParsedReport {
    asset: string;
    dateRange: string;
    generated: string;
    sections: ParsedSection[];
    summary: string;
}

function parseReport(raw: string): ParsedReport {
    const lines = raw.split('\n');
    let asset = '';
    let dateRange = '';
    let generated = '';
    const sections: ParsedSection[] = [];
    let summary = '';
    let currentSection: ParsedSection | null = null;
    let inSummary = false;
    let summaryLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (/^[═─]{3,}/.test(trimmed)) continue;

        const assetMatch = trimmed.match(/^Asset\s*:\s*(.+)/i);
        if (assetMatch) { asset = assetMatch[1].trim(); continue; }
        const dateMatch = trimmed.match(/^Date Range\s*:\s*(.+)/i);
        if (dateMatch) { dateRange = dateMatch[1].trim(); continue; }
        const genMatch = trimmed.match(/^Generated\s*:\s*(.+)/i);
        if (genMatch) { generated = genMatch[1].trim(); continue; }

        if (/^SUMMARY\s*:/i.test(trimmed)) {
            inSummary = true;
            const afterColon = trimmed.replace(/^SUMMARY\s*:\s*/i, '').trim();
            if (afterColon) summaryLines.push(afterColon);
            continue;
        }
        if (inSummary) { if (trimmed) summaryLines.push(trimmed); continue; }

        const sectionMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
        if (sectionMatch && trimmed === trimmed.toUpperCase()) {
            if (currentSection) sections.push(currentSection);
            currentSection = { number: sectionMatch[1], title: sectionMatch[2].trim(), lines: [] };
            continue;
        }
        if (currentSection && trimmed) currentSection.lines.push(trimmed);
    }
    if (currentSection) sections.push(currentSection);
    summary = summaryLines.join(' ');
    return { asset, dateRange, generated, sections, summary };
}

const sectionIcons: Record<string, React.ReactNode> = {
    '1': <Activity className="w-3.5 h-3.5" />,
    '2': <BarChart3 className="w-3.5 h-3.5" />,
    '3': <Target className="w-3.5 h-3.5" />,
    '4': <Eye className="w-3.5 h-3.5" />,
    '5': <Layers className="w-3.5 h-3.5" />,
    '6': <Brain className="w-3.5 h-3.5" />,
    '7': <Crosshair className="w-3.5 h-3.5" />,
};

function getBiasInfo(text: string) {
    const lower = text.toLowerCase();
    if (lower.includes('bullish')) return { label: 'Bullish', color: '#C1E7C1', icon: <TrendingUp className="w-5 h-5" /> };
    if (lower.includes('bearish')) return { label: 'Bearish', color: '#FFB8B8', icon: <TrendingDown className="w-5 h-5" /> };
    return { label: 'Neutral', color: '#a0a0a0', icon: <Minus className="w-5 h-5" /> };
}

function getConfidenceInfo(text: string) {
    const lower = text.toLowerCase();
    const pctMatch = text.match(/(\d+)\s*%/);
    const percentage = pctMatch ? `${pctMatch[1]}%` : null;
    if (lower.includes('high')) return { label: 'High', color: '#C1E7C1', percentage };
    if (lower.includes('medium') || lower.includes('moderate')) return { label: 'Medium', color: '#d4d4d4', percentage };
    return { label: 'Low', color: '#FFB8B8', percentage };
}

const KeyValueLine: React.FC<{ line: string }> = ({ line }) => {
    const kvMatch = line.match(/^([•\-]?\s*)(.+?)\s*:\s*(.+)$/);
    if (kvMatch) {
        const prefix = kvMatch[1].trim();
        const key = kvMatch[2].trim();
        const value = kvMatch[3].trim();
        return (
            <div className="flex items-start gap-2 py-1.5 border-b border-white/[0.03] last:border-0">
                {prefix && <span className="text-gray-700 text-[13px]">{prefix}</span>}
                <span className="text-gray-500 text-[13px] font-medium min-w-[140px] flex-shrink-0">{key}</span>
                <span className="text-gray-200 text-[13px] font-medium">{value}</span>
            </div>
        );
    }
    if (line.endsWith(':')) {
        return (
            <div className="mt-3 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500">{line.replace(':', '')}</span>
            </div>
        );
    }
    return <div className="py-0.5"><span className="text-[13px] text-gray-400">{line}</span></div>;
};

const SectionCard: React.FC<{ section: ParsedSection }> = ({ section }) => {
    const icon = sectionIcons[section.number] || sectionIcons['1'];
    return (
        <div className="rounded-xl border border-white/[0.05] bg-white/[0.015] p-4 hover:bg-white/[0.025] transition-colors duration-200">
            <div className="flex items-center gap-2.5 mb-3 pb-2.5 border-b border-white/[0.05]">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/[0.06] text-gray-400">
                    {icon}
                </div>
                <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-400">
                    {section.number}. {section.title}
                </span>
            </div>
            <div>{section.lines.map((line, i) => <KeyValueLine key={i} line={line} />)}</div>
        </div>
    );
};

export const AnalysisReportCard = ({ report, ticker }: AnalysisReportCardProps) => {
    const parsed = useMemo(() => parseReport(report), [report]);

    const predSection = parsed.sections.find(s => /prediction/i.test(s.title));
    const biasSection = parsed.sections.find(s => /trading\s*bias/i.test(s.title));
    const directionLine = predSection?.lines.find(l => /direction/i.test(l)) || '';
    const confidenceLine = predSection?.lines.find(l => /confidence/i.test(l)) || '';
    const biasLine = biasSection?.lines.find(l => /^bias/i.test(l)) || '';

    const bias = getBiasInfo(directionLine || biasLine);
    const confidence = getConfidenceInfo(confidenceLine);

    return (
        <div className="mt-4 space-y-2.5">
            {/* Header */}
            <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-5">
                <div className="flex items-center justify-between mb-1">
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
                        Market Analysis Report
                    </div>
                    <div className="text-[10px] text-gray-600 font-mono">
                        {parsed.generated || new Date().toLocaleDateString()}
                    </div>
                </div>
                <div className="flex items-center gap-4 mt-3">
                    <div className="text-2xl font-bold text-white tracking-tight">{parsed.asset || ticker}</div>
                    {parsed.dateRange && (
                        <div className="text-[11px] text-gray-500 bg-white/[0.04] px-3 py-1 rounded-full border border-white/[0.06]">
                            {parsed.dateRange}
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Glance */}
            <div className="flex items-stretch gap-2.5">
                <div className="flex-1 flex items-center gap-4 rounded-xl p-4 border border-white/[0.05] bg-white/[0.02]">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/[0.05]" style={{ color: bias.color }}>
                        {bias.icon}
                    </div>
                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-1">Direction</div>
                        <div className="text-xl font-bold tracking-wide" style={{ color: bias.color }}>{bias.label}</div>
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center rounded-xl border border-white/[0.05] bg-white/[0.02] px-6 min-w-[140px]">
                    <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-1">Confidence</div>
                    {confidence.percentage ? (
                        <div className="flex items-baseline gap-1.5">
                            <div className="text-2xl font-bold font-mono" style={{ color: confidence.color }}>{confidence.percentage}</div>
                            <div className="text-xs font-semibold text-gray-500">{confidence.label}</div>
                        </div>
                    ) : (
                        <div className="text-2xl font-bold font-mono" style={{ color: confidence.color }}>{confidence.label}</div>
                    )}
                </div>
            </div>

            {/* Section Cards */}
            <div className="grid grid-cols-1 gap-2.5">
                {parsed.sections.map(section => <SectionCard key={section.number} section={section} />)}
            </div>

            {/* Summary */}
            {parsed.summary && (
                <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Shield className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500">Summary</span>
                    </div>
                    <p className="text-[13px] leading-relaxed text-gray-300 font-medium">{parsed.summary}</p>
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between px-1 pt-0.5">
                <span className="text-[9px] text-gray-700 uppercase tracking-[0.15em] font-medium">Mantis × Gemini Analysis Engine</span>
                <span className="text-[9px] text-gray-700 font-mono">{ticker} • {new Date().toLocaleDateString()}</span>
            </div>
        </div>
    );
};
