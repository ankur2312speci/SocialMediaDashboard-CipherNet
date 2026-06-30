import { create } from "zustand";

export const useCallStore = create((set) => ({
  callState: "idle", // 'idle' | 'ringing-incoming' | 'ringing-outgoing' | 'active'
  callType: "voice", // 'voice' | 'video'
  peerUser: null, // User object of the other party (id, username, name, avatar)
  incomingSignal: null,
  callError: null, // 'declined' | 'busy' | etc
  localStream: null,
  remoteStream: null,
  isMuted: false,
  isCameraOff: false,
  callDuration: 0,
  callTimerId: null,

  setCallState: (callState) => set({ callState }),
  
  initiateCall: (peerUser, type = "voice") => set({
    callState: "ringing-outgoing",
    callType: type,
    peerUser,
    incomingSignal: null,
    callError: null,
    callDuration: 0,
    isMuted: false,
    isCameraOff: type !== "video"
  }),

  receiveCall: (peerUser, type = "voice", incomingSignal = null) => set({
    callState: "ringing-incoming",
    callType: type,
    peerUser,
    incomingSignal,
    callError: null,
    callDuration: 0,
    isMuted: false,
    isCameraOff: type !== "video"
  }),

  startActiveCall: (localStream, remoteStream) => set((state) => {
    // Start interval timer
    if (state.callTimerId) clearInterval(state.callTimerId);
    const timerId = setInterval(() => {
      set((s) => ({ callDuration: s.callDuration + 1 }));
    }, 1000);

    return {
      callState: "active",
      localStream,
      remoteStream,
      callTimerId: timerId
    };
  }),

  toggleMute: () => set((state) => {
    const nextMute = !state.isMuted;
    if (state.localStream) {
      state.localStream.getAudioTracks().forEach(track => {
        track.enabled = !nextMute;
      });
    }
    return { isMuted: nextMute };
  }),

  toggleCamera: () => set((state) => {
    const nextCam = !state.isCameraOff;
    if (state.localStream) {
      state.localStream.getVideoTracks().forEach(track => {
        track.enabled = !nextCam;
      });
    }
    return { isCameraOff: nextCam };
  }),

  endCallSession: () => set((state) => {
    // Clean up media streams
    if (state.localStream) {
      state.localStream.getTracks().forEach(track => track.stop());
    }
    if (state.remoteStream) {
      state.remoteStream.getTracks().forEach(track => track.stop());
    }
    if (state.callTimerId) {
      clearInterval(state.callTimerId);
    }
    return {
      callState: "idle",
      peerUser: null,
      incomingSignal: null,
      localStream: null,
      remoteStream: null,
      callDuration: 0,
      callTimerId: null,
      callError: null
    };
  })
}));
