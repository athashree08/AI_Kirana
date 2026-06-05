import React, { useState, useRef, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";

type AssistantState = "idle" | "requesting" | "recording" | "processing";

export default function VoiceAssistant() {
  const { t } = useLanguage();
  const [status, setStatus] = useState<AssistantState>("idle");
  const [transcript, setTranscript] = useState("");
  const [intent, setIntent] = useState("");
  const [response, setResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [inputText, setInputText] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recordingTimeoutRef = useRef<any>(null);
  const permissionTimeoutRef = useRef<any>(null);

  // Refs for SpeechRecognition, cancellation, and race condition prevention
  const recognitionRef = useRef<any>(null);
  const localTranscriptRef = useRef<string>("");
  const isRecordingCancelledRef = useRef<boolean>(false);
  const activeRequestIdRef = useRef<number>(0);

  // Clean up streams, timeouts, & audio when component unmounts
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
      if (permissionTimeoutRef.current) {
        clearTimeout(permissionTimeoutRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speakTextLocally = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Attempt to load Indian Hindi or English voices
      const voices = window.speechSynthesis.getVoices();
      const hindiVoice = voices.find(v => v.lang.includes("hi-IN") || v.lang.toLowerCase().includes("hi"));
      if (hindiVoice) {
        utterance.voice = hindiVoice;
      } else {
        const indianEnglishVoice = voices.find(v => v.lang.includes("en-IN") || v.lang.toLowerCase().includes("in"));
        if (indianEnglishVoice) {
          utterance.voice = indianEnglishVoice;
        }
      }
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("Local SpeechSynthesis failed:", e);
    }
  };

  const startRecording = async () => {
    // Increment request ID to cancel any running requests
    const requestId = ++activeRequestIdRef.current;
    
    setError(null);
    audioChunksRef.current = [];
    setTranscript("");
    setIntent("");
    setResponse("");
    setAudioUrl("");
    localTranscriptRef.current = "";
    isRecordingCancelledRef.current = false;

    // 1. Secure context and MediaDevices check
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Audio recording is not supported in this browser context (requires a secure context like localhost or HTTPS). You can type a mock query below instead!");
      return;
    }

    // 2. MediaRecorder API check
    if (typeof MediaRecorder === "undefined") {
      setError("MediaRecorder API is not supported in your browser. You can type a mock query below instead!");
      return;
    }

    // Safety timeout: If mic permission prompt is ignored or blocked silently for 5 seconds
    if (permissionTimeoutRef.current) {
      clearTimeout(permissionTimeoutRef.current);
    }
    permissionTimeoutRef.current = setTimeout(() => {
      if (requestId === activeRequestIdRef.current && !streamRef.current) {
        setError("Microphone request timed out. Please check browser microphone permission settings or type your query below.");
        setStatus("idle");
      }
    }, 5000);

    try {
      setStatus("requesting");

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Clear permission timeout
      if (permissionTimeoutRef.current) {
        clearTimeout(permissionTimeoutRef.current);
        permissionTimeoutRef.current = null;
      }

      // Check if user cancelled while prompt was open
      if (isRecordingCancelledRef.current || requestId !== activeRequestIdRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      // Determine mimeType
      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/webm")) {
        mimeType = "audio/webm";
      } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
        mimeType = "audio/ogg";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      } else {
        mimeType = ""; // use browser default
      }

      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Wait a short moment for final speech recognition results to process
        setTimeout(async () => {
          if (requestId !== activeRequestIdRef.current) return;
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || "audio/webm" });
          await sendAudioToBackend(audioBlob, requestId);
        }, 250);
      };

      // Start local Web Speech API recognition in parallel for free mock speech-to-text
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = false; // Stop automatically when user pauses speaking
          recognition.interimResults = false;
          recognition.lang = 'hi-IN'; // listen to Hindi / Indian English
          
          recognition.onresult = (event: any) => {
            const results = event.results;
            let finalTranscript = "";
            for (let i = event.resultIndex; i < results.length; i++) {
              if (results[i].isFinal) {
                finalTranscript += results[i][0].transcript + " ";
              }
            }
            if (finalTranscript) {
              localTranscriptRef.current = (localTranscriptRef.current + " " + finalTranscript).trim();
              console.log("Local speech recognition transcript:", localTranscriptRef.current);
            }
          };

          recognition.onerror = (e: any) => {
            if (e.error !== 'aborted') {
              console.error("Local SpeechRecognition error:", e);
            }
          };

          recognitionRef.current = recognition;
          recognition.start();
        } catch (recognitionErr) {
          console.warn("Could not start local speech recognition:", recognitionErr);
        }
      }

      mediaRecorder.start();
      setStatus("recording");

      // Auto-stop recording after 15 seconds to prevent exceeding Sarvam 30-second API limit
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
      recordingTimeoutRef.current = setTimeout(() => {
        if (requestId === activeRequestIdRef.current) {
          stopRecording();
        }
      }, 15000);

    } catch (err: any) {
      if (permissionTimeoutRef.current) {
        clearTimeout(permissionTimeoutRef.current);
        permissionTimeoutRef.current = null;
      }
      console.error("Microphone access error:", err);
      if (requestId === activeRequestIdRef.current) {
        setError(
          err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
            ? "Microphone permission denied. Please allow microphone access in your browser address bar."
            : `Microphone error: ${err.message || "Could not start audio capture."}`
        );
        setStatus("idle");
      }
    }
  };

  const stopRecording = () => {
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }

    let isStopping = false;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
        isStopping = true;
      } catch (e) {
        console.error("Error stopping media recorder:", e);
      }
    }

    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => track.stop());
      } catch (e) {
        console.error("Error stopping stream tracks:", e);
      }
      streamRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        // Use abort() instead of stop() to immediately release the microphone resource
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }

    // Only transition to processing if the media recorder actually started stopping (triggering onstop).
    // Otherwise, immediately revert to idle.
    if (isStopping) {
      setStatus("processing");
    } else {
      setStatus("idle");
    }
  };

    // Force cancel recording or processing states
  const cancelRecordingAndProcessing = () => {
    isRecordingCancelledRef.current = true;
    ++activeRequestIdRef.current; // invalidate pending requests

    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    if (permissionTimeoutRef.current) {
      clearTimeout(permissionTimeoutRef.current);
      permissionTimeoutRef.current = null;
    }
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
      } catch (e) {}
      mediaRecorderRef.current = null;
    }
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => track.stop());
      } catch (e) {}
      streamRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setStatus("idle");
    setError("Action cancelled by user.");
  };

  const sendAudioToBackend = async (blob: Blob, requestId: number) => {
    setStatus("processing");
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", blob, "recording.webm");
      if (localTranscriptRef.current) {
        formData.append("local_transcript", localTranscriptRef.current);
      }

      const res = await fetch("/api/voice", {
        method: "POST",
        body: formData,
      });

      if (requestId !== activeRequestIdRef.current) return;

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Server failed to process voice query.");
      }

      const data = await res.json();
      setTranscript(data.transcript || localTranscriptRef.current);
      setIntent(data.intent);
      setResponse(data.response_text);
      setAudioUrl(data.audio_url);

      if (data.audio_url) {
        const isMockAudio = data.audio_url.includes("UklGRigAAABXQVZFZm10");
        if (isMockAudio) {
          speakTextLocally(data.response_text);
        } else {
          if (audioRef.current) {
            audioRef.current.pause();
          }
          const audio = new Audio(data.audio_url);
          audioRef.current = audio;
          audio.play().catch((playErr) => {
            console.error("Audio auto-play failed:", playErr);
          });
        }
      }
    } catch (err: any) {
      if (requestId !== activeRequestIdRef.current) return;
      console.error("Voice processing error:", err);
      setError(err.message || "Failed to communicate with Sarvam API.");
    } finally {
      if (requestId === activeRequestIdRef.current) {
        setStatus("idle");
      }
    }
  };

  // Text fallback to mock voice input
  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    await sendMockText(inputText.trim());
    setInputText("");
  };

  const sendMockText = async (text: string) => {
    const requestId = ++activeRequestIdRef.current;
    setStatus("processing");
    setError(null);
    setTranscript("");
    setIntent("");
    setResponse("");
    setAudioUrl("");

    try {
      const formData = new FormData();
      formData.append("mock_text", text);

      const res = await fetch("/api/voice", {
        method: "POST",
        body: formData,
      });

      if (requestId !== activeRequestIdRef.current) return;

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Server failed to process query.");
      }

      const data = await res.json();
      setTranscript(data.transcript);
      setIntent(data.intent);
      setResponse(data.response_text);
      setAudioUrl(data.audio_url);

      if (data.audio_url) {
        const isMockAudio = data.audio_url.includes("UklGRigAAABXQVZFZm10");
        if (isMockAudio) {
          speakTextLocally(data.response_text);
        } else {
          if (audioRef.current) {
            audioRef.current.pause();
          }
          const audio = new Audio(data.audio_url);
          audioRef.current = audio;
          audio.play().catch((playErr) => {
            console.error("Audio auto-play failed:", playErr);
          });
        }
      }
    } catch (err: any) {
      if (requestId !== activeRequestIdRef.current) return;
      console.error("Text query submission error:", err);
      setError(err.message || "Failed to communicate with the server.");
    } finally {
      if (requestId === activeRequestIdRef.current) {
        setStatus("idle");
      }
    }
  };

  const playAudio = () => {
    if (audioUrl) {
      const isMockAudio = audioUrl.includes("UklGRigAAABXQVZFZm10");
      if (isMockAudio) {
        speakTextLocally(response);
      } else {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        audio.play().catch((playErr) => console.error("Audio manual play failed:", playErr));
      }
    }
  };

  const handleMicClick = () => {
    if (status === "idle") {
      startRecording();
    } else if (status === "recording") {
      stopRecording();
    } else if (status === "requesting" || status === "processing") {
      cancelRecordingAndProcessing();
    }
  };

  const getIntentBadgeStyle = (intentKey: string) => {
    switch (intentKey.toLowerCase()) {
      case "summary":
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
      case "loan":
        return "bg-blue-500/10 border-blue-500/30 text-blue-400";
      case "gst":
        return "bg-purple-500/10 border-purple-500/30 text-purple-400";
      case "udhar":
        return "bg-amber-500/10 border-amber-500/30 text-amber-400";
      case "unknown":
        return "bg-rose-500/10 border-rose-500/30 text-rose-400";
      default:
        return "bg-slate-800 border-slate-700 text-slate-400";
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Mic Input Panel */}
      <div className="lg:col-span-1 bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800/80 p-8 shadow-xl flex flex-col items-center justify-between min-h-[460px]">
        <div className="w-full flex flex-col items-center">
          <h3 className="text-base font-bold text-slate-300 mb-6 tracking-wide text-center">{t("voice")}</h3>
          
          {/* Large Mic Button Container */}
          <div className="relative mb-5 flex items-center justify-center">
            {status === "recording" && (
              <div className="absolute w-28 h-28 rounded-full bg-rose-600/30 animate-ping"></div>
            )}
            
            <button
              onClick={handleMicClick}
              className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg cursor-pointer ${
                status === "recording"
                  ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/35 border-2 border-rose-400/50"
                  : status === "processing" || status === "requesting"
                  ? "bg-slate-800 border border-slate-700 text-slate-500 shadow-none hover:bg-slate-750 hover:text-slate-400"
                  : "bg-slate-900 hover:bg-slate-800 text-blue-400 border border-slate-850 hover:border-blue-500/40 hover:text-blue-300 shadow-blue-500/10"
              }`}
            >
              {status === "processing" || status === "requesting" ? (
                <svg className="w-10 h-10 animate-spin text-slate-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                </svg>
              )}
            </button>
          </div>

          {/* State Indicators */}
          <div className="text-center">
            <span className={`text-sm font-bold uppercase tracking-wider ${
              status === "recording" ? "text-rose-400 animate-pulse" : status === "requesting" ? "text-blue-400 animate-pulse" : status === "processing" ? "text-slate-400" : "text-blue-400"
            }`}>
              {status === "recording" ? "Recording Speech..." : status === "requesting" ? "Requesting Mic..." : status === "processing" ? "Processing..." : "Tap to Speak"}
            </span>
            <p className="text-xs text-slate-400 mt-2 font-medium max-w-[220px] mx-auto">
              {status === "recording" ? "Speak Hindi or Hinglish query and click again to submit." : status === "requesting" ? "Please accept browser microphone permission prompt (or click button to cancel)." : status === "processing" ? "Sending audio file to Sarvam AI engine (or click button to cancel)." : "Click to record your voice or type below if you are testing offline/without microphone."}
            </p>
          </div>
        </div>

        {/* Fallback Input Box */}
        <div className="w-full mt-6 border-t border-slate-800/80 pt-6">
          <form onSubmit={handleTextSubmit} className="space-y-3">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Alternative: Type Your Query
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="e.g. Aaj ka hisaab..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-100 transition-colors"
              />
              <button
                type="submit"
                disabled={status === "processing" || status === "requesting" || !inputText.trim()}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-2 rounded-xl text-xs transition-colors disabled:opacity-30 cursor-pointer"
              >
                Send
              </button>
            </div>
            
            {/* Quick Suggestions */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => sendMockText("aaj ka hisaab kya hai")}
                className="text-[10px] bg-slate-850 hover:bg-slate-800 border border-slate-800 rounded px-2 py-1 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Hisaab
              </button>
              <button
                type="button"
                onClick={() => sendMockText("loan eligibility")}
                className="text-[10px] bg-slate-850 hover:bg-slate-800 border border-slate-800 rounded px-2 py-1 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Loan
              </button>
              <button
                type="button"
                onClick={() => sendMockText("gst threshold")}
                className="text-[10px] bg-slate-850 hover:bg-slate-800 border border-slate-800 rounded px-2 py-1 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                GST
              </button>
              <button
                type="button"
                onClick={() => sendMockText("mohan ka pending udhar")}
                className="text-[10px] bg-slate-850 hover:bg-slate-800 border border-slate-800 rounded px-2 py-1 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Udhar
              </button>
            </div>
          </form>
        </div>

        {/* Graceful Error Display */}
        {error && (
          <div className="mt-5 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs font-semibold text-rose-400 w-full text-center">
            {error}
          </div>
        )}
      </div>

      {/* Output Panel */}
      <div className="lg:col-span-2 bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800/80 p-8 shadow-xl flex flex-col justify-between min-h-[460px]">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-200 mb-6">{t("cfo")}</h2>
          
          <div className="space-y-6">
            {/* 1. Transcript Section */}
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">1. Hindi Transcript</span>
              <div className="bg-slate-950/70 border border-slate-850 rounded-xl p-4 min-h-[56px] flex items-center">
                {transcript ? (
                  <p className="text-slate-200 text-sm font-semibold italic">"{transcript}"</p>
                ) : (
                  <p className="text-slate-500 text-xs italic font-medium">Say something in Hindi like "Aaj ka business kitna hua?" or use the quick links.</p>
                )}
              </div>
            </div>

            {/* 2. Intent Section */}
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">2. Detected Intent</span>
              <div className="flex items-center min-h-[36px]">
                {intent ? (
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold uppercase border tracking-wider ${getIntentBadgeStyle(intent)}`}>
                    {intent}
                  </span>
                ) : (
                  <span className="text-slate-500 text-xs italic font-medium">Waiting for query...</span>
                )}
              </div>
            </div>

            {/* 3. Response Section */}
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">3. Voice CFO Response</span>
              <div className="bg-slate-950/70 border border-slate-855 rounded-xl p-4 min-h-[76px] flex flex-col justify-between">
                {response ? (
                  <>
                    <p className="text-slate-100 text-sm font-medium leading-relaxed">"{response}"</p>
                    {audioUrl && (
                      <button
                        onClick={playAudio}
                        className="mt-3 self-start flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-bold cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
                        </svg>
                        Replay Audio
                      </button>
                    )}
                  </>
                ) : (
                  <p className="text-slate-500 text-xs italic font-medium">Assistant response will appear here.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div className="text-xs text-slate-500 font-medium border-t border-slate-800/80 pt-4 mt-6">
          Sarvam AI Speech-to-Text and Text-to-Speech enables multilingual real-time CFO intelligence.
        </div>
      </div>
    </div>
  );
}
