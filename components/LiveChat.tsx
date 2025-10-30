import React, { useState, useEffect, useRef } from 'react';
// Fix: Remove `LiveSession` from import as it is not an exported member.
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { MicrophoneIcon } from './icons/MicrophoneIcon';
import { StopIcon } from './icons/StopIcon';

// Fix: Initialize GoogleGenAI client at the module level to allow inferring the LiveSession type.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
// Fix: Infer the LiveSession type from the `ai.live.connect` method return type for type safety.
type LiveSession = Awaited<ReturnType<typeof ai.live.connect>>;

// Audio helper functions as per guidelines
// decode base64
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// encode to base64
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// create Blob for API
function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

// decode raw PCM audio data
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


type ConnectionStatus = 'IDLE' | 'CONNECTING' | 'CONNECTED' | 'ERROR' | 'CLOSED';

interface TranscriptionEntry {
    speaker: 'user' | 'ai';
    text: string;
}

export const LiveChat: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [status, setStatus] = useState<ConnectionStatus>('IDLE');
    const [transcription, setTranscription] = useState<TranscriptionEntry[]>([]);
    
    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const nextStartTimeRef = useRef<number>(0);
    
    const currentInputTranscriptionRef = useRef('');
    const currentOutputTranscriptionRef = useRef('');

    const startSession = async () => {
        setStatus('CONNECTING');
        setTranscription([]);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            
            // FIX: Cast window to any to support webkitAudioContext for older browsers
            inputAudioContextRef.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            // FIX: Cast window to any to support webkitAudioContext for older browsers
            outputAudioContextRef.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        setStatus('CONNECTED');
                        const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
                        const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;

                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromiseRef.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContextRef.current!.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        // Handle transcription
                        if (message.serverContent?.outputTranscription) {
                            currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
                            setTranscription(prev => {
                                const last = prev[prev.length -1];
                                if (last?.speaker === 'ai') {
                                    return [...prev.slice(0, -1), {speaker: 'ai', text: currentOutputTranscriptionRef.current }];
                                }
                                return [...prev, {speaker: 'ai', text: currentOutputTranscriptionRef.current }];
                            });
                        } else if (message.serverContent?.inputTranscription) {
                            currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
                             setTranscription(prev => {
                                const last = prev[prev.length -1];
                                if (last?.speaker === 'user') {
                                    return [...prev.slice(0, -1), {speaker: 'user', text: currentInputTranscriptionRef.current }];
                                }
                                return [...prev, {speaker: 'user', text: currentInputTranscriptionRef.current }];
                            });
                        }

                        if (message.serverContent?.turnComplete) {
                            currentInputTranscriptionRef.current = '';
                            currentOutputTranscriptionRef.current = '';
                        }
                        
                        // Handle audio playback
                        const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                        if (base64EncodedAudioString && outputAudioContextRef.current) {
                            nextStartTimeRef.current = Math.max(
                                nextStartTimeRef.current,
                                outputAudioContextRef.current.currentTime,
                            );
                            const audioBuffer = await decodeAudioData(
                                decode(base64EncodedAudioString),
                                outputAudioContextRef.current,
                                24000,
                                1,
                            );
                            const source = outputAudioContextRef.current.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputAudioContextRef.current.destination);
                            source.addEventListener('ended', () => {
                                sourcesRef.current.delete(source);
                            });

                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            sourcesRef.current.add(source);
                        }

                        if (message.serverContent?.interrupted) {
                            for (const source of sourcesRef.current.values()) {
                                source.stop();
                                sourcesRef.current.delete(source);
                            }
                            nextStartTimeRef.current = 0;
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Live session error:', e);
                        setStatus('ERROR');
                        stopSession();
                    },
                    onclose: (e: CloseEvent) => {
                        setStatus('CLOSED');
                        stopSession();
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    outputAudioTranscription: {},
                    inputAudioTranscription: {},
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
                    },
                    systemInstruction: 'أنت Doora AI، مساعد ذكاء اصطناعي خبير في التسويق الرقمي. كن صديقًا ومتعاونًا. تحدث باللغة العربية.',
                },
            });

        } catch (error) {
            console.error('Failed to start session:', error);
            setStatus('ERROR');
        }
    };

    const stopSession = () => {
        sessionPromiseRef.current?.then((session) => session.close());
        sessionPromiseRef.current = null;

        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => track.stop());
            mediaStreamRef.current = null;
        }
        if (inputAudioContextRef.current) {
            inputAudioContextRef.current.close();
            inputAudioContextRef.current = null;
        }
        if (outputAudioContextRef.current) {
            outputAudioContextRef.current.close();
            outputAudioContextRef.current = null;
        }
        sourcesRef.current.forEach(source => source.stop());
        sourcesRef.current.clear();
        nextStartTimeRef.current = 0;
        
        if(status !== 'CLOSED' && status !== 'ERROR'){
            setStatus('IDLE');
        }
    };

    useEffect(() => {
        return () => { // Cleanup on unmount
            stopSession();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    
    const transcriptionContainerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (transcriptionContainerRef.current) {
            transcriptionContainerRef.current.scrollTop = transcriptionContainerRef.current.scrollHeight;
        }
    }, [transcription]);

    const getStatusText = () => {
        switch (status) {
            case 'IDLE': return 'اضغط لبدء المحادثة الصوتية';
            case 'CONNECTING': return '...جاري الاتصال';
            case 'CONNECTED': return '...أنا أستمع';
            case 'ERROR': return 'حدث خطأ. حاول مرة أخرى';
            case 'CLOSED': return 'انتهت المحادثة. اضغط للبدء من جديد';
            default: return '';
        }
    };

    const isSessionActive = status === 'CONNECTING' || status === 'CONNECTED';

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-2xl flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="relative bg-black/50 backdrop-blur-3xl rounded-2xl w-full max-w-lg h-[90vh] max-h-[700px] shadow-2xl shadow-black/50 flex flex-col p-6 border border-white/20" onClick={(e) => e.stopPropagation()}>
                <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent opacity-80 pointer-events-none rounded-t-2xl"></div>
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h2 className="text-xl font-bold text-orange-400">محادثة صوتية مباشرة</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl font-light">&times;</button>
                </div>
                
                <div ref={transcriptionContainerRef} className="flex-1 overflow-y-auto bg-black/40 border border-white/5 shadow-inner rounded-lg p-4 space-y-4 mb-4">
                    {transcription.length === 0 && (
                        <div className="flex items-center justify-center h-full text-gray-400">
                           <p>{getStatusText()}</p>
                        </div>
                    )}
                    {transcription.map((entry, index) => (
                        <div key={index} className={`flex ${entry.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <p className={`max-w-[80%] p-3 rounded-lg shadow-md ${entry.speaker === 'user' ? 'bg-gradient-to-br from-orange-500 to-orange-700 text-white' : 'bg-black/30 backdrop-blur-lg border border-white/10 text-gray-200'}`}>
                                {entry.text}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col items-center flex-shrink-0">
                    <button 
                        onClick={isSessionActive ? stopSession : startSession}
                        className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-black/50 ${
                            isSessionActive 
                                ? 'bg-gradient-to-br from-red-500 to-red-700 hover:brightness-125 ring-red-400/70 shadow-lg shadow-red-900/60' 
                                : 'bg-gradient-to-br from-orange-500 to-orange-600 hover:brightness-125 ring-orange-400/80 shadow-lg shadow-orange-950/60'
                        }`}
                    >
                        {isSessionActive ? <StopIcon className="w-8 h-8 text-white"/> : <MicrophoneIcon className="w-8 h-8 text-white" />}
                    </button>
                    <p className="mt-4 text-gray-400 h-5">{getStatusText()}</p>
                </div>
            </div>
        </div>
    );
};