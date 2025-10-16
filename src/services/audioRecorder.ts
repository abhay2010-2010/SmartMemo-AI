

export function createAudioRecorder() {

    let mediaRecorder: MediaRecorder | null = null;
    let audioChunks: Blob[] = []
    let stream: MediaStream | null = null;


    async function startRecording(): Promise<void> {
        try {
            audioChunks = []
            stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            mediaRecorder = new MediaRecorder(stream)

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            }
            mediaRecorder.start(1000)

        } catch (error) {
            console.error('Error starting recording:', error);
            throw error;
        }
    }
    async function stopRecording():Promise<Blob>{
        return new Promise((resolve,reject)=>{
            if(!mediaRecorder){
                reject(new Error('media recorder not Started'))
                return
            }
            mediaRecorder.onstop=()=>{
                const audioBlob = new Blob(audioChunks,{type : 'audio/webm'})
                releaseMediaStream();
                resolve(audioBlob)
            }

            mediaRecorder.stop()
        })
    }

    function releaseMediaStream():void{
        if(stream){
            stream.getTracks().forEach((track)=>track.stop())
            stream=null
        }
    } 
    function isRecording():boolean{
        return mediaRecorder !== null && mediaRecorder.state === 'recording'
    }

    return{
        startRecording,
        stopRecording,
        isRecording
    }



}
export const audioRecorder = createAudioRecorder()