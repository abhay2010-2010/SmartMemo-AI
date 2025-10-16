"use client"
import type React from "react"
import { useState, useEffect } from "react"
import { type Language, LANGUAGES } from "../../types"
import { translateText, summarizeText } from "../../services/geminiServices"
import { Globe, FileText, Tag, Clock, Copy, Check, AlertTriangle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslate } from "../../hooks/useGemini"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { WaveformAudioPlayer } from "../animated_ui/WaveformAudioPlayer"
import { motion, AnimatePresence } from "framer-motion"

interface TranscriptionPanelProps {
  transcription: string
  onUpdateTranslation: (language: Language, translation: string) => void
  onUpdateSummary: (summary: string) => void
  audioUrl?: string
  recordingTime?: string
  isTranscribing?: boolean
}

const TranscriptionArea: React.FC<TranscriptionPanelProps> = ({
  transcription,
  onUpdateTranslation,
  onUpdateSummary,
  audioUrl,
  recordingTime,
  isTranscribing = false,
}) => {
  const { handleTranslate, isTranslating, translatedText } = useTranslate({
    translateText,
    summarizeText,
    onUpdateTranslation,
  })
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showShortAudioWarning, setShowShortAudioWarning] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Set visibility after a short delay to trigger animation
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (recordingTime) {
      const [minutes, seconds] = recordingTime.split(":").map(Number)
      const totalSeconds = minutes * 60 + seconds
      setShowShortAudioWarning(totalSeconds < 15)
    }
  }, [recordingTime])

  const handleSummarize = async () => {
    setIsSummarizing(true)
    try {
      const summaryText = await summarizeText(transcription)
      setSummary(summaryText)
      onUpdateSummary(summaryText)
    } catch (error) {
      console.error("Summarization error:", error)
    } finally {
      setIsSummarizing(false)
    }
  }

  const selectLanguage = (language: Language) => {
    setSelectedLanguage(language)
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(transcription)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy text:", error)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
      transition={{ duration: 0.5 }}
      className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg max-w-[60rem] mx-auto"
    >
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <FileText className="h-5 w-5" />
        Transcription
      </h2>

      {audioUrl && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-500 dark:text-gray-400">{recordingTime || "00:00"}</span>
          </div>
          <WaveformAudioPlayer
            audioUrl={audioUrl}
            waveColor="#6366f1"
            progressColor="#8b5cf6"
            cursorColor="#7c3aed"
            height={40}
          />
          {showShortAudioWarning && (
            <div className="mt-2 flex items-center gap-2 text-yellow-600 dark:text-yellow-400 text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span>Audio is less than 15 seconds. For best results, use longer recordings.</span>
            </div>
          )}
        </div>
      )}

      <div className="relative">
        <AnimatePresence mode="wait">
          {isTranscribing ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-gray-100 dark:bg-gray-900 rounded-md p-8 mb-4 flex flex-col items-center justify-center min-h-[150px]"
            >
              <Loader2 className="h-8 w-8 text-indigo-600 dark:text-indigo-400 animate-spin mb-4" />
              <p className="text-gray-700 dark:text-gray-300 text-center">Transcribing your audio...</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm text-center mt-2">
                This may take a moment depending on the length of your recording
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-gray-100 dark:bg-gray-900 rounded-md p-4 mb-4 text-gray-800 dark:text-white overflow-auto max-h-96 whitespace-pre-wrap"
            >
              {transcription || "No transcription available"}
            </motion.div>
          )}
        </AnimatePresence>

        {!isTranscribing && transcription && (
          <Button
            onClick={copyToClipboard}
            className="absolute -top-2 -right-2 p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
            title="Copy to clipboard"
            variant="ghost"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        )}
      </div>

      <AnimatePresence>
        {!isTranscribing && transcription && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <div className="flex flex-wrap gap-2 mb-4">
              <Select
                onValueChange={(selectedCode) => {
                  const selectedLanguage = LANGUAGES.find((lang) => lang.code === selectedCode)
                  if (selectedLanguage) selectLanguage(selectedLanguage)
                }}
              >
                <SelectTrigger className="bg-indigo-600 dark:bg-indigo-700 hover:bg-indigo-500 dark:hover:bg-indigo-600 text-white px-4 py-2 rounded-md flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <span>{selectedLanguage ? selectedLanguage.name : "Translate"}</span>
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white max-h-60 overflow-y-auto">
                  {LANGUAGES.map((language) => (
                    <SelectItem key={language.code} value={language.code}>
                      {language.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedLanguage && (
                <Button
                  onClick={() => handleTranslate(selectedLanguage, transcription)}
                  disabled={isTranslating}
                  className={`
                    bg-purple-600 dark:bg-purple-700 hover:bg-purple-500 dark:hover:bg-purple-600 text-white px-4 py-2 rounded-md
                    ${isTranslating ? "opacity-70 cursor-not-allowed" : ""}
                  `}
                >
                  {isTranslating ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Translating...
                    </span>
                  ) : (
                    "Translate Now"
                  )}
                </Button>
              )}

              <Button
                onClick={handleSummarize}
                disabled={isSummarizing}
                className={`
                  bg-teal-600 dark:bg-teal-700 hover:bg-teal-500 dark:hover:bg-teal-600 text-white px-4 py-2 rounded-md flex items-center gap-2
                  ${isSummarizing ? "opacity-70 cursor-not-allowed" : ""}
                `}
              >
                {isSummarizing ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Summarizing...
                  </span>
                ) : (
                  <>
                    <Tag className="h-4 w-4" />
                    Summarize
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {translatedText && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-4 overflow-hidden"
          >
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Translation ({selectedLanguage?.name})
            </h3>
            <div className="bg-gray-100 dark:bg-gray-900 rounded-md p-4 text-gray-800 dark:text-white overflow-auto max-h-64 whitespace-pre-wrap">
              {translatedText}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {summary && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-4 overflow-hidden"
          >
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Summary
            </h3>
            <div className="bg-gray-100 dark:bg-gray-900 rounded-md p-4 text-gray-800 dark:text-white overflow-auto max-h-64 whitespace-pre-wrap">
              {summary}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default TranscriptionArea