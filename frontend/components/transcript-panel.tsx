"use client"

import { useState, useEffect } from "react"

interface TranscriptPanelProps {
  transcript: string
  response: string
}

export default function TranscriptPanel({ transcript, response }: TranscriptPanelProps) {
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
      }, 30)
      return () => clearTimeout(timer)
    }
  }, [index, response])

  if (!transcript && !response) {
    return (
      <div className="p-6 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm text-center">
        <p className="text-sm text-muted-foreground">Ready to listen</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {transcript && (
        <div className="p-4 rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm">
          <h3 className="text-xs text-muted-foreground font-semibold mb-2 uppercase">You said</h3>
          <p className="text-sm text-foreground">{transcript}</p>
        </div>
      )}

      {response && (
        <div className="p-4 rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm overflow-y-auto">
          <h3 className="text-xs text-muted-foreground font-semibold mb-2 uppercase">Response</h3>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{displayedText}</p>
        </div>
      )}
    </div>
  )
}
