"use client"

import { useEffect, useRef } from "react"

interface AnimatedSphereProps {
  isListening: boolean
  isSpeaking: boolean
  isProcessing: boolean
}

export default function AnimatedSphere({ isListening, isSpeaking, isProcessing }: AnimatedSphereProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)
  const timeRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const baseRadius = 80

    const drawSphere = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Calculate dynamic radius based on state
      let radius = baseRadius
      let pulseAmount = 0

      if (isListening) {
        pulseAmount = Math.sin(timeRef.current * 0.08) * 15
      } else if (isSpeaking) {
        pulseAmount = Math.sin(timeRef.current * 0.12) * 20
      } else if (isProcessing) {
        pulseAmount = Math.sin(timeRef.current * 0.06) * 10
      }

      radius += pulseAmount

      // Main sphere gradient
      const gradient = ctx.createRadialGradient(centerX - 20, centerY - 20, 20, centerX, centerY, radius)

      if (isSpeaking) {
        gradient.addColorStop(0, "rgba(59, 130, 246, 0.8)") // blue
        gradient.addColorStop(0.5, "rgba(34, 197, 94, 0.6)") // green
        gradient.addColorStop(1, "rgba(59, 130, 246, 0.4)")
      } else if (isListening) {
        gradient.addColorStop(0, "rgba(236, 72, 153, 0.8)") // pink
        gradient.addColorStop(0.5, "rgba(168, 85, 247, 0.6)") // purple
        gradient.addColorStop(1, "rgba(236, 72, 153, 0.4)")
      } else if (isProcessing) {
        gradient.addColorStop(0, "rgba(168, 85, 247, 0.6)") // purple
        gradient.addColorStop(0.5, "rgba(59, 130, 246, 0.5)") // blue
        gradient.addColorStop(1, "rgba(168, 85, 247, 0.4)")
      } else {
        gradient.addColorStop(0, "rgba(14, 165, 233, 0.6)") // cyan
        gradient.addColorStop(0.5, "rgba(59, 130, 246, 0.4)") // blue
        gradient.addColorStop(1, "rgba(14, 165, 233, 0.2)")
      }

      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
      ctx.fill()

      // Outer ring
      ctx.strokeStyle = isListening
        ? `rgba(236, 72, 153, ${0.5 + Math.sin(timeRef.current * 0.08) * 0.3})`
        : isSpeaking
          ? `rgba(34, 197, 94, ${0.5 + Math.sin(timeRef.current * 0.12) * 0.3})`
          : isProcessing
            ? `rgba(168, 85, 247, ${0.5 + Math.sin(timeRef.current * 0.06) * 0.3})`
            : `rgba(14, 165, 233, 0.4)`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius + 8, 0, Math.PI * 2)
      ctx.stroke()

      // Floating particles around sphere
      if (isListening || isSpeaking) {
        const particleCount = isListening ? 6 : 8
        for (let i = 0; i < particleCount; i++) {
          const angle = timeRef.current * (0.02 + i * 0.01) + (i / particleCount) * Math.PI * 2
          const distance = radius + 40 + Math.sin(timeRef.current * 0.05 + i) * 15
          const x = centerX + Math.cos(angle) * distance
          const y = centerY + Math.sin(angle) * distance
          const size = 3 + Math.sin(timeRef.current * 0.1 + i) * 2

          ctx.fillStyle = isListening
            ? `rgba(236, 72, 153, ${0.6 - (i / particleCount) * 0.3})`
            : `rgba(34, 197, 94, ${0.6 - (i / particleCount) * 0.3})`
          ctx.beginPath()
          ctx.arc(x, y, size, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // Text indicator
      ctx.font = "14px sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"

      if (isListening) {
        ctx.fillStyle = "rgba(236, 72, 153, 0.8)"
        ctx.fillText("Listening", centerX, centerY + radius + 60)
      } else if (isSpeaking) {
        ctx.fillStyle = "rgba(34, 197, 94, 0.8)"
        ctx.fillText("Speaking", centerX, centerY + radius + 60)
      } else if (isProcessing) {
        ctx.fillStyle = "rgba(168, 85, 247, 0.8)"
        ctx.fillText("Processing", centerX, centerY + radius + 60)
      } else {
        ctx.fillStyle = "rgba(14, 165, 233, 0.6)"
        ctx.fillText("Ready", centerX, centerY + radius + 60)
      }

      timeRef.current += 1
      animationRef.current = requestAnimationFrame(drawSphere)
    }

    drawSphere()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isListening, isSpeaking, isProcessing])

  return (
    <div className="flex flex-col items-center gap-6">
      <canvas ref={canvasRef} width={300} height={300} className="w-full max-w-sm" />
    </div>
  )
}
