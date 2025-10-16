"use client"

import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react"
import WaveSurfer from "wavesurfer.js"

interface WaveformAudioPlayerProps {
  audioUrl: string
  waveColor?: string
  progressColor?: string
  cursorColor?: string
  height?: number
  isPlaying?: boolean
  onPlayPause?: () => void
  onStop?: () => void
  onRegisterRef?: (ref: { stop: () => void }) => void
}

export interface WaveformAudioPlayerRef {
  stop: () => void
}

export const WaveformAudioPlayer = forwardRef<WaveformAudioPlayerRef, WaveformAudioPlayerProps>(
  (
    {
      audioUrl,
      waveColor = "#6366f1",
      progressColor = "#8b5cf6",
      cursorColor = "#7c3aed",
      height = 40,
      isPlaying = false,
      onPlayPause,
      onStop,
      onRegisterRef,
    },
    ref,
  ) => {
    const waveformRef = useRef<HTMLDivElement>(null)
    const wavesurferRef = useRef<WaveSurfer | null>(null)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [internalIsPlaying, setInternalIsPlaying] = useState(false)

    // Expose stop method to parent
    useImperativeHandle(ref, () => ({
      stop: () => {
        if (wavesurferRef.current) {
          wavesurferRef.current.stop()
          setInternalIsPlaying(false)
          onStop?.()
        }
      },
    }))

    // Register ref with parent on mount
    useEffect(() => {
      if (onRegisterRef) {
        onRegisterRef({
          stop: () => {
            if (wavesurferRef.current) {
              wavesurferRef.current.stop()
              setInternalIsPlaying(false)
              onStop?.()
            }
          },
        })
      }
    }, [onRegisterRef, onStop])

    // Initialize WaveSurfer
    useEffect(() => {
      if (!waveformRef.current || !audioUrl) return

      let isCleanedUp = false
      let wavesurfer: WaveSurfer | null = null

      const initializeWaveSurfer = async () => {
        try {
          wavesurfer = WaveSurfer.create({
            container: waveformRef.current!,
            waveColor,
            progressColor,
            cursorColor,
            barWidth: 2,
            barRadius: 3,
            cursorWidth: 1,
            height,
            barGap: 2,
            normalize: true,
            backend: "WebAudio",
            hideScrollbar: true,
          })

          if (isCleanedUp) {
            wavesurfer.destroy()
            return
          }

          wavesurferRef.current = wavesurfer
          setIsLoading(true)
          setError(null)

          // Event handlers
          const handleReady = () => {
            if (isCleanedUp) return
            setDuration(wavesurfer!.getDuration())
            setIsLoading(false)
          }

          const handlePlay = () => {
            if (!isCleanedUp) {
              setInternalIsPlaying(true)
            }
          }

          const handlePause = () => {
            if (!isCleanedUp) {
              setInternalIsPlaying(false)
            }
          }

          const handleFinish = () => {
            if (!isCleanedUp) {
              setInternalIsPlaying(false)
              onStop?.()
            }
          }

          const handleAudioProcess = () => {
            if (!isCleanedUp && wavesurfer) {
              setCurrentTime(wavesurfer.getCurrentTime())
            }
          }

          const handleError = (err: Error) => {
            if (!isCleanedUp) {
              console.error("WaveSurfer error:", err)
              setError("Failed to load audio")
              setIsLoading(false)
              setInternalIsPlaying(false)
            }
          }

          const handleLoading = (percent: number) => {
            if (!isCleanedUp && percent < 100) {
              setIsLoading(true)
            }
          }

          // Subscribe to events
          wavesurfer.on("ready", handleReady)
          wavesurfer.on("play", handlePlay)
          wavesurfer.on("pause", handlePause)
          wavesurfer.on("finish", handleFinish)
          wavesurfer.on("audioprocess", handleAudioProcess)
          wavesurfer.on("error", handleError)
          wavesurfer.on("loading", handleLoading)

          // Load audio
          if (!isCleanedUp) {
            await wavesurfer.load(audioUrl)
          }
        } catch (err) {
          if (!isCleanedUp) {
            console.error("Audio loading failed:", err)
            setError("Failed to load audio")
            setIsLoading(false)
            setInternalIsPlaying(false)
          }
        }
      }

      initializeWaveSurfer()

      // Cleanup
      return () => {
        isCleanedUp = true

        if (wavesurfer) {
          setTimeout(() => {
            try {
              if (wavesurfer && typeof wavesurfer.destroy === "function") {
                wavesurfer.destroy()
              }
            } catch (e) {
              // Silently ignore cleanup errors
            }
          }, 0)
        }

        wavesurferRef.current = null
      }
    }, [audioUrl, waveColor, progressColor, cursorColor, height])

    // Sync with external play/pause state
    useEffect(() => {
      if (!wavesurferRef.current || isLoading) return

      if (isPlaying && !wavesurferRef.current.isPlaying()) {
        wavesurferRef.current.play().catch((err) => {
          console.error("Playback failed:", err)
          setError("Playback failed")
          setInternalIsPlaying(false)
        })
      } else if (!isPlaying && wavesurferRef.current.isPlaying()) {
        wavesurferRef.current.pause()
      }
    }, [isPlaying, isLoading])

    const formatTime = (seconds: number): string => {
      if (!isFinite(seconds)) return "0:00"
      const minutes = Math.floor(seconds / 60)
      const secs = Math.floor(seconds % 60)
      return `${minutes}:${secs < 10 ? "0" : ""}${secs}`
    }

    const togglePlayPause = () => {
      if (onPlayPause) {
        onPlayPause()
      } else if (wavesurferRef.current) {
        wavesurferRef.current.playPause()
      }
    }

    const skipTime = (seconds: number) => {
      if (wavesurferRef.current && !isLoading) {
        const newTime = Math.max(0, Math.min(duration, wavesurferRef.current.getCurrentTime() + seconds))
        wavesurferRef.current.setTime(newTime)
      }
    }

    if (error) {
      return (
        <div className="flex items-center justify-center p-4 bg-red-50 dark:bg-red-900/20 rounded text-red-600 dark:text-red-300">
          <span>{error}</span>
        </div>
      )
    }

    return (
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <button
            onClick={togglePlayPause}
            disabled={isLoading}
            className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
              isLoading
                ? "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
                : "bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800"
            }`}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isLoading ? (
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : isPlaying || internalIsPlaying ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
          <div className="flex-1 mx-2 relative">
            {isLoading && (
              <div
                className="absolute inset-0 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
                style={{ height: `${height}px` }}
              />
            )}
            <div ref={waveformRef} className={`w-full ${isLoading ? "opacity-0" : "opacity-100"}`} />
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 w-16 text-right">
            {isLoading ? "--:--" : `${formatTime(currentTime)}`}
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{formatTime(0)}</span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => skipTime(-5)}
              disabled={isLoading}
              className={`px-1 py-0.5 rounded transition-colors ${
                isLoading
                  ? "cursor-not-allowed text-gray-300 dark:text-gray-600"
                  : "hover:text-indigo-600 dark:hover:text-indigo-300"
              }`}
            >
              -5s
            </button>
            <button
              onClick={() => skipTime(5)}
              disabled={isLoading}
              className={`px-1 py-0.5 rounded transition-colors ${
                isLoading
                  ? "cursor-not-allowed text-gray-300 dark:text-gray-600"
                  : "hover:text-indigo-600 dark:hover:text-indigo-300"
              }`}
            >
              +5s
            </button>
          </div>
          <span>{isLoading ? "--:--" : formatTime(duration)}</span>
        </div>
      </div>
    )
  },
)

WaveformAudioPlayer.displayName = "WaveformAudioPlayer"
