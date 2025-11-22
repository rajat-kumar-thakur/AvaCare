"use client"

import { Volume2 } from "lucide-react"
import { useState, useEffect } from "react"

interface ResponseDisplayProps {
  response: string
}

export default function ResponseDisplay({ response }: ResponseDisplayProps) {
  const [displayedText, setDisplayedText] = useState("")
  const [index, setIndex] = useState(0)

  useEffect(() => {
    setDisplayedText("")
    setIndex(0)
  }, [response])

  useEffect(() => {
    if (index < response.length) {
      const timer = setTimeout(() => {
        setDisplayedText((prev) => prev + response[index])
        setIndex(index + 1)
      }, 20)
      return () => clearTimeout(timer)
    }
  }, [index, response])

  return (
    <div className="p-6 rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-900/50 to-slate-800/30 backdrop-blur-sm">
      <h3 className="text-slate-400 text-sm font-semibold mb-3">AI Response</h3>
      <p className="text-lg text-slate-100 leading-relaxed mb-4">{displayedText}</p>
      <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500/30 transition-all">
        <Volume2 size={18} />
        <span>Play Audio</span>
      </button>
    </div>
  )
}
