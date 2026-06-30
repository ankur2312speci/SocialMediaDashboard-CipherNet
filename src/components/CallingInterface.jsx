import { useEffect, useState } from "react";
import { useCallStore } from "../store/useCallStore";
import { useWebRTC } from "../hooks/useWebRTC";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Minimize2, Maximize2, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function CallingInterface() {
  const { 
    callState, 
    callType, 
    peerUser, 
    callDuration, 
    isMuted, 
    isCameraOff, 
    localStream, 
    remoteStream, 
    toggleMute, 
    toggleCamera,
    callError
  } = useCallStore();

  const { acceptCall, declineCall, hangupCall } = useWebRTC();
  const [isMinimized, setIsMinimized] = useState(false);

  // Format timer
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainder.toString().padStart(2, "0")}`;
  };

  // Play dialing / ringing sound simulation
  useEffect(() => {
    if (callState === "ringing-incoming" || callState === "ringing-outgoing") {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = "sine";
      // Ring tone tone modulation
      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      
      // Stop oscillator after ringing stops or moves to active
      return () => {
        try {
          osc.stop();
        } catch (e) {}
        audioCtx.close();
      };
    }
  }, [callState]);

  if (callState === "idle") return null;

  // Render video feeds if video call and active
  const renderVideoFeeds = () => {
    if (callType !== "video" || callState !== "active") return null;

    return (
      <div className="w-full flex-1 grid grid-cols-2 gap-4 relative min-h-[220px] bg-slate-950 rounded-xl overflow-hidden p-2">
        {/* Local Stream (Pip/Thumb) */}
        <div className="relative border border-slate-800 rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center">
          {isCameraOff ? (
            <div className="text-slate-500 text-xs">Camera Off</div>
          ) : (
            <video
              ref={(ref) => {
                if (ref && localStream) ref.srcObject = localStream;
              }}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform scale-x-[-1]"
            />
          )}
          <span className="absolute bottom-2 left-2 text-[10px] bg-black/60 px-2 py-0.5 rounded text-white">You</span>
        </div>

        {/* Remote Stream */}
        <div className="relative border border-slate-800 rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center">
          {remoteStream ? (
            <video
              ref={(ref) => {
                if (ref && remoteStream) ref.srcObject = remoteStream;
              }}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-800 animate-spin border-2 border-cyan-400 border-t-transparent" />
              <span className="text-[10px] text-slate-500">Connecting peer feed...</span>
            </div>
          )}
          <span className="absolute bottom-2 left-2 text-[10px] bg-black/60 px-2 py-0.5 rounded text-white">@{peerUser?.username}</span>
        </div>
      </div>
    );
  };

  // Minimized call widget layout
  if (isMinimized) {
    return (
      <motion.div
        drag
        dragMomentum={false}
        className="fixed bottom-6 right-6 z-[100] w-64 bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl p-4 flex items-center justify-between cursor-move backdrop-blur-md"
      >
        <div className="flex items-center gap-3">
          <img src={peerUser?.avatar} alt={peerUser?.username} className="w-10 h-10 rounded-full border border-slate-700 object-cover" />
          <div>
            <div className="text-xs font-bold text-slate-200">@{peerUser?.username}</div>
            <div className="text-[10px] text-cyan-400 font-semibold">{callState === "active" ? formatTime(callDuration) : "Ringing..."}</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsMinimized(false)}
            className="p-1.5 bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => hangupCall(callDuration)}
            className="p-1.5 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white rounded-lg transition-colors"
          >
            <PhoneOff className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    );
  }

  // Full Screen dialog calling screen
  return (
    <div className="fixed inset-0 z-[99] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-lg bg-slate-900 border border-slate-800 shadow-2xl rounded-3xl p-8 flex flex-col items-center gap-6 relative overflow-hidden"
      >
        {/* Glow background */}
        <div className="absolute top-[-30%] left-[-30%] w-[80%] h-[80%] rounded-full bg-cyan-500/5 blur-[100px] pointer-events-none" />

        {/* Minimized button */}
        <button
          onClick={() => setIsMinimized(true)}
          className="absolute top-4 right-4 p-2 bg-slate-800/60 hover:bg-slate-750 text-slate-400 hover:text-white rounded-xl transition-colors"
        >
          <Minimize2 className="w-4 h-4" />
        </button>

        {/* Cryptography status badge */}
        <div className="flex items-center gap-1 px-2.5 py-1 bg-cyan-950/20 border border-cyan-900/40 rounded-full text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
          <ShieldAlert className="w-3 h-3 text-cyan-400" />
          P2P Secure WebRTC
        </div>

        {/* User Info details */}
        {callState !== "active" || callType !== "video" ? (
          <div className="flex flex-col items-center gap-4 text-center mt-4">
            <div className="relative">
              <img
                src={peerUser?.avatar}
                alt={peerUser?.username}
                className={`w-28 h-28 rounded-full border-2 border-slate-750 object-cover ${
                  callState === "ringing-incoming" || callState === "ringing-outgoing" ? "animate-pulse shadow-[0_0_20px_rgba(34,211,238,0.2)]" : ""
                }`}
              />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">@{peerUser?.username}</h3>
              <p className="text-sm text-slate-400 mt-1">{peerUser?.name}</p>
            </div>
          </div>
        ) : null}

        {/* Call Timer / Dial Status */}
        <div className="text-center font-mono">
          {callError ? (
            <div className="space-y-1">
              <span className="text-base font-bold text-red-500 uppercase tracking-wider animate-pulse flex items-center justify-center gap-1.5">
                <ShieldAlert className="w-5 h-5 text-red-500" />
                {callError === "declined" ? "Call Declined" : callError === "busy" ? "User Busy" : callError === "offline" || callError === "User is offline" ? "User Offline" : `Call Failed: ${callError}`}
              </span>
              <p className="text-[10px] text-slate-400">Disconnecting secure session...</p>
            </div>
          ) : (
            <>
              {callState === "ringing-outgoing" && <span className="text-sm text-cyan-400 tracking-widest uppercase animate-pulse">Dialing...</span>}
              {callState === "ringing-incoming" && <span className="text-sm text-purple-400 tracking-widest uppercase animate-pulse">Incoming Call...</span>}
              {callState === "active" && (
                <div className="space-y-1">
                  <span className="text-2xl font-bold text-white">{formatTime(callDuration)}</span>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">Call Connected</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Video Feeds (if video) */}
        {renderVideoFeeds()}

        {/* Calling Controls */}
        <div className="flex items-center gap-4 mt-4">
          {/* Mute toggle (only while active) */}
          {callState === "active" && (
            <button
              onClick={toggleMute}
              className={`p-4 rounded-full border transition-all ${
                isMuted 
                  ? "bg-red-500 border-red-500 text-white" 
                  : "bg-slate-800 border-slate-700 text-slate-350 hover:bg-slate-750"
              }`}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          )}

          {/* Camera toggle (only while active video call) */}
          {callState === "active" && callType === "video" && (
            <button
              onClick={toggleCamera}
              className={`p-4 rounded-full border transition-all ${
                isCameraOff 
                  ? "bg-red-500 border-red-500 text-white" 
                  : "bg-slate-800 border-slate-700 text-slate-350 hover:bg-slate-750"
              }`}
            >
              {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>
          )}

          {/* Accept Call incoming */}
          {callState === "ringing-incoming" && (
            <button
              onClick={acceptCall}
              className="p-4 bg-green-500 hover:bg-green-400 border border-green-500 text-slate-950 font-bold rounded-full transition-colors flex items-center justify-center shadow-lg shadow-green-950/20 animate-bounce"
            >
              <Phone className="w-5 h-5 fill-slate-950" />
            </button>
          )}

          {/* Reject Call / Hangup */}
          {callState === "ringing-incoming" ? (
            <button
              onClick={declineCall}
              className="p-4 bg-red-500 hover:bg-red-400 border border-red-500 text-white font-bold rounded-full transition-colors flex items-center justify-center shadow-lg shadow-red-950/20"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={() => hangupCall(callDuration)}
              className="p-4 bg-red-500 hover:bg-red-400 border border-red-500 text-white font-bold rounded-full transition-colors flex items-center justify-center shadow-lg shadow-red-950/20 animate-pulse"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          )}
        </div>

      </motion.div>
    </div>
  );
}

export default CallingInterface;
