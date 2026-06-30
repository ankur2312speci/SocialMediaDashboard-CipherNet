import { useEffect, useRef, useCallback } from "react";
import { useCallStore } from "../store/useCallStore";
import { useAuthStore } from "../store/useAuthStore";
import { getSocket } from "./useSocket";
import { logCallRecord, fetchUserProfileById } from "../services/api";

const configuration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ]
};

export function useWebRTC() {
  const { user } = useAuthStore();
  const { 
    callState, 
    callType, 
    peerUser, 
    localStream, 
    remoteStream, 
    initiateCall, 
    receiveCall, 
    startActiveCall, 
    endCallSession,
    setCallState 
  } = useCallStore();

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingCandidates = useRef([]);

  // Cleanup peer connection
  const cleanup = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    localStreamRef.current = null;
    pendingCandidates.current = [];
    endCallSession();
  }, [endCallSession]);

  // Create Peer Connection
  const createPeerConnection = useCallback((targetUserId, stream) => {
    if (pcRef.current) return pcRef.current;

    console.log("WebRTC: Creating RTCPeerConnection...");
    const pc = new RTCPeerConnection(configuration);

    // Add local tracks to peer connection
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    // Handle remote track event
    pc.ontrack = (event) => {
      console.log("WebRTC: Remote track received!");
      const remoteStream = event.streams[0];
      
      // Update global call store with streams
      startActiveCall(stream, remoteStream);
    };

    // Handle ICE Candidate gathering
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const socket = getSocket();
        if (socket) {
          socket.emit("ice-candidate", {
            candidate: event.candidate,
            to: targetUserId
          });
        }
      }
    };

    pcRef.current = pc;
    return pc;
  }, [startActiveCall]);

  // A. Initiate Outgoing Call
  const startCall = useCallback(async (targetUser, type = "voice") => {
    try {
      initiateCall(targetUser, type);
      
      // Request media stream
      const constraints = {
        audio: true,
        video: type === "video"
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      const targetUserId = targetUser.id || targetUser._id;
      const pc = createPeerConnection(targetUserId, stream);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const socket = getSocket();
      if (socket) {
        socket.emit("call-user", {
          userToCall: targetUserId,
          signalData: offer,
          from: user._id,
          type
        });
      }
    } catch (err) {
      console.error("WebRTC: Error starting call:", err.message);
      cleanup();
    }
  }, [user, initiateCall, createPeerConnection, cleanup]);

  // B. Accept Incoming Call
  const acceptCall = useCallback(async () => {
    const { incomingSignal } = useCallStore.getState();
    if (!peerUser || !incomingSignal) {
      console.error("WebRTC: No incoming signal or peer user to accept call.");
      return;
    }

    try {
      const constraints = {
        audio: true,
        video: callType === "video"
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      const peerId = peerUser.id || peerUser._id;
      const pc = createPeerConnection(peerId, stream);
      
      // Set remote SDP description
      await pc.setRemoteDescription(new RTCSessionDescription(incomingSignal));
      
      // Process any buffered ICE candidates
      while (pendingCandidates.current.length > 0) {
        const candidate = pendingCandidates.current.shift();
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }

      // Create SDP Answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      const socket = getSocket();
      if (socket) {
        socket.emit("answer-call", {
          signal: answer,
          to: peerId
        });
      }

      startActiveCall(stream, null); // will populate remote stream when ontrack fires
    } catch (err) {
      console.error("WebRTC: Error accepting call:", err.message);
      cleanup();
    }
  }, [peerUser, callType, createPeerConnection, startActiveCall, cleanup]);

  // C. Decline Incoming Call
  const declineCall = useCallback(() => {
    if (!peerUser) return;
    
    const peerId = peerUser.id || peerUser._id;
    // Log missed call history
    logCallRecord({ receiverId: peerId, type: callType, status: "rejected", duration: 0 }).catch(console.error);

    const socket = getSocket();
    if (socket) {
      socket.emit("reject-call", { to: peerId, reason: "declined" });
    }
    cleanup();
  }, [peerUser, callType, cleanup]);

  // D. Hang Up Call
  const hangupCall = useCallback((duration = 0) => {
    if (!peerUser) return;

    const peerId = peerUser.id || peerUser._id;
    // Log call duration
    logCallRecord({ receiverId: peerId, type: callType, status: "completed", duration }).catch(console.error);

    const socket = getSocket();
    if (socket) {
      socket.emit("end-call", { to: peerId });
    }
    cleanup();
  }, [peerUser, callType, cleanup]);

  // Bind WebRTC Socket Listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !user) return;

    // 1. Listen for incoming calls
    const handleIncomingCall = async ({ signal, from, type }) => {
      // If already in a call, emit busy back
      if (useCallStore.getState().callState !== "idle") {
        socket.emit("reject-call", { to: from, reason: "busy" });
        return;
      }

      try {
        // Fetch caller details from server profile
        const callerProfile = await fetchUserProfileById(from).catch(() => null);
        
        // Dynamic fallback user
        const caller = callerProfile || { 
          _id: from, 
          username: "Unknown User", 
          avatar: `https://ui-avatars.com/api/?name=Call&background=random`
        };

        receiveCall(caller, type, signal);
      } catch (err) {
        console.error(err);
      }
    };

    // 2. Listen for call acceptance
    const handleCallAccepted = async ({ signal }) => {
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal));
        console.log("WebRTC: Remote description set on caller. Call active!");
      }
    };

    // 3. Listen for ICE candidates
    const handleIceCandidate = async ({ candidate }) => {
      if (pcRef.current && pcRef.current.remoteDescription) {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        // Buffer candidate until remote description is set
        pendingCandidates.current.push(candidate);
      }
    };

    // 4. Listen for call rejected / busy
    const handleCallRejected = ({ reason }) => {
      useCallStore.setState({ callError: reason });
      setTimeout(() => {
        cleanup();
        useCallStore.setState({ callError: null });
      }, 2500);
    };

    // Listen for call failed (offline)
    const handleCallFailed = ({ reason }) => {
      useCallStore.setState({ callError: reason || "offline" });
      setTimeout(() => {
        cleanup();
        useCallStore.setState({ callError: null });
      }, 2500);
    };

    // 5. Listen for peer hangup
    const handleCallEnded = () => {
      console.log("WebRTC: Remote peer hung up the call.");
      cleanup();
    };

    socket.on("incoming-call", handleIncomingCall);
    socket.on("call-accepted", handleCallAccepted);
    socket.on("ice-candidate", handleIceCandidate);
    socket.on("call-rejected", handleCallRejected);
    socket.on("call-failed", handleCallFailed);
    socket.on("call-ended", handleCallEnded);

    return () => {
      socket.off("incoming-call", handleIncomingCall);
      socket.off("call-accepted", handleCallAccepted);
      socket.off("ice-candidate", handleIceCandidate);
      socket.off("call-rejected", handleCallRejected);
      socket.off("call-failed", handleCallFailed);
      socket.off("call-ended", handleCallEnded);
    };
  }, [user, receiveCall, cleanup]);

  return {
    startCall,
    acceptCall,
    declineCall,
    hangupCall
  };
}
