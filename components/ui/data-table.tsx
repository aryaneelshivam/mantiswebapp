import React from "react"
import { cn } from "@/lib/utils"

interface DataTableProps {
    data: any[] | Record<string, any>
    maxRows?: number
    className?: string
}

const columnColors = [
    '#E8B4B8', // rose
    '#B8D8F8', // sky blue
    '#C1E7C1', // mint
    '#FFD8B1', // peach
    '#D4B8E8', // lavender
    '#F8E8B8', // cream yellow
    '#B8E8E0', // teal
    '#F0B8D8', // pink
    '#B8C8F8', // periwinkle
    '#E8D8B8', // sand
    '#C8E8B8', // lime
    '#F8C8B8', // salmon
]

export const DataTable = ({ data, maxRows = 8, className }: DataTableProps) => {
    if (!data) return null

    const displayData = Array.isArray(data) ? data : (data as any).states || [data]

    if (!Array.isArray(displayData) || displayData.length === 0) {
        return (
            <div className="p-4 bg-[#1a1a1a] rounded-xl border border-white/5 font-mono text-[11px] leading-relaxed text-gray-400 overflow-auto max-h-40">
                <pre>{JSON.stringify(data, null, 2)}</pre>
            </div>
        )
    }

    const columns = Object.keys(displayData[0])
    const rows = displayData.slice(0, maxRows)
    const getColor = (i: number) => columnColors[i % columnColors.length]

    return (
        <div className={cn("overflow-hidden rounded-xl border border-white/5 bg-[#141414] shadow-2xl", className)}>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                        <tr className="bg-[#1a1a1a]">
                            {columns.map((col, ci) => (
                                <th key={col} className="px-4 py-3 border-b border-white/5 font-bold uppercase tracking-widest text-[9px]" style={{ color: getColor(ci) }}>
                                    {col.replace(/_/g, ' ')}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {rows.map((row, idx) => (
                            <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                                {columns.map((col, ci) => (
                                    <td key={col} className="px-4 py-2.5 font-medium truncate max-w-[180px]" style={{ color: getColor(ci) }}>
                                        {typeof row[col] === 'number' ? (
                                            <span className="font-mono tabular-nums">
                                                {row[col].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                                            </span>
                                        ) : (
                                            <span>{typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col])}</span>
                                        )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {displayData.length > maxRows && (
                <div className="px-4 py-2 text-[10px] text-gray-500 bg-[#1a1a1a] border-t border-white/5 flex items-center justify-between italic">
                    <span>Showing {maxRows} of {displayData.length} records</span>
                    <span className="text-[9px] uppercase tracking-tighter text-gray-600">Mantis Framework Output</span>
                </div>
            )}
        </div>
    )
}
