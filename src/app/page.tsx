'use client';

import React, { useEffect, useState } from 'react';
import Header from './ui_component/Header';
import RecordingPanel from './ui_component/Recordingcard';
import TranscriptionPanel from './ui_component/TranscriptionArea';
import MemoList from './ui_component/MemoList';
import MemoDetail from './ui_component/Memodetails';
import Footer from './ui_component/Footer';
import { Button } from '@/components/ui/button';
import { useMemos } from '../hooks/useMemo';
import { Language, VoiceMemo } from '../types';

function Page() {
  const [step, setStep] = useState<'recording' | 'transcription' | 'view'>('recording');
  const [transcription, setTranscription] = useState<string>('');
  const [currentRecording, setCurrentRecording] = useState<VoiceMemo | null>(null);
  const [recordingTime, setRecordingTime] = useState<string>('00:00');
  const [isNew,setNew]=useState<boolean>(false)
  const {
    memos,
    currentMemo,
    saveMemo,
    updateMemo,
    deleteMemo,
    selectMemo,
    updateMemoName,
  } = useMemos();

  useEffect (()=>{

    if(step === 'recording'){
      setNew(false)
    }
    
    else if(step === 'transcription'){
      setNew(true)
    }
    
    else if(step==='view'){
      setNew(true)
    }
  },[step])

  const handleRecordingComplete = async (blob: Blob, text: string, time: string) => {
    setStep('transcription');
    setTranscription(text);
    setRecordingTime(time);
    const newMemo = await saveMemo(blob, text, time);
    setCurrentRecording(newMemo);
    
  };

  const handleUpdateTranslation = (language: Language, translation: string) => {
    if (currentRecording) {
      const updatedMemo = {
        ...currentRecording,
        translation: {
          language: language.code,
          text: translation,
        },
      };
      updateMemo(updatedMemo);
      setCurrentRecording(updatedMemo);
    }
  };

  const handleUpdateSummary = (summary: string) => {
    if (currentRecording) {
      const updatedMemo = {
        ...currentRecording,
        summary,
      };
      updateMemo(updatedMemo);
      setCurrentRecording(updatedMemo);
    }
  };

  const handleMemoSelect = async (id: string) => {
    await selectMemo(id);
    setStep('view');
  };

  const handleNewRecording = () => {
    setTranscription('');
    setCurrentRecording(null);
    setRecordingTime('00:00');
    setStep('recording');
  };

  const handleCancelRecording = () => {
    setTranscription('');
    setCurrentRecording(null);
    setRecordingTime('00:00');
    setStep('recording');
  };

  return (
     <div className="h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-purple-900 text-gray-200 flex flex-col overflow-hidden">
      <Header onNewRecording={handleNewRecording} isNew={isNew} />

      <main className="flex-1 p-4 w-full mx-auto">
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 mb-6 w-full">
          {/* Memo List - Full width on mobile, constrained on desktop */}
          <div className="w-full md:w-1/3 md:min-w-[300px] md:max-w-[400px]">
            <MemoList
              memos={memos}
              onSelect={handleMemoSelect}
              onDelete={deleteMemo}
              onRename={updateMemoName}
              selectedMemoId={currentMemo?.id || null}
            />
          </div>

          {/* Main Content Area */}
          <div className="w-full md:w-2/3 space-y-4 overflow-x-hidden">
            {step === 'recording' && (
              <RecordingPanel onRecordingComplete={handleRecordingComplete} />
            )}

            {step === 'transcription' && transcription && (
              <div className="space-y-4 w-full">
                <TranscriptionPanel
                  transcription={transcription}
                  onUpdateTranslation={handleUpdateTranslation}
                  onUpdateSummary={handleUpdateSummary}
                  audioUrl={currentRecording?.audioUrl}
                  recordingTime={recordingTime}
                />
                <div className="flex justify-end">
                  <Button
                    variant="destructive"
                    onClick={handleCancelRecording}
                    className="mt-2"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {step === 'view' && currentMemo && <MemoDetail memo={currentMemo} />}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}


export default Page;