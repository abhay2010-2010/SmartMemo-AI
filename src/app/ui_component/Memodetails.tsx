"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { type Language, LANGUAGES, type VoiceMemo } from "../../types"
import { Download, FileText, Globe, Tag, FileType, ChevronDown, X, Loader2, Eye, Edit } from "lucide-react"
import { useTranslate } from "../../hooks/useGemini"
import { useMemos } from "../../hooks/useMemo"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { translateText, summarizeText } from "../../services/geminiServices"
import { Button } from "@/components/ui/button"
import { WaveformAudioPlayer } from "../animated_ui/WaveformAudioPlayer"
import { generatePDF } from "../../utils/generatePDF"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import EditTranscriptModal from "./EditTranscriptModal"

interface MemoDetailProps {
  memo: VoiceMemo
}

type DownloadFormat = "txt" | "pdf" | "mp3"

interface DownloadState {
  isDownloading: boolean
  progress: number
  controller?: AbortController
  startTime?: number
  animationId?: number
}

const MemoDetail: React.FC<MemoDetailProps> = ({ memo }) => {
  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(null)
  const [translationMap, setTranslationMap] = useState<{
    [memoId: string]: { text: string; language: string }
  }>({})
  const [summaryMap, setSummaryMap] = useState<{
    [memoId: string]: { text: string }
  }>({})
  const [downloadStates, setDownloadStates] = useState<{
    [key: string]: DownloadState
  }>({})
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editedTranscript, setEditedTranscript] = useState(memo.transcription || "")

  const { updateMemo } = useMemos()

  const { handleTranslate, isTranslating, handleSummarize, isSummarizing } = useTranslate({
    translateText,
    summarizeText,
    onUpdateTranslation: (language, translation) => {
      setTranslationMap((prev) => ({
        ...prev,
        [memo.id]: {
          text: translation,
          language: language.name,
        },
      }))

      updateMemo({
        ...memo,
        translation: {
          language: language.code,
          text: translation,
        },
      })
    },
    onUpdateSummary: (summaryText) => {
      setSummaryMap((prev) => ({
        ...prev,
        [memo.id]: {
          text: summaryText,
        },
      }))
      updateMemo({
        ...memo,
        summary: summaryText,
      })
    },
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const animateProgress = (
    downloadKey: string,
    targetProgress: number,
    startTime: number,
    minDuration: number = 3000
  ) => {
    const currentTime = Date.now()
    const elapsed = currentTime - startTime
    const minElapsed = Math.min(elapsed, minDuration)
    const timeProgress = minElapsed / minDuration
    
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
    const animatedTimeProgress = easeOutCubic(timeProgress)
    
    const displayProgress = Math.min(
      targetProgress * 0.7 + animatedTimeProgress * 30,
      elapsed >= minDuration ? targetProgress : Math.min(targetProgress, animatedTimeProgress * 100)
    )

    setDownloadStates((prev) => {
      const currentState = prev[downloadKey]
      if (!currentState || !currentState.isDownloading) return prev
      
      return {
        ...prev,
        [downloadKey]: {
          ...currentState,
          progress: Math.round(displayProgress),
        },
      }
    })

    if ((targetProgress < 100 || elapsed < minDuration) && downloadStates[downloadKey]?.isDownloading) {
      const animationId = requestAnimationFrame(() =>
        animateProgress(downloadKey, targetProgress, startTime, minDuration)
      )
      
      setDownloadStates((prev) => ({
        ...prev,
        [downloadKey]: {
          ...prev[downloadKey],
          animationId,
        },
      }))
    }
  }

  const downloadAudio = async () => {
    if (!memo.audioUrl) return

    const downloadKey = `audio-${memo.id}`
    const controller = new AbortController()
    const startTime = Date.now()

    try {
      setDownloadStates((prev) => ({
        ...prev,
        [downloadKey]: { 
          isDownloading: true, 
          progress: 0, 
          controller,
          startTime 
        },
      }))

      animateProgress(downloadKey, 0, startTime)

      await new Promise(resolve => setTimeout(resolve, 500))

      if (controller.signal.aborted) {
        throw new Error("Download cancelled")
      }

      const response = await fetch(memo.audioUrl, {
        signal: controller.signal,
      })

      if (!response.ok) throw new Error("Download failed")

      const contentLength = response.headers.get("content-length")
      const total = contentLength ? Number.parseInt(contentLength, 10) : 0

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No reader available")

      const chunks: ArrayBuffer[] = []
      let received = 0
      let lastProgressUpdate = 0

      while (true) {
        if (controller.signal.aborted) {
          throw new Error("Download cancelled")
        }

        const { done, value } = await reader.read()

        if (done) break

        const buffer = new ArrayBuffer(value.length)
        const view = new Uint8Array(buffer)
        view.set(value)
        chunks.push(buffer)
        received += value.length

        const now = Date.now()
        if (now - lastProgressUpdate > 100) {
          if (total > 0) {
            const actualProgress = (received / total) * 100
            animateProgress(downloadKey, actualProgress, startTime)
          }
          lastProgressUpdate = now
        }

        await new Promise(resolve => setTimeout(resolve, 10))
      }

      const elapsed = Date.now() - startTime
      const remainingTime = Math.max(0, 3000 - elapsed)
      
      if (remainingTime > 0) {
        animateProgress(downloadKey, 95, startTime)
        await new Promise(resolve => setTimeout(resolve, remainingTime))
      }

      animateProgress(downloadKey, 100, startTime)
      await new Promise(resolve => setTimeout(resolve, 200))

      const blob = new Blob(chunks, { type: "audio/mpeg" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${memo.name}.mp3`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setDownloadStates((prev) => ({
        ...prev,
        [downloadKey]: { 
          ...prev[downloadKey],
          progress: 100,
        },
      }))

      setTimeout(() => {
        setDownloadStates((prev) => {
          const newState = { ...prev }
          if (newState[downloadKey]?.animationId) {
            cancelAnimationFrame(newState[downloadKey].animationId!)
          }
          delete newState[downloadKey]
          return newState
        })
      }, 1000)

    } catch (error) {
      console.error("Download error:", error)
      
      setDownloadStates((prev) => {
        const newState = { ...prev }
        if (newState[downloadKey]?.animationId) {
          cancelAnimationFrame(newState[downloadKey].animationId!)
        }
        delete newState[downloadKey]
        return newState
      })

      if (error instanceof Error && error.message !== "Download cancelled") {
        console.error("Download failed:", error)
      }
    }
  }

  const cancelDownload = (downloadKey: string) => {
    const downloadState = downloadStates[downloadKey]
    if (downloadState) {
      if (downloadState.controller) {
        downloadState.controller.abort()
      }
      
      if (downloadState.animationId) {
        cancelAnimationFrame(downloadState.animationId)
      }
      
      setDownloadStates((prev) => ({
        ...prev,
        [downloadKey]: {
          ...prev[downloadKey],
          isDownloading: false,
          progress: 0,
        },
      }))

      setTimeout(() => {
        setDownloadStates((prev) => {
          const newState = { ...prev }
          delete newState[downloadKey]
          return newState
        })
      }, 500)
    }
  }

  const downloadTranscription = (format: DownloadFormat) => {
    if (!editedTranscript) return

    if (format === "txt") {
      const blob = new Blob([editedTranscript], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${memo.name}_transcription.txt`
      a.click()
      URL.revokeObjectURL(url)
    } else if (format === "pdf") {
      generatePDF({
        title: `${memo.name} - Transcription`,
        content: editedTranscript,
        filename: `${memo.name}_transcription.pdf`,
      })
    }
  }

  const downloadTranslation = (format: DownloadFormat) => {
    const translationToDownload = translationMap[memo.id] || memo.translation
    if (!translationToDownload?.text) return

    if (format === "txt") {
      const blob = new Blob([translationToDownload.text], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${memo.name}_${translationToDownload.language || "translation"}.txt`
      a.click()
      URL.revokeObjectURL(url)
    } else if (format === "pdf") {
      generatePDF({
        title: `${memo.name} - Translation (${translationToDownload.language || "Unknown Language"})`,
        content: translationToDownload.text,
        filename: `${memo.name}_${translationToDownload.language || "translation"}.pdf`,
      })
    }
  }

  const downloadSummary = (format: DownloadFormat) => {
    const summaryToDownload = summaryMap[memo.id]?.text || memo.summary
    if (!summaryToDownload) return

    if (format === "txt") {
      const blob = new Blob([summaryToDownload], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${memo.name}_summary.txt`
      a.click()
      URL.revokeObjectURL(url)
    } else if (format === "pdf") {
      generatePDF({
        title: `${memo.name} - Summary`,
        content: summaryToDownload,
        filename: `${memo.name}_summary.pdf`,
      })
    }
  }

  const selectLanguage = (language: Language) => {
    setSelectedLanguage(language)
  }

  const handleSaveTranscript = (newTranscript: string) => {
    setEditedTranscript(newTranscript)
    updateMemo({
      ...memo,
      transcription: newTranscript,
    })
    setIsEditModalOpen(false)
  }

  const currentTranslation = translationMap[memo.id] || memo.translation
  const currentSummary = summaryMap[memo.id]?.text || memo.summary
  const translationLanguage = translationMap[memo.id]?.language || memo.translation?.language

  useEffect(() => {
    setSelectedLanguage(null)
  }, [memo.id])

  useEffect(() => {
    return () => {
      Object.values(downloadStates).forEach(state => {
        if (state.animationId) {
          cancelAnimationFrame(state.animationId)
        }
      })
    }
  }, [downloadStates])

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="bg-gradient-to-br from-red-100 to-blue-500 dark:from-gray-900 dark:to-gray-800 rounded-lg p-4 md:p-6 shadow-lg w-full max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{memo.name}</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">{formatDate(memo.date)}</span>
          </div>
          <div className="flex-1 max-h-[calc(100vh-15rem)] overflow-y-auto overflow-x-hidden hide-scrollbar">
            {memo.audioUrl && (
              <div className="mb-4 mt-2">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">Audio</h3>
                  <div className="flex items-center gap-2">
                    {downloadStates[`audio-${memo.id}`]?.isDownloading ? (
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-indigo-600 dark:text-indigo-400" />
                          <div className="flex flex-col items-start">
                            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Downloading...
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {Math.round(downloadStates[`audio-${memo.id}`].progress)}%
                            </div>
                          </div>
                        </div>
                        <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-indigo-600 dark:bg-indigo-500 h-2 rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${downloadStates[`audio-${memo.id}`].progress}%` }}
                          />
                        </div>
                        <Button
                          onClick={() => cancelDownload(`audio-${memo.id}`)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={downloadAudio}
                        variant="outline"
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors flex items-center gap-1"
                        aria-label="Download audio"
                      >
                        <Download className="h-4 w-4" />
                        <span className="text-sm">Download MP3</span>
                      </Button>
                    )}
                  </div>
                </div>
                <WaveformAudioPlayer
                  audioUrl={memo.audioUrl}
                  waveColor="#6366f1"
                  progressColor="#8b5cf6"
                  cursorColor="#7c3aed"
                  height={40}
                />
              </div>
            )}

            {editedTranscript && (
              <div className="mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Transcription
                  </h3>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setIsEditModalOpen(true)}
                      variant="outline"
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 flex items-center gap-1"
                    >
                      <Edit className="h-4 w-4" />
                      <span className="text-sm">Edit</span>
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 flex items-center gap-1"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="text-sm">Preview</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Transcription Preview</DialogTitle>
                        </DialogHeader>
                        <div className="bg-white p-6 rounded-lg shadow-md">
                          <div className="border border-gray-200 p-6 rounded-md">
                            <h4 className="text-lg font-semibold mb-4">{memo.name}</h4>
                            <div className="text-sm text-gray-700 whitespace-pre-wrap">
                              {editedTranscript}
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 flex items-center gap-1"
                        >
                          <Download className="h-4 w-4" />
                          <span className="text-sm">Download</span>
                          <ChevronDown className="h-4 w-4 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => downloadTranscription("txt")}>
                          <FileType className="h-4 w-4 mr-2" />
                          Text (.txt)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => downloadTranscription("pdf")}>
                          <FileText className="h-4 w-4 mr-2" />
                          PDF Document (.pdf)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="bg-blue-300 dark:bg-gray-900 rounded-md p-4 text-gray-800 dark:text-white whitespace-pre-wrap max-h-64 overflow-y-auto hide-scrollbar">
                  {editedTranscript}
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  <Select
                    onValueChange={(selectedCode) => {
                      const selectedLanguage = LANGUAGES.find((l) => l.code === selectedCode)
                      if (selectedLanguage) selectLanguage(selectedLanguage)
                    }}
                    value={selectedLanguage?.code || undefined}
                  >
                    <SelectTrigger className="bg-indigo-600 dark:bg-indigo-700 hover:bg-indigo-500 dark:hover:bg-indigo-600 text-white px-4 py-2 rounded-md flex items-center gap-2 w-full sm:w-auto">
                      <Globe className="h-4 w-4" />
                      <span>{selectedLanguage ? selectedLanguage.name : "Translate"}</span>
                    </SelectTrigger>
                    <SelectContent className="bg-blue-300 dark:bg-gray-700 text-gray-900 dark:text-white max-h-60 overflow-y-auto">
                      {LANGUAGES.map((language) => (
                        <SelectItem key={language.code} value={language.code}>
                          {language.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedLanguage && (
                    <Button
                      onClick={() => handleTranslate(selectedLanguage, editedTranscript || "")}
                      disabled={isTranslating || !editedTranscript}
                      className={`bg-purple-600 dark:bg-purple-700 hover:bg-purple-500 dark:hover:bg-purple-600 text-white px-4 py-2 rounded-md flex-1 sm:flex-none ${
                        isTranslating ? "opacity-70 cursor-not-allowed" : ""
                      }`}
                    >
                      {isTranslating ? "Translating..." : "Translate Now"}
                    </Button>
                  )}

                  <Button
                    onClick={() => handleSummarize(editedTranscript || "")}
                    disabled={isSummarizing}
                    className={`
                      bg-teal-600 dark:bg-teal-700 hover:bg-teal-500 dark:hover:bg-teal-600 text-white px-4 py-2 rounded-md flex items-center gap-2 flex-1 sm:flex-none
                      ${isSummarizing ? "opacity-70 cursor-not-allowed" : ""}
                    `}
                  >
                    <Tag className="h-4 w-4" />
                    {isSummarizing ? "Summarizing..." : "Summarize"}
                  </Button>
                </div>
              </div>
            )}

            {currentTranslation?.text && (
              <div className="mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Translation {translationLanguage && `(${translationLanguage})`}
                  </h3>
                  <div className="flex items-center gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 flex items-center gap-1"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="text-sm">Preview</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Translation Preview</DialogTitle>
                        </DialogHeader>
                        <div className="bg-white p-6 rounded-lg shadow-md">
                          <div className="border border-gray-200 p-6 rounded-md">
                            <h4 className="text-lg font-semibold mb-4">{memo.name} ({translationLanguage})</h4>
                            <div className="text-sm text-gray-700 whitespace-pre-wrap">
                              {currentTranslation.text}
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 flex items-center gap-1"
                        >
                          <Download className="h-4 w-4" />
                          <span className="text-sm">Download</span>
                          <ChevronDown className="h-4 w-4 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => downloadTranslation("txt")}>
                          <FileType className="h-4 w-4 mr-2" />
                          Text (.txt)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => downloadTranslation("pdf")}>
                          <FileText className="h-4 w-4 mr-2" />
                          PDF Document (.pdf)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="bg-blue-300 dark:bg-gray-900 rounded-md p-4 text-gray-800 dark:text-white whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {currentTranslation.text}
                </div>
              </div>
            )}

            {currentSummary && (
              <div className="mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    Summary
                  </h3>
                  <div className="flex items-center gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 flex items-center gap-1"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="text-sm">Preview</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Summary Preview</DialogTitle>
                        </DialogHeader>
                        <div className="bg-white p-6 rounded-lg shadow-md">
                          <div className="border border-gray-200 p-6 rounded-md">
                            <h4 className="text-lg font-semibold mb-4">{memo.name} - Summary</h4>
                            <div className="text-sm text-gray-700 whitespace-pre-wrap">
                              {currentSummary}
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 flex items-center gap-1"
                        >
                          <Download className="h-4 w-4" />
                          <span className="text-sm">Download</span>
                          <ChevronDown className="h-4 w-4 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => downloadSummary("txt")}>
                          <FileType className="h-4 w-4 mr-2" />
                          Text (.txt)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => downloadSummary("pdf")}>
                          <FileText className="h-4 w-4 mr-2" />
                          PDF Document (.pdf)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="bg-blue-300 dark:bg-gray-900 rounded-md p-4 text-gray-800 dark:text-white whitespace-pre-wrap">
                  {currentSummary}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <EditTranscriptModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        initialText={editedTranscript}
        onSave={handleSaveTranscript}
      />
    </div>
  )
}

export default MemoDetail