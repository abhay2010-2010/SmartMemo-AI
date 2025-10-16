"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import type { VoiceMemo } from "../../types"
import { Trash2, PlayCircle, Calendar, List, X, Clock, Search, PauseCircle, Pencil } from "lucide-react"
import { useScreen } from "../../hooks/useScreen"
import { WaveformAudioPlayer } from "../animated_ui/WaveformAudioPlayer"

// Add these keyframe animations
const animationStyles = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideUp {
    from { transform: translateY(50px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  
  @keyframes slideIn {
    from { transform: translateX(20px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }
`

interface MemoListProps {
  memos: VoiceMemo[]
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onRename: (id: string, newName: string) => void
  selectedMemoId: string | null
}

const MemoList: React.FC<MemoListProps> = ({ memos, onSelect, onDelete, onRename, selectedMemoId }) => {
  const [isMobileListOpen, setIsMobileListOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null)
  const [editInputValue, setEditInputValue] = useState("")
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null)

  // Store refs to WaveformAudioPlayer instances
  const waveformRefs = useRef<Record<string, { stop: () => void }>>({})

  const { isIPadAir, isIPadMini, isZenBook } = useScreen()

  const getWidthClass = () => {
    if (isIPadAir) return "w-65"
    if (isIPadMini) return "w-60"
    if (isZenBook) return "w-70"
    return "w-full"
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  // Handle play/pause for a specific memo
  const handlePlayPause = (memoId: string) => {
    // If this memo is currently playing, pause it
    if (currentlyPlayingId === memoId) {
      setCurrentlyPlayingId(null)
      return
    }

    // Stop any currently playing audio
    if (currentlyPlayingId && waveformRefs.current[currentlyPlayingId]) {
      waveformRefs.current[currentlyPlayingId].stop()
    }

    // Start playing the new memo
    setCurrentlyPlayingId(memoId)
  }

  // Handle when audio ends or stops
  const handleAudioStop = (memoId: string) => {
    if (currentlyPlayingId === memoId) {
      setCurrentlyPlayingId(null)
    }
  }

  // Register waveform player ref
  const registerWaveformRef = (memoId: string, ref: { stop: () => void }) => {
    waveformRefs.current[memoId] = ref
  }

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      // Stop all audio when component unmounts
      Object.values(waveformRefs.current).forEach((ref) => {
        if (ref && ref.stop) {
          ref.stop()
        }
      })
    }
  }, [])

  // Effect to handle when memos change (e.g., when a memo is deleted)
  useEffect(() => {
    if (currentlyPlayingId && !memos.find((memo) => memo.id === currentlyPlayingId)) {
      setCurrentlyPlayingId(null)
    }
  }, [memos, currentlyPlayingId])

  const filteredMemos = memos.filter((memo) => {
    const query = searchQuery.toLowerCase()
    return (
      memo.name.toLowerCase().includes(query) ||
      (memo.transcription && memo.transcription.toLowerCase().includes(query)) ||
      memo.date.toLowerCase().includes(query)
    )
  })

  if (memos.length === 0) {
    return (
      <div
        className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm text-center border border-gray-200 dark:border-gray-700 w-full"
        style={{ animation: "fadeIn 0.5s ease-out" }}
      >
        <div className="max-w-xs mx-auto">
          <div
            className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center"
            style={{ animation: "pulse 2s infinite" }}
          >
            <PlayCircle className="h-8 w-8 text-indigo-600 dark:text-indigo-300" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No memos yet</h3>
          <p className="text-gray-500 dark:text-gray-400">Start recording to create your first voice memo</p>
        </div>
      </div>
    )
  }

  const renderMemoItem = (memo: VoiceMemo) => (
    <div
      key={memo.id}
      className={`
        p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer 
        transition-all duration-300 ease-in-out
        ${
          selectedMemoId === memo.id
            ? "bg-indigo-50 dark:bg-indigo-900/30 border-l-4 border-l-indigo-500 transform translate-x-1"
            : "hover:bg-gray-50 dark:hover:bg-gray-700/50 border-l-4 border-l-transparent"
        }
      `}
      onClick={() => {
        onSelect(memo.id)
        setIsMobileListOpen(false)
      }}
    >
      <div className="flex justify-between items-start gap-3 w-full">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {editingMemoId === memo.id ? (
              <input
                type="text"
                className="text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-gray-900 dark:text-white w-full transition-all duration-200 focus:ring-2 focus:ring-indigo-500"
                value={editInputValue}
                onChange={(e) => setEditInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onRename(memo.id, editInputValue)
                    setEditingMemoId(null)
                  }
                  if (e.key === "Escape") {
                    setEditingMemoId(null)
                  }
                }}
                autoFocus
              />
            ) : (
              <h3
                className="font-medium text-gray-900 dark:text-white truncate transition-all duration-200"
                onDoubleClick={() => {
                  setEditingMemoId(memo.id)
                  setEditInputValue(memo.name)
                }}
              >
                {memo.name}
              </h3>
            )}

            {memo.duration && (
              <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                <Clock className="h-3 w-3" />
                {memo.duration}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(memo.date)}</span>
          </div>

          {memo.audioUrl && (
            <div className="mt-3">
              <WaveformAudioPlayer
                audioUrl={memo.audioUrl}
                waveColor="#6366f1"
                progressColor="#8b5cf6"
                cursorColor="#7c3aed"
                height={40}
                isPlaying={currentlyPlayingId === memo.id}
                onPlayPause={() => handlePlayPause(memo.id)}
                onStop={() => handleAudioStop(memo.id)}
                onRegisterRef={(ref) => registerWaveformRef(memo.id, ref)}
              />
            </div>
          )}
        </div>

        <div className="flex gap-1.5 flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handlePlayPause(memo.id)
            }}
            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors duration-200 p-1 hover:scale-110"
            aria-label={currentlyPlayingId === memo.id ? "Pause memo" : "Play memo"}
          >
            {currentlyPlayingId === memo.id ? <PauseCircle className="h-5 w-5" /> : <PlayCircle className="h-5 w-5" />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              // Stop audio if this memo is currently playing
              if (currentlyPlayingId === memo.id) {
                if (waveformRefs.current[memo.id]) {
                  waveformRefs.current[memo.id].stop()
                }
                setCurrentlyPlayingId(null)
              }
              onDelete(memo.id)
            }}
            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors duration-200 p-1 hover:scale-110"
            aria-label="Delete memo"
          >
            <Trash2 className="h-5 w-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setEditingMemoId(memo.id)
              setEditInputValue(memo.name)
            }}
            className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-300 transition-colors duration-200 p-1 hover:scale-110"
            aria-label="Edit memo name"
          >
            <Pencil className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )

  const memoListContent = (
    <div
      className={`bg-gradient-to-br from-red-200 to-blue-500 dark:from-gray-900 dark:to-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 min-h-[20rem] max-h-[calc(100vh-10rem)] overflow-hidden ${getWidthClass()} flex flex-col`}
    >
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <List className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          Your Memos
          <span className="ml-auto text-sm font-normal bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full">
            {filteredMemos.length}
          </span>
        </h2>
      </div>

      <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            placeholder="Search Memos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
        {filteredMemos.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">No memos found matching your search</div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredMemos.map((memo, index) => (
              <div
                key={memo.id}
                style={{
                  animation: `slideIn 0.3s ease-out ${index * 0.05}s both`,
                }}
              >
                {renderMemoItem(memo)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      <style jsx global>
        {animationStyles}
      </style>
      <div className="hidden md:block h-full">{memoListContent}</div>

      <div className="md:hidden fixed top-20 right-6 z-50">
        <button
          onClick={() => setIsMobileListOpen(!isMobileListOpen)}
          className={`
            bg-indigo-600 text-white p-4 rounded-full shadow-lg 
            transition-all duration-300 ease-in-out
            hover:bg-indigo-700 active:scale-95
            ${isMobileListOpen ? "rotate-180" : ""}
          `}
          aria-label={isMobileListOpen ? "Close memos list" : "Open memos list"}
        >
          {isMobileListOpen ? <X className="h-6 w-6" /> : <List className="h-6 w-6" />}
        </button>
      </div>

      {isMobileListOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsMobileListOpen(false)}
          style={{
            animation: "fadeIn 0.2s ease-out forwards",
          }}
        >
          <div
            className="w-[95vw] max-w-md max-h-[70vh] bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
            style={{
              animation: "slideUp 0.3s ease-out forwards",
            }}
          >
            <div className="p-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your Memos</h2>
              <button
                onClick={() => setIsMobileListOpen(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1"
                aria-label="Close memos list"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lgbg-blue-300 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  placeholder="Search Memos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              {filteredMemos.length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  No memos found matching your search
                </div>
              ) : (
                filteredMemos.map(renderMemoItem)
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default MemoList