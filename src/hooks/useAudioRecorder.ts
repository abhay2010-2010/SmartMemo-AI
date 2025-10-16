import { audioRecorder } from "@/services/audioRecorder";

import { useCallback, useEffect, useState } from "react"


export const useAudioRecorder = () => {

    const [isRecording, setIsReocrding] = useState(false);
    const [recordingTime, setReocrdingTime] = useState(0)
    const [timerInterval, setTimerInterval] = useState<number | null>(null)


    useEffect(() => {
        return () => {
            if (timerInterval) {
                clearInterval(timerInterval)
            }
        };
    }, [timerInterval])

    const startRecording = useCallback(async () => {
        try {
            await audioRecorder.startRecording()
            setIsReocrding(true)

            const interval = window.setInterval(() => {
                setReocrdingTime(prev => prev + 1)
            }, 1000)

            setTimerInterval(interval)


        } catch (error) {
            console.error('Failed to start recording :', error)
        }
    }, [])

    const stopRecording = useCallback(async () => {
        try {
            if (timerInterval) {
                clearInterval(timerInterval);
                setTimerInterval(null)
            }
            setIsReocrding(false);
            const audioBlob = await audioRecorder.stopRecording()
            setTimerInterval(0)
            return audioBlob;

        } catch (error) {
            console.log('Failed to stop recording :', error)
            throw error

        }
    }, [timerInterval])

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    };
    const reset = () => {
        setReocrdingTime(0);
        
    };

    return {
        isRecording,
        recordingTime,
        formattedTime: formatTime(recordingTime),
        startRecording,
        stopRecording,
        reset

    }

}