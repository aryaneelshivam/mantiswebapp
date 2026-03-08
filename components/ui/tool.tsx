"use client"

import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import {
  CheckCircle,
  ChevronDown,
  Loader2,
  Settings,
  XCircle,
} from "lucide-react"
import React, { useState } from "react"

export type ToolPart = {
  type: string
  state:
  | "input-streaming"
  | "input-available"
  | "output-available"
  | "output-error"
  input?: Record<string, unknown>
  output?: Record<string, unknown>
  toolCallId?: string
  errorText?: string
}

export type ToolProps = {
  toolPart: ToolPart
  defaultOpen?: boolean
  className?: string
}

const Tool = ({ toolPart, defaultOpen = false, className }: ToolProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const { state, input, output, toolCallId } = toolPart

  const getStateIcon = () => {
    switch (state) {
      case "input-streaming":
        return <Loader2 className="h-4 w-4 animate-spin text-[#B8D8F8]" />
      case "input-available":
        return <Settings className="h-4 w-4 text-[#FFD8B8]" />
      case "output-available":
        return <CheckCircle className="h-4 w-4 text-[#C1E7C1]" />
      case "output-error":
        return <XCircle className="h-4 w-4 text-[#FFB8B8]" />
      default:
        return <Settings className="text-gray-400 h-4 w-4" />
    }
  }

  const getStateBadge = () => {
    const baseClasses = "px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider"
    switch (state) {
      case "input-streaming":
        return (
          <span className={cn(baseClasses, "bg-[#B8D8F8]/20 text-[#B8D8F8] border border-[#B8D8F8]/30")}>
            Processing
          </span>
        )
      case "input-available":
        return (
          <span className={cn(baseClasses, "bg-[#FFD8B8]/20 text-[#FFD8B8] border border-[#FFD8B8]/30")}>
            Ready
          </span>
        )
      case "output-available":
        return (
          <span className={cn(baseClasses, "bg-[#C1E7C1]/20 text-[#C1E7C1] border border-[#C1E7C1]/30")}>
            Completed
          </span>
        )
      case "output-error":
        return (
          <span className={cn(baseClasses, "bg-[#FFB8B8]/20 text-[#FFB8B8] border border-[#FFB8B8]/30")}>
            Error
          </span>
        )
      default:
        return (
          <span className={cn(baseClasses, "bg-gray-100 text-gray-500")}>
            Pending
          </span>
        )
    }
  }

  const formatValue = (value: unknown): string => {
    if (value === null) return "null"
    if (value === undefined) return "undefined"
    if (typeof value === "string") return value
    if (typeof value === "object") {
      return JSON.stringify(value, null, 2)
    }
    return String(value)
  }

  return (
    <div
      className={cn(
        "border-white/5 mt-3 overflow-hidden rounded-xl border bg-[#1a1a1a] shadow-xl",
        className
      )}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="h-auto w-full justify-between rounded-b-none px-4 py-3 font-normal hover:bg-white/[0.03] transition-all"
          >
            <div className="flex items-center gap-3">
              {getStateIcon()}
              <span className="text-[13px] font-semibold text-gray-200">
                {toolPart.type.replace(/-/g, ' ').toUpperCase()}
              </span>
              {getStateBadge()}
            </div>
            <ChevronDown className={cn("h-4 w-4 text-gray-500 transition-transform duration-200", isOpen && "rotate-180")} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent
          className={cn(
            "border-white/5 border-t",
            "data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden"
          )}
        >
          <div className="space-y-4 p-4">
            {input && Object.keys(input).length > 0 && (
              <div>
                <h4 className="text-gray-500 mb-2 text-[10px] font-bold uppercase tracking-widest pl-1">
                  Input Parameters
                </h4>
                <div className="bg-black/20 rounded-xl border border-white/5 p-3 font-mono text-[11px] text-gray-400">
                  <pre className="whitespace-pre-wrap leading-relaxed">
                    {formatValue(input)}
                  </pre>
                </div>
              </div>
            )}

            {output && (
              <div>
                <h4 className="text-gray-500 mb-2 text-[10px] font-bold uppercase tracking-widest pl-1">
                  Output
                </h4>
                <div className={cn(
                  "max-h-[500px] overflow-auto rounded-xl font-mono text-sm",
                  !React.isValidElement(output) && "bg-black/20 border border-white/5 p-3"
                )}>
                  {typeof output === 'string' || typeof output === 'number' || typeof output === 'boolean' ? (
                    <pre className="whitespace-pre-wrap text-[12px] leading-relaxed text-gray-300">
                      {formatValue(output)}
                    </pre>
                  ) : React.isValidElement(output) ? (
                    output
                  ) : (
                    <pre className="whitespace-pre-wrap text-[12px] leading-relaxed text-gray-300">
                      {formatValue(output)}
                    </pre>
                  )}
                </div>
              </div>
            )}

            {state === "output-error" && toolPart.errorText && (
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-2 pl-1">Error</h4>
                <div className="bg-red-500/10 rounded-xl border border-red-500/20 p-3 text-[12px] text-red-400 leading-relaxed font-medium">
                  {toolPart.errorText}
                </div>
              </div>
            )}

            {state === "input-streaming" && (
              <div className="text-gray-500 text-[11px] font-medium tracking-wide animate-pulse flex items-center gap-2 pl-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                ANALYZING MARKET DATA...
              </div>
            )}

            {toolCallId && (
              <div className="text-gray-600 border-t border-white/5 pt-3 text-[9px] font-mono tracking-tighter uppercase">
                Call ID: {toolCallId}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

export { Tool }
