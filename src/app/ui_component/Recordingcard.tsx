"use client"

import type React from "react"
import { useState, useRef } from "react"
import { useAudioRecorder } from "../../hooks/useAudioRecorder"
import { transcribeAudio } from "../../services/geminiServices"
import { Mic, Square, Send, AlertTriangle, Loader2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import VoiceVisualizer from "./VoiceVisualizer"
import { WaveformAudioPlayer } from "../animated_ui/WaveformAudioPlayer"
import { toast } from "sonner"

interface RecordingPanelProps {
  onRecordingComplete: (blob: Blob, transcription: string, time: string) => void
}

const Recordingcard: React.FC<RecordingPanelProps> = ({ onRecordingComplete }) => {
  const { isRecording, recordingTime, formattedTime, startRecording, stopRecording, reset } = useAudioRecorder()
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [audioFileName, setAudioFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleStartRecording = async () => {
    setError(null)
    try {
      const permissionStatus = await navigator.permissions.query({ name: "microphone" as PermissionName })
      if (permissionStatus.state === "denied") {
        setError("Microphone permission denied. Please enable it in your browser settings.")
        return
      }
      await startRecording()
      toast.success("Recording started")
    } catch (err) {
      console.error("Error accessing microphone:", err)
      setError("Could not access microphone. Please check permissions.")
      alert("Microphone access failed. Please check browser permissions or try a different browser.")
    }
  }

  const handleStopRecording = async () => {
    try {
      const blob = await stopRecording()
      console.log(recordingTime)
      setAudioBlob(blob)
      setAudioFileName("Recording")
      toast.success("Recording stopped")
    } catch (err) {
      setError("Error stopping recording.")
      toast.error("Fail to stopping recording.")
    }
  }

  const handleProcessAudio = async () => {
    if (!audioBlob) return

    setProcessing(true)
    setError(null)

    try {
      console.log("Processing audio with Gemini AI...", audioBlob)
      const transcription = await transcribeAudio(audioBlob)
      console.log("Transcription result:", transcription)
      onRecordingComplete(audioBlob, transcription, formattedTime)
      setAudioBlob(null)
      setAudioFileName(null)
    } catch (err) {
      setError("Error processing audio. Please try again.")
    } finally {
      setProcessing(false)
      if (!error) {
        toast.success("Audio processed successfully")
      } else {
        toast.error("Error processing audio. Please try again.")
      }
    }
  }

  const handleAlert = () => {
    alert("Voice recording must be more than 1 seconds")
  }

  const handleCancel = () => {
    stopRecording()
    reset()
    setAudioBlob(null)
    setAudioFileName(null)
    setError(null)
    toast.info("Recording cancelled")
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Check if the file is an audio file
    if (!file.type.startsWith("audio/")) {
      setError("Please upload an audio file.")
      toast.error("Invalid file type. Please upload an audio file.")
      return
    }

    // Check file size (limit to 50MB)
    const maxSize = 50 * 1024 * 1024 // 50MB in bytes
    if (file.size > maxSize) {
      setError("File size exceeds 50MB limit.")
      toast.error("File too large. Maximum size is 50MB.")
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const blob = new Blob([reader.result as ArrayBuffer], { type: file.type })
      setAudioBlob(blob)
      setAudioFileName(file.name)
      toast.success(`File "${file.name}" uploaded successfully`)
    }
    reader.onerror = () => {
      setError("Error reading file.")
      toast.error("Failed to read file.")
    }
    reader.readAsArrayBuffer(file)
  }

  const triggerFileUpload = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="bg-gradient-to-br from-red-100 to-blue-500 dark:from-gray-900 dark:to-gray-800  rounded-lg p-6 shadow-lg text-center max-w-[60rem] mx-auto">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        {isRecording ? (
          "Recording..."
        ) : audioBlob ? (
          "Ready to Process"
        ) : (
          <div className="bg-gray-200 dark:bg-gray-700 p-6 rounded-xl text-center animate-fade-in">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">I am Transcriber</h2>
            <p className="text-lg text-indigo-600 dark:text-indigo-300">
              Your friendly voice translator — ready to listen, transcribe, and translate!
            </p>
          </div>
        )}
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-600 rounded-md flex items-center gap-2 text-red-700 dark:text-red-200">
          <AlertTriangle size={20} />
          <span>{error}</span>
        </div>
      )}

      <div className="mb-6">
        {isRecording && (
          <div className="text-3xl font-mono text-gray-900 dark:text-white animate-pulse">
            {formattedTime}
            <VoiceVisualizer />
          </div>
        )}

        {audioBlob && !isRecording && (
          <>
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              {audioFileName && `File: ${audioFileName}`}
            </div>
            <WaveformAudioPlayer
              audioUrl={URL.createObjectURL(audioBlob)}
              waveColor="#6366f1"
              progressColor="#8b5cf6"
              cursorColor="#7c3aed"
              height={40}
            />
          </>
        )}
      </div>

      <div className="flex justify-center gap-4">
        {!isRecording && !audioBlob && (
          <>
            <Button
              onClick={handleStartRecording}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white rounded-full p-4 shadow-lg transition-all duration-200 transform hover:scale-105"
              aria-label="Start recording"
            >
              <Mic className="h-8 w-8" />
            </Button>

            <Button
              onClick={triggerFileUpload}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-full p-4 shadow-lg transition-all duration-200 transform hover:scale-105"
              aria-label="Upload audio file"
            >
              <Upload className="h-8 w-8" />
            </Button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="audio/*"
              className="hidden"
              aria-label="Upload audio file"
            />
          </>
        )}

        {isRecording && (
          <div className="flex gap-4">
            <Button
              onClick={handleStopRecording}
              className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-full p-4 shadow-lg transition-all duration-200 transform hover:scale-105"
              aria-label="Stop recording"
            >
              <Square className="h-8 w-8" />
            </Button>

            <Button
              onClick={handleCancel}
              variant="outline"
              className="rounded-full p-4 shadow-lg transition-all duration-200 transform hover:scale-105 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600"
              aria-label="Cancel recording"
            >
              Cancel
            </Button>
          </div>
        )}

        {audioBlob && !isRecording && (
          <div className="flex gap-4">
            <Button
              onClick={recordingTime > 1 || audioFileName !== "Recording" ? handleProcessAudio : handleAlert}
              disabled={processing}
              className={`
                bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600 text-white rounded-full p-4 shadow-lg 
                transition-all duration-200 transform hover:scale-105
                flex items-center justify-center
                ${processing ? "opacity-70 cursor-not-allowed" : ""}
              `}
              aria-label="Process audio"
            >
              {processing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Send className="h-8 w-8" />}
            </Button>

            <Button
              onClick={handleCancel}
              disabled={processing}
              variant="outline"
              className="rounded-full p-4 shadow-lg transition-all duration-200 transform hover:scale-105 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600"
              aria-label="Cancel audio"
            >
              Cancel
            </Button>
          </div>
        )}
      </div>

      {processing && (
        <div className="mt-4 text-indigo-600 dark:text-indigo-300 animate-pulse">
          Processing audio with Gemini AI...
        </div>
      )}

      <div className="mt-6 text-gray-500 dark:text-gray-400 text-sm">
        {!isRecording && !audioBlob
          ? "Click the microphone button to start recording or upload button to select an audio file"
          : isRecording
            ? "Click the stop button when you're finished recording"
            : "Click the send button to process your audio with Gemini AI"}
      </div>
    </div>
  )
}

export default Recordingcard