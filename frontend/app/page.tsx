"use client"

import { useState, useRef, useEffect } from "react"
import Webcam from "react-webcam"
import { Mic, MicOff, RefreshCw, Volume2, Pause } from "lucide-react"
import AnimatedSphere from "@/components/animated-sphere"
import ExpressionDetector from "@/components/expression-detector"
import TranscriptPanel from "@/components/transcript-panel"

const BACKEND_URL = typeof window !== 'undefined' 
  ? (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000")
  : "http://localhost:8000"

export default function Home() {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [response, setResponse] = useState("")
  const [expression, setExpression] = useState("")
  const [confidence, setConfidence] = useState(0)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [faceDetected, setFaceDetected] = useState(false)
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const webcamRef = useRef<Webcam>(null)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const initAudioContext = () => {
      if (!audioContextRef.current) {
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
          audioContextRef.current = audioCtx
          analyserRef.current = audioCtx.createAnalyser()
        } catch (err) {
          // Audio context initialization failed
        }
      }
    }

    const handleUserInteraction = () => {
      initAudioContext()
      document.removeEventListener("click", handleUserInteraction)
      document.removeEventListener("touchstart", handleUserInteraction)
    }

    document.addEventListener("click", handleUserInteraction)
    document.addEventListener("touchstart", handleUserInteraction)

    return () => {
      document.removeEventListener("click", handleUserInteraction)
      document.removeEventListener("touchstart", handleUserInteraction)
    }
  }, [])

  const startRecording = async () => {
    try {
      if (!audioContextRef.current) {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
        audioContextRef.current = audioCtx
        analyserRef.current = audioCtx.createAnalyser()
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      if (audioContextRef.current && typeof audioContextRef.current.createMediaStreamSource === "function") {
        const source = audioContextRef.current.createMediaStreamSource(stream)
        if (analyserRef.current) {
          source.connect(analyserRef.current)
          analyserRef.current.fftSize = 2048
        }
      }

      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : 'audio/ogg'
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType
      })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
        await sendAudioToBackend(audioBlob)
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      // Error accessing microphone
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      streamRef.current?.getTracks().forEach((track) => track.stop())
      setIsRecording(false)
      setIsProcessing(true)
    }
  }

  const sendAudioToBackend = async (audioBlob: Blob) => {
    try {
      const formData = new FormData()
      formData.append("audio", audioBlob, "recording.webm")
      formData.append("expression", expression)
      formData.append("expression_confidence", confidence.toString())

      const res = await fetch(`${BACKEND_URL}/process-audio`, {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`Failed to process audio: ${res.status}`)
      }

      const data = await res.json()
      setTranscript(data.transcript || "")
      setResponse(data.response || "")
      setIsSpeaking(true)

      if (data.audio_url) {
        const fullAudioUrl = `${BACKEND_URL}${data.audio_url}`
        setCurrentAudioUrl(fullAudioUrl)
        playAudio(fullAudioUrl)
      }
    } catch (error) {
      setResponse("Error processing your request. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  const playAudio = (audioUrl: string) => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current.currentTime = 0
    }

    const audio = new Audio(audioUrl)
    currentAudioRef.current = audio
    audio.onended = () => {
      setIsSpeaking(false)
      currentAudioRef.current = null
    }
    audio.play()
  }

  const reset = async () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current.currentTime = 0
      currentAudioRef.current = null
    }

    setTranscript("")
    setResponse("")
    setExpression("")
    setConfidence(0)
    setIsSpeaking(false)
    setCurrentAudioUrl(null)

    try {
      await fetch(`${BACKEND_URL}/reset`, {
        method: "POST",
      })
    } catch (error) {
      // Error resetting conversation
    }
  }

  const replayAudio = () => {
    if (currentAudioUrl) {
      setIsSpeaking(true)
      playAudio(currentAudioUrl)
    }
  }

  const pauseAudio = () => {
    if (currentAudioRef.current && isSpeaking) {
      currentAudioRef.current.pause()
      setIsSpeaking(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background text-foreground overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <div className="text-center py-6 md:py-8">
          <h1 className="text-3xl md:text-4xl font-bold text-balance text-foreground">Hindi AI Assistant</h1>
          <p className="text-muted-foreground text-sm md:text-base mt-2">Speak, and I'll understand</p>
        </div>

        {/* Main content - Sphere + Face */}
        <div className="flex-1 flex items-center justify-center px-4 md:px-8">
          <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Webcam - Left side */}
            <div className="md:col-span-3 flex flex-col gap-4">
              <div className="relative rounded-2xl overflow-hidden border border-border/50 bg-card/40 backdrop-blur-sm aspect-square">
                <Webcam 
                  ref={webcamRef} 
                  className="w-full h-full object-cover" 
                  videoConstraints={{ 
                    facingMode: "user",
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                  }}
                  screenshotFormat="image/jpeg"
                  mirrored={true}
                />
                <div className="absolute inset-0 rounded-2xl border border-primary/20" />
              </div>
              <ExpressionDetector
                webcamRef={webcamRef}
                onExpressionChange={(expr, conf) => {
                  setExpression(expr)
                  setConfidence(conf)
                }}
                onFaceDetected={(detected) => {
                  setFaceDetected(detected)
                }}
              />
              <div className="p-4 rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm text-center">
                <p className="text-xs text-muted-foreground mb-1">Current Expression</p>
                {expression ? (
                  <>
                    <p className="text-sm font-semibold text-primary">{expression}</p>
                    <p className="text-xs text-muted-foreground">{Math.round(confidence * 100)}%</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Waiting...</p>
                )}
              </div>
            </div>

            {/* Central Sphere - Center */}
            <div className="md:col-span-6 flex flex-col items-center justify-center gap-6">
              <AnimatedSphere isListening={isRecording} isSpeaking={isSpeaking} isProcessing={isProcessing} />

              {/* Control buttons */}
              <div className="flex gap-3 justify-center flex-wrap">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isProcessing}
                  className={`flex items-center gap-2 px-6 md:px-8 py-3 rounded-full font-semibold transition-all ${
                    isRecording
                      ? "bg-destructive/20 text-destructive border border-destructive/50 hover:bg-destructive/30"
                      : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isRecording ? (
                    <>
                      <MicOff size={18} />
                      <span className="text-sm md:text-base">Stop</span>
                    </>
                  ) : (
                    <>
                      <Mic size={18} />
                      <span className="text-sm md:text-base">Speak</span>
                    </>
                  )}
                </button>

                {(transcript || response) && (
                  <button
                    onClick={reset}
                    className="flex items-center gap-2 px-6 md:px-8 py-3 rounded-full font-semibold text-foreground/70 border border-border hover:text-foreground hover:border-border/80 transition-all"
                  >
                    <RefreshCw size={18} />
                    <span className="text-sm md:text-base">Reset</span>
                  </button>
                )}
              </div>

              {isProcessing && (
                <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0ms]" />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:150ms]" />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                  <span>Processing...</span>
                </div>
              )}
            </div>

            {/* Transcript panel - Right side */}
            <div className="md:col-span-3">
              <TranscriptPanel transcript={transcript} response={response} />
            </div>
          </div>
        </div>

        {/* Full width transcript section at bottom */}
        {(transcript || response) && (
          <div className="w-full px-4 md:px-8 py-8 border-t border-border/50 bg-card/20 backdrop-blur-sm">
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
              {transcript && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">You Said</h3>
                  <div className="p-4 rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm min-h-24 flex items-center">
                    <p className="text-base text-foreground leading-relaxed">{transcript}</p>
                  </div>
                </div>
              )}
              {response && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">AI Response</h3>
                    {currentAudioUrl && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={replayAudio}
                          disabled={isSpeaking}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/20 text-primary border border-primary/50 hover:bg-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Volume2 size={14} />
                          <span>Replay</span>
                        </button>
                        <button
                          onClick={pauseAudio}
                          disabled={!isSpeaking}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/50 hover:bg-orange-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Pause size={14} />
                          <span>Pause</span>
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="p-4 rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm min-h-24 overflow-y-auto">
                    <p className="text-base text-foreground leading-relaxed whitespace-pre-wrap">{response}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
