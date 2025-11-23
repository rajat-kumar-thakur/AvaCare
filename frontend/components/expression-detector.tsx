"use client"

import type React from "react"

import { useEffect, useState, useCallback } from "react"
import Webcam from "react-webcam"

interface ExpressionDetectorProps {
  webcamRef: React.RefObject<Webcam>
  onExpressionChange: (expression: string, confidence: number) => void
  onFaceDetected?: (detected: boolean) => void
}

const BACKEND_URL = typeof window !== 'undefined' 
  ? (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000")
  : "http://localhost:8000"

export default function ExpressionDetector({ webcamRef, onExpressionChange, onFaceDetected }: ExpressionDetectorProps) {
  const [isDetecting, setIsDetecting] = useState(false)
  const [faceDetected, setFaceDetected] = useState(false)
  const [error, setError] = useState<string>("")

  const detectFace = useCallback(async () => {
    if (!webcamRef.current) {
      return
    }

    const video = webcamRef.current.video
    if (!video || video.readyState !== 4) {
      return
    }

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      return
    }

    if (isDetecting) {
      return
    }

    try {
      setIsDetecting(true)

      const imageSrc = webcamRef.current.getScreenshot()
      if (!imageSrc) {
        return
      }

      const response = await fetch(imageSrc)
      const blob = await response.blob()

      const formData = new FormData()
      formData.append("image", blob, "frame.jpg")

      const backendResponse = await fetch(`${BACKEND_URL}/detect-face`, {
        method: "POST",
        body: formData,
      })

      if (!backendResponse.ok) {
        throw new Error(`Backend error: ${backendResponse.status}`)
      }

      const data = await backendResponse.json()

      if (data.face_detected) {
        setFaceDetected(true)
        onFaceDetected?.(true)
        onExpressionChange(data.expression, data.confidence)
      } else {
        setFaceDetected(false)
        onFaceDetected?.(false)
        onExpressionChange("Neutral", 0)
      }

      setError("")
    } catch (error) {
      setError("Detection error")
      setFaceDetected(false)
      onFaceDetected?.(false)
    } finally {
      setIsDetecting(false)
    }
  }, [webcamRef, onExpressionChange, onFaceDetected, isDetecting])

  useEffect(() => {
    const interval = setInterval(() => {
      detectFace()
    }, 500)

    return () => {
      clearInterval(interval)
    }
  }, [detectFace])

  return (
    <div className="p-4 rounded-2xl border border-slate-700/50 bg-slate-900/50 backdrop-blur-sm text-center">
      <p className="text-slate-400 text-sm mb-2">Face Detection Status</p>
      <div className="flex items-center justify-center gap-2">
        {error && (
          <>
            <div className="w-2 h-2 bg-orange-500 rounded-full" />
            <p className="text-orange-400 font-semibold text-xs">Error</p>
          </>
        )}
        {!error && faceDetected && (
          <>
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <p className="text-green-400 font-semibold">User Detected</p>
          </>
        )}
        {!error && !faceDetected && (
          <>
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <p className="text-red-400 font-semibold">No Face Detected</p>
          </>
        )}
      </div>
    </div>
  )
}
