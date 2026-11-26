import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  RiVidiconLine, 
  RiPhoneLine, 
  RiPhoneFill,
  RiMicLine, 
  RiMicOffLine, 
  RiCameraLine, 
  RiCameraOffLine,
  RiComputerLine,
  RiFullscreenLine,
  RiFullscreenExitLine,
  RiCloseLine,
  RiSubtractLine,
  RiExpandDiagonalLine,
  RiLock2Line,
  RiUser3Line,
  RiAspectRatioLine,
  RiCropLine
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import './VideoCallModal.css';

// Multiple reliable STUN servers for robust NAT traversal
const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.services.mozilla.com' },
    { urls: 'stun:stun.cloudflare.com:3478' }
  ]
};

// ── Web Audio Ringtone Generator (Zero external mp3 asset requirements) ──
class RingtoneManager {
  constructor() {
    this.ctx = null;
    this.timer = null;
    this.isPlaying = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  playIncoming() {
    this.init();
    if (!this.ctx) return;
    this.stop();
    this.isPlaying = true;

    const playBeep = () => {
      if (!this.isPlaying || !this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(853, now); // Dual-tone phone ring
        osc.frequency.setValueAtTime(960, now + 0.3);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.9);
      } catch (e) {}
    };

    playBeep();
    this.timer = setInterval(playBeep, 2000);
  }

  playOutgoing() {
    this.init();
    if (!this.ctx) return;
    this.stop();
    this.isPlaying = true;

    const playBeep = () => {
      if (!this.isPlaying || !this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now); // Standard North American ringback

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 1.2);
      } catch (e) {}
    };

    playBeep();
    this.timer = setInterval(playBeep, 3500);
  }

  stop() {
    this.isPlaying = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

const ringtone = new RingtoneManager();

export const VideoCallModal = ({ socket: externalSocket, currentUser }) => {
  const [internalSocket, setInternalSocket] = useState(null);

  useEffect(() => {
    if (externalSocket) return;
    const token = localStorage.getItem('crm_token');
    if (!token) return;
    const socketUrl = import.meta.env.VITE_SOCKET_URL || (typeof window !== 'undefined' ? window.location.origin : '');
    const s = io(socketUrl, { auth: { token }, transports: ['websocket', 'polling'] });
    setInternalSocket(s);
    return () => {
      s.disconnect();
    };
  }, [externalSocket]);

  const socket = externalSocket || internalSocket;

  // Call States: 'idle' | 'outgoing_ringing' | 'incoming_ringing' | 'connected' | 'ended'
  const [callState, setCallState] = useState('idle');
  const [remoteUser, setRemoteUser] = useState(null);
  const [callType, setCallType] = useState('video'); // 'video' | 'audio'
  const [callDuration, setCallDuration] = useState(0);

  // User requirement: DEFAULT MIC OFF / MUTED
  const [isMuted, setIsMuted] = useState(true);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteIsScreenSharing, setRemoteIsScreenSharing] = useState(false);
  const [fitMode, setFitMode] = useState('auto'); // 'auto' | 'contain' | 'cover'

  // User requirement: DEFAULT FLOATING MODAL, FULLSCREEN ON DEMAND
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [swappedViews, setSwappedViews] = useState(false);

  // References
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const durationTimerRef = useRef(null);
  const iceQueueRef = useRef([]); // Critical queue for ICE candidates before remoteDescription is ready
  const remoteUserRef = useRef(null); // Ref to avoid stale closures in socket events
  const callStateRef = useRef('idle'); // Ref for immediate state checks

  // Helper to cleanup all call resources
  const cleanupCall = useCallback(() => {
    ringtone.stop();

    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        try { track.stop(); } catch (e) {}
      });
      localStreamRef.current = null;
    }

    if (pcRef.current) {
      try {
        pcRef.current.ontrack = null;
        pcRef.current.onicecandidate = null;
        pcRef.current.onconnectionstatechange = null;
        pcRef.current.close();
      } catch (e) {}
      pcRef.current = null;
    }

    iceQueueRef.current = [];

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    setIsMuted(true); // Always reset to default muted
    setIsCameraOff(false);
    setIsScreenSharing(false);
    setRemoteIsScreenSharing(false);
    setFitMode('auto');
    setIsFullscreen(false);
    setIsMinimized(false);
    setSwappedViews(false);
    setCallDuration(0);
  }, []);

  // Format seconds to mm:ss
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  // ── 1. Acquire Local Media with Audio/Video Constraints ──
  const setupLocalMedia = async (type = 'video', startMuted = true, startCamOff = false) => {
    try {
      const constraints = {
        audio: true,
        video: type === 'video' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } : false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      // Apply initial mic state (DEFAULT MUTED OFF)
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !startMuted;
      }

      // Apply initial camera state
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !startCamOff;
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }
      return stream;
    } catch (err) {
      console.warn('[WebRTC] Full media unavailable, attempting audio fallback:', err);
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = audioStream;
        const audioTrack = audioStream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = !startMuted;
        }
        setIsCameraOff(true);
        return audioStream;
      } catch (audioErr) {
        toast.error('Unable to access camera or microphone. Please check browser permissions.');
        return null;
      }
    }
  };

  // ── 2. Create RTCPeerConnection with Candidate Queuing ──
  const createPeerConnection = (targetUserId) => {
    const pc = new RTCPeerConnection(ICE_CONFIG);
    pcRef.current = pc;

    // Add local tracks to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // ICE Candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('call:signal', {
          targetUserId,
          signal: { type: 'candidate', candidate: event.candidate }
        });
      }
    };

    // Remote stream track handler
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      remoteStreamRef.current = remoteStream;
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.play().catch(() => {});
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC Connection State]:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        ringtone.stop();
        setCallState('connected');
        callStateRef.current = 'connected';
        if (!durationTimerRef.current) {
          durationTimerRef.current = setInterval(() => {
            setCallDuration(prev => prev + 1);
          }, 1000);
        }
      } else if (pc.connectionState === 'failed') {
        console.warn('[WebRTC] Connection failed, attempting ICE restart...');
        try {
          pc.restartIce();
        } catch (e) {}
      }
    };

    return pc;
  };

  // Helper to drain queued ICE candidates safely once remote description is set
  const drainIceCandidates = async (pc) => {
    if (iceQueueRef.current.length > 0 && pc && pc.remoteDescription) {
      const queue = [...iceQueueRef.current];
      iceQueueRef.current = [];
      for (const cand of queue) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch (e) {
          console.warn('[WebRTC] Candidate queue drain error:', e);
        }
      }
    }
  };

  // Keep video streams attached to <video> elements on render/swap
  useEffect(() => {
    if (callState === 'connected') {
      const activeRemote = swappedViews ? localStreamRef.current : remoteStreamRef.current;
      const activeLocal = swappedViews ? remoteStreamRef.current : localStreamRef.current;

      if (remoteVideoRef.current && activeRemote) {
        remoteVideoRef.current.srcObject = activeRemote;
        remoteVideoRef.current.play().catch(() => {});
      }
      if (localVideoRef.current && activeLocal) {
        localVideoRef.current.srcObject = activeLocal;
        localVideoRef.current.play().catch(() => {});
      }
    } else if (callState === 'outgoing_ringing') {
      if (localVideoRef.current && localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
        localVideoRef.current.play().catch(() => {});
      }
    }
  }, [callState, swappedViews]);

  // ── 3. Start Outgoing Call ──
  const initiateCall = async (targetUser, type = 'video') => {
    if (!socket || !targetUser) return;
    remoteUserRef.current = targetUser;
    setRemoteUser(targetUser);
    setCallType(type);
    setCallState('outgoing_ringing');
    callStateRef.current = 'outgoing_ringing';
    ringtone.playOutgoing();

    // Default mic to MUTED / OFF as requested
    const stream = await setupLocalMedia(type, isMuted, isCameraOff);
    if (!stream) {
      cleanupCall();
      setCallState('idle');
      callStateRef.current = 'idle';
      remoteUserRef.current = null;
      setRemoteUser(null);
      return;
    }

    socket.emit('call:initiate', {
      receiverId: targetUser.id,
      callType: type
    });
  };

  // ── 4. Answer Incoming Call (Honors user's pre-call Mic selection) ──
  const handleAnswerCall = async () => {
    const peer = remoteUserRef.current || remoteUser;
    if (!peer || !socket) return;
    ringtone.stop();

    const stream = await setupLocalMedia(callType, isMuted, isCameraOff);
    if (!stream) {
      handleRejectCall('media_unavailable');
      return;
    }

    createPeerConnection(peer.id);
    socket.emit('call:accept', { callerId: peer.id });
    setCallState('connected');
    callStateRef.current = 'connected';

    if (!durationTimerRef.current) {
      durationTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
  };

  // ── 5. Reject Incoming Call ──
  const handleRejectCall = (reason = 'declined') => {
    const peer = remoteUserRef.current || remoteUser;
    if (peer && socket) {
      socket.emit('call:reject', { callerId: peer.id, reason });
    }
    cleanupCall();
    setCallState('idle');
    callStateRef.current = 'idle';
    setRemoteUser(null);
    remoteUserRef.current = null;
  };

  // ── 6. End Active Call ──
  const handleEndCall = () => {
    const peer = remoteUserRef.current || remoteUser;
    if (peer && socket) {
      socket.emit('call:end', { targetUserId: peer.id });
    }
    setCallState('ended');
    callStateRef.current = 'ended';
    cleanupCall();
    setTimeout(() => {
      setCallState('idle');
      callStateRef.current = 'idle';
      setRemoteUser(null);
      remoteUserRef.current = null;
    }, 1000);
  };

  // ── 7. Toggle Microphone Mute ──
  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !nextMuted;
      }
    }
  };

  // ── 8. Toggle Camera On/Off ──
  const toggleCamera = async () => {
    const nextCameraOff = !isCameraOff;
    setIsCameraOff(nextCameraOff);

    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !nextCameraOff;
      }
    }
  };

  // ── 9. Toggle Screen Share ──
  const toggleScreenShare = async () => {
    if (!pcRef.current) return;

    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: 'always'
          },
          audio: false
        });
        const screenTrack = screenStream.getVideoTracks()[0];

        const sender = pcRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(screenTrack);
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
          localVideoRef.current.play().catch(() => {});
        }

        screenTrack.onended = () => {
          stopScreenSharing();
        };

        setIsScreenSharing(true);
        setFitMode('contain');

        // Notify remote peer that screen share started
        const targetId = remoteUserRef.current?.id;
        if (socket && targetId) {
          socket.emit('call:signal', {
            targetUserId: targetId,
            signal: { type: 'screen_share', isSharing: true }
          });
        }
      } catch (err) {
        console.warn('Screen share cancelled:', err);
      }
    } else {
      stopScreenSharing();
    }
  };

  const stopScreenSharing = async () => {
    if (!pcRef.current) return;
    if (localStreamRef.current) {
      const originalVideoTrack = localStreamRef.current.getVideoTracks()[0];
      const sender = pcRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
      if (sender && originalVideoTrack) {
        sender.replaceTrack(originalVideoTrack);
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
        localVideoRef.current.play().catch(() => {});
      }
    }
    setIsScreenSharing(false);

    // Notify remote peer that screen share stopped
    const targetId = remoteUserRef.current?.id;
    if (socket && targetId) {
      socket.emit('call:signal', {
        targetUserId: targetId,
        signal: { type: 'screen_share', isSharing: false }
      });
    }
  };

  // ── 10. Listen to Socket Call Events ──
  useEffect(() => {
    if (!socket) return;

    const onIncomingCall = (data) => {
      // Validate that this incoming call is actually meant for ME
      if (currentUser?.id && data.receiverId && String(data.receiverId) !== String(currentUser.id)) {
        return;
      }

      if (callStateRef.current !== 'idle') {
        socket.emit('call:reject', { callerId: data.callerId, reason: 'busy' });
        return;
      }
      const caller = {
        id: data.callerId,
        name: data.callerName || 'Team Member',
        avatar: data.callerAvatar,
        roleName: data.callerRole || data.roleName || 'Team Member'
      };
      remoteUserRef.current = caller;
      setRemoteUser(caller);
      setCallType(data.callType || 'video');
      setCallState('incoming_ringing');
      callStateRef.current = 'incoming_ringing';
      setIsMuted(true); // Default Mic OFF as requested by user
      ringtone.playIncoming();
    };

    const onCallAccepted = async (data) => {
      ringtone.stop();
      if (callStateRef.current === 'connected' && pcRef.current) {
        return; // Guard against duplicate accept packets
      }

      const peer = remoteUserRef.current || (data?.receiverId ? { id: data.receiverId, name: data.receiverName || 'Team Member' } : null);
      if (!peer) {
        console.warn('[WebRTC] onCallAccepted: no peer identified');
        return;
      }

      setCallState('connected');
      callStateRef.current = 'connected';
      if (!durationTimerRef.current) {
        durationTimerRef.current = setInterval(() => {
          setCallDuration(prev => prev + 1);
        }, 1000);
      }

      const pc = createPeerConnection(peer.id);
      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        await pc.setLocalDescription(offer);
        socket.emit('call:signal', {
          targetUserId: peer.id,
          signal: { type: 'offer', sdp: offer }
        });
      } catch (err) {
        console.error('[WebRTC] Error creating offer:', err);
      }
    };

    const onCallRejected = (data) => {
      ringtone.stop();
      const reasonMsg = data?.reason === 'busy' ? 'User is busy on another call' : 'Call declined';
      toast(reasonMsg, { icon: '📞' });
      cleanupCall();
      setCallState('ended');
      callStateRef.current = 'ended';
      setTimeout(() => {
        setCallState('idle');
        callStateRef.current = 'idle';
        setRemoteUser(null);
        remoteUserRef.current = null;
      }, 1000);
    };

    const onCallEnded = () => {
      toast('Call ended', { icon: '📴' });
      cleanupCall();
      setCallState('ended');
      callStateRef.current = 'ended';
      setTimeout(() => {
        setCallState('idle');
        callStateRef.current = 'idle';
        setRemoteUser(null);
        remoteUserRef.current = null;
      }, 1000);
    };

    const onCallSignal = async ({ fromUserId, signal }) => {
      if (!signal) return;

      // Only accept signals from our active call peer
      const currentPeer = remoteUserRef.current;
      if (currentPeer && fromUserId && String(currentPeer.id) !== String(fromUserId)) {
        return;
      }

      // Handle custom screen share signal
      if (signal.type === 'screen_share') {
        const isSharing = Boolean(signal.isSharing);
        setRemoteIsScreenSharing(isSharing);
        if (isSharing) {
          setFitMode('contain');
          setSwappedViews(false); // Show shared screen directly on main stage
          toast(`${remoteUserRef.current?.name || 'Participant'} started screen sharing`, { icon: '🖥️' });
        } else {
          toast('Screen sharing stopped', { icon: '🖥️' });
        }
        return;
      }

      let pc = pcRef.current;
      if (!pc && fromUserId) {
        pc = createPeerConnection(fromUserId);
      }
      if (!pc) return;

      try {
        if (signal.type === 'offer') {
          if (pc.signalingState === 'have-remote-offer') {
            return; // Guard duplicate offer
          }
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          await drainIceCandidates(pc);

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('call:signal', {
            targetUserId: fromUserId,
            signal: { type: 'answer', sdp: answer }
          });
        } else if (signal.type === 'answer') {
          if (pc.signalingState === 'stable') {
            return; // Guard duplicate answer
          }
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          await drainIceCandidates(pc);
        } else if (signal.type === 'candidate' && signal.candidate) {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } else {
            // Queue candidate until remoteDescription is set
            iceQueueRef.current.push(signal.candidate);
          }
        }
      } catch (err) {
        console.error('[WebRTC] Error handling signal:', err);
      }
    };

    socket.on('call:incoming', onIncomingCall);
    socket.on('call:accepted', onCallAccepted);
    socket.on('call:rejected', onCallRejected);
    socket.on('call:ended', onCallEnded);
    socket.on('call:signal', onCallSignal);

    return () => {
      socket.off('call:incoming', onIncomingCall);
      socket.off('call:accepted', onCallAccepted);
      socket.off('call:rejected', onCallRejected);
      socket.off('call:ended', onCallEnded);
      socket.off('call:signal', onCallSignal);
    };
  }, [socket, cleanupCall]);

  // ── 11. Listen to Window Custom Event `crm:start_call` ──
  useEffect(() => {
    const handleStartCallEvent = (e) => {
      const { receiverId, recipient, callType: cType } = e.detail || {};
      if (recipient || receiverId) {
        initiateCall(recipient || { id: receiverId, name: 'Team Member' }, cType || 'video');
      }
    };

    window.addEventListener('crm:start_call', handleStartCallEvent);
    return () => {
      window.removeEventListener('crm:start_call', handleStartCallEvent);
    };
  }, [socket]);

  // Auto answer check from URL (push notification click)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const autoAnswerParam = urlParams.get('autoAnswer');
    const targetUserId = urlParams.get('userId');

    if (autoAnswerParam && targetUserId && socket && callState === 'incoming_ringing') {
      handleAnswerCall();
    }
  }, [socket, callState]);

  const isCurrentMainScreen = (!swappedViews && remoteIsScreenSharing) || (swappedViews && isScreenSharing);
  const isCurrentPipScreen = (!swappedViews && isScreenSharing) || (swappedViews && remoteIsScreenSharing);
  const isAnyScreenSharing = isScreenSharing || remoteIsScreenSharing;

  const effectiveFit = fitMode === 'contain'
    ? 'contain'
    : (fitMode === 'cover' ? 'cover' : (isAnyScreenSharing ? 'contain' : 'cover'));

  if (callState === 'idle') return null;

  const modalContent = (
    <div className={`wa-call-overlay ${isFullscreen ? 'fullscreen-mode' : ''} ${isMinimized ? 'minimized-mode' : ''}`}>
      
      {/* ── 1. WHATSAPP INCOMING CALL SCREEN ── */}
      {callState === 'incoming_ringing' && (
        <div className="wa-calling-card">
          <div className="wa-card-top-tag">
            <RiVidiconLine style={{ color: '#25d366', fontSize: '1rem' }} />
            <span>WhatsApp Video Call</span>
          </div>

          {/* WhatsApp Ripple Avatar */}
          <div className="wa-avatar-container">
            <div className="wa-ripple" />
            <div className="wa-ripple" />
            <div className="wa-ripple" />
            <div className="wa-avatar-img">
              {remoteUser?.avatar ? (
                <img src={remoteUser.avatar} alt={remoteUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                remoteUser?.name?.charAt(0).toUpperCase() || <RiUser3Line />
              )}
            </div>
          </div>

          <h3 className="wa-caller-name">{remoteUser?.name || 'Team Member'}</h3>
          <div className="wa-caller-role">{remoteUser?.roleName || 'CRM Direct Contact'}</div>

          <div className="wa-call-status">
            <span className="wa-pulse-dot" />
            <span>Incoming video call...</span>
          </div>

          {/* User Request: Pre-Call Audio & Video Join Buttons (Default OFF for Mic) */}
          <div className="wa-precall-box">
            <button
              type="button"
              onClick={toggleMute}
              className={`wa-precall-btn ${isMuted ? 'muted' : 'active'}`}
              title={isMuted ? "Mic is OFF (Default) — Click to enable" : "Mic is ON — Click to mute"}
            >
              {isMuted ? <RiMicOffLine style={{ fontSize: '1.05rem' }} /> : <RiMicLine style={{ fontSize: '1.05rem' }} />}
              <span>{isMuted ? 'Mic: OFF (Default)' : 'Mic: ON'}</span>
            </button>

            <button
              type="button"
              onClick={toggleCamera}
              className={`wa-precall-btn ${isCameraOff ? 'muted' : 'active'}`}
              title={isCameraOff ? "Camera is OFF — Click to enable" : "Camera is ON"}
            >
              {isCameraOff ? <RiCameraOffLine style={{ fontSize: '1.05rem' }} /> : <RiCameraLine style={{ fontSize: '1.05rem' }} />}
              <span>{isCameraOff ? 'Camera: OFF' : 'Camera: ON'}</span>
            </button>
          </div>

          {/* WhatsApp Big Circular Buttons: Decline & Accept */}
          <div className="wa-actions-row">
            <button
              type="button"
              className="wa-action-group"
              onClick={() => handleRejectCall('declined')}
            >
              <div className="wa-circle-btn decline">
                <RiPhoneFill style={{ transform: 'rotate(135deg)' }} />
              </div>
              <span>Decline</span>
            </button>

            <button
              type="button"
              className="wa-action-group"
              onClick={handleAnswerCall}
            >
              <div className="wa-circle-btn accept">
                <RiPhoneFill />
              </div>
              <span style={{ color: '#25d366', fontWeight: 700 }}>Accept</span>
            </button>
          </div>
        </div>
      )}

      {/* ── 2. WHATSAPP OUTGOING CALL SCREEN ── */}
      {callState === 'outgoing_ringing' && (
        <div className="wa-calling-card">
          <div className="wa-card-top-tag">
            <RiVidiconLine style={{ color: '#25d366', fontSize: '1rem' }} />
            <span>WhatsApp Video Call</span>
          </div>

          <div className="wa-avatar-container">
            <div className="wa-ripple" />
            <div className="wa-ripple" />
            <div className="wa-avatar-img">
              {remoteUser?.avatar ? (
                <img src={remoteUser.avatar} alt={remoteUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                remoteUser?.name?.charAt(0).toUpperCase() || <RiUser3Line />
              )}
            </div>
          </div>

          <h3 className="wa-caller-name">{remoteUser?.name || 'Team Member'}</h3>
          <div className="wa-caller-role">{remoteUser?.roleName || 'CRM Direct Contact'}</div>

          <div className="wa-call-status">
            <span className="wa-pulse-dot" />
            <span>Ringing...</span>
          </div>

          {/* Pre-Call Toggles for caller */}
          <div className="wa-precall-box">
            <button
              type="button"
              onClick={toggleMute}
              className={`wa-precall-btn ${isMuted ? 'muted' : 'active'}`}
            >
              {isMuted ? <RiMicOffLine /> : <RiMicLine />}
              <span>{isMuted ? 'Mic: Muted' : 'Mic: ON'}</span>
            </button>

            <button
              type="button"
              onClick={toggleCamera}
              className={`wa-precall-btn ${isCameraOff ? 'muted' : 'active'}`}
            >
              {isCameraOff ? <RiCameraOffLine /> : <RiCameraLine />}
              <span>{isCameraOff ? 'Camera: OFF' : 'Camera: ON'}</span>
            </button>
          </div>

          {/* Local Camera Self-Preview Thumbnail */}
          <div style={{
            width: 160,
            height: 100,
            borderRadius: 14,
            overflow: 'hidden',
            margin: '0 auto 24px',
            background: '#202c33',
            border: '2px solid rgba(255, 255, 255, 0.12)',
            position: 'relative'
          }}>
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              muted 
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} 
            />
            {isCameraOff && (
              <div style={{ position: 'absolute', inset: 0, background: '#202c33', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', color: '#8696a0' }}>
                Camera Off
              </div>
            )}
          </div>

          {/* WhatsApp End Call Circle Button */}
          <button
            type="button"
            className="wa-action-group"
            onClick={handleEndCall}
          >
            <div className="wa-circle-btn decline">
              <RiPhoneFill style={{ transform: 'rotate(135deg)' }} />
            </div>
            <span>Cancel</span>
          </button>
        </div>
      )}

      {/* ── 3. WHATSAPP CONNECTED CALL WINDOW (DEFAULT FLOATING, FULLSCREEN ON DEMAND) ── */}
      {callState === 'connected' && (
        <div className={`wa-call-window ${isFullscreen ? 'fullscreen' : 'floating'} ${isAnyScreenSharing ? 'sharing-active' : ''}`}>
          {/* WhatsApp Top Header Bar */}
          <div className="wa-header-bar">
            <div className="wa-header-pill">
              <div className="wa-header-avatar">
                {remoteUser?.avatar ? (
                  <img src={remoteUser.avatar} alt={remoteUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  remoteUser?.name?.charAt(0).toUpperCase() || 'U'
                )}
              </div>

              <div>
                <div className="wa-header-name">{remoteUser?.name}</div>
                <div className="wa-header-meta">
                  <span className="wa-duration-pill">
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#25d366' }} />
                    {formatTime(callDuration)}
                  </span>
                  <span className="hide-mobile" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    • <RiLock2Line style={{ fontSize: '0.72rem', color: '#25d366' }} /> End-to-end encrypted
                  </span>
                </div>
              </div>
            </div>

            {/* Header Right Actions: Fit/Fill, Fullscreen & Minimize PiP */}
            <div className="wa-header-actions">
              <button
                type="button"
                className={`wa-header-btn ${effectiveFit === 'contain' ? 'active-fit' : ''}`}
                onClick={() => setFitMode(prev => (effectiveFit === 'contain' ? 'cover' : 'contain'))}
                title={effectiveFit === 'contain' ? "Fit Full View (No Crop) — Click to Fill Screen" : "Fill Screen (Cropped) — Click to Fit Full View"}
              >
                {effectiveFit === 'contain' ? (
                  <>
                    <RiAspectRatioLine style={{ fontSize: '1rem', color: '#25d366' }} />
                    <span className="hide-mobile">Fit to Screen</span>
                  </>
                ) : (
                  <>
                    <RiCropLine style={{ fontSize: '1rem' }} />
                    <span className="hide-mobile">Fill Screen</span>
                  </>
                )}
              </button>

              <button
                type="button"
                className="wa-header-btn"
                onClick={() => setIsFullscreen(prev => !prev)}
                title={isFullscreen ? "Exit Fullscreen" : "Full Screen"}
              >
                {isFullscreen ? (
                  <>
                    <RiFullscreenExitLine style={{ fontSize: '1rem' }} />
                    <span className="hide-mobile">Exit Fullscreen</span>
                  </>
                ) : (
                  <>
                    <RiFullscreenLine style={{ fontSize: '1rem' }} />
                    <span className="hide-mobile">Full Screen</span>
                  </>
                )}
              </button>

              <button
                type="button"
                className="wa-header-btn"
                onClick={() => setIsMinimized(prev => !prev)}
                title={isMinimized ? "Expand Room" : "Minimize to Corner"}
              >
                {isMinimized ? <RiExpandDiagonalLine /> : <RiSubtractLine />}
              </button>
            </div>
          </div>

          {/* Main Video Stage */}
          <div 
            className="wa-video-stage" 
            onDoubleClick={() => setIsFullscreen(prev => !prev)}
          >
            {/* Screen Share Status Banner */}
            {(remoteIsScreenSharing || isScreenSharing) && (
              <div className="wa-screenshare-badge">
                <RiComputerLine style={{ fontSize: '1.05rem', color: '#25d366' }} />
                <span>
                  {isScreenSharing ? 'You are sharing your screen' : `${remoteUser?.name || 'Participant'} is sharing screen`}
                </span>
                <span className="wa-fit-tag">
                  {effectiveFit === 'contain' ? 'Fit (No Crop)' : 'Fill (Cropped)'}
                </span>
              </div>
            )}

            <video
              ref={swappedViews ? localVideoRef : remoteVideoRef}
              autoPlay
              playsInline
              muted={swappedViews}
              className={`wa-main-video ${effectiveFit === 'contain' ? 'fit-contain' : 'fit-cover'} ${(isScreenSharing || remoteIsScreenSharing) ? 'sharing' : ''}`}
              style={{
                transform: (swappedViews && !isScreenSharing) ? 'scaleX(-1)' : 'none'
              }}
            />

            {/* Remote Fallback when Video is unavailable */}
            {!swappedViews && (!remoteStreamRef.current || remoteStreamRef.current.getVideoTracks().length === 0 || !remoteStreamRef.current.getVideoTracks()[0].enabled) && (
              <div className="wa-audio-placeholder">
                <div className="wa-audio-avatar">
                  {remoteUser?.avatar ? (
                    <img src={remoteUser.avatar} alt={remoteUser.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    remoteUser?.name?.charAt(0).toUpperCase() || 'U'
                  )}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#e9edef' }}>
                    {remoteUser?.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#25d366', marginTop: 4 }}>
                    Audio Connected
                  </div>
                </div>
              </div>
            )}

            {/* Local Video Picture-in-Picture (PiP) Window */}
            {!isMinimized && (
              <div 
                className="wa-pip-card"
                onClick={(e) => {
                  e.stopPropagation();
                  setSwappedViews(!swappedViews);
                }}
                title="Click to swap video view"
              >
                <video
                  ref={swappedViews ? remoteVideoRef : localVideoRef}
                  autoPlay
                  playsInline
                  muted={!swappedViews}
                  className={`wa-pip-video ${isCurrentPipScreen ? 'sharing' : ''}`}
                  style={{ transform: (!swappedViews && !isScreenSharing) ? 'scaleX(-1)' : 'none' }}
                />
                <div className="wa-pip-label">
                  {swappedViews ? remoteUser?.name : (isMuted ? 'You (Muted)' : 'You')}
                </div>
                {(!swappedViews && isCameraOff) && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: '#202c33',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.72rem', color: '#8696a0'
                  }}>
                    Camera Off
                  </div>
                )}
              </div>
            )}
          </div>

          {/* WhatsApp Bottom Floating Control Dock */}
          <div className="wa-control-dock">
            {/* Mic Toggle (Red when muted by default!) */}
            <button
              type="button"
              className={`wa-dock-circle ${isMuted ? 'muted-state' : ''}`}
              onClick={toggleMute}
              title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            >
              {isMuted ? <RiMicOffLine /> : <RiMicLine />}
            </button>

            {/* Camera Toggle */}
            <button
              type="button"
              className={`wa-dock-circle ${isCameraOff ? 'muted-state' : ''}`}
              onClick={toggleCamera}
              title={isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
            >
              {isCameraOff ? <RiCameraOffLine /> : <RiCameraLine />}
            </button>

            {/* Screen Share */}
            <button
              type="button"
              className={`wa-dock-circle ${isScreenSharing ? 'active-share' : ''}`}
              onClick={toggleScreenShare}
              title={isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen'}
            >
              <RiComputerLine />
            </button>

            {/* Fit / Fill Aspect Ratio Quick Toggle */}
            <button
              type="button"
              className={`wa-dock-circle ${effectiveFit === 'contain' ? 'active-share' : ''}`}
              onClick={() => setFitMode(prev => (effectiveFit === 'contain' ? 'cover' : 'contain'))}
              title={effectiveFit === 'contain' ? "Fit Full View (No Crop) — Click to Fill Screen" : "Fill Screen (Cropped) — Click to Fit Full View"}
            >
              {effectiveFit === 'contain' ? <RiAspectRatioLine /> : <RiCropLine />}
            </button>

            {/* Fullscreen Quick Toggle */}
            <button
              type="button"
              className="wa-dock-circle hide-mobile"
              onClick={() => setIsFullscreen(prev => !prev)}
              title={isFullscreen ? "Exit Fullscreen" : "Full Screen"}
            >
              {isFullscreen ? <RiFullscreenExitLine /> : <RiFullscreenLine />}
            </button>

            {/* WhatsApp Signature Red End Call Circle */}
            <button
              type="button"
              className="wa-end-call-btn"
              onClick={handleEndCall}
              title="End Call"
            >
              <RiPhoneFill style={{ transform: 'rotate(135deg)' }} />
            </button>
          </div>
        </div>
      )}

      {/* ── 4. CALL ENDED BANNER ── */}
      {callState === 'ended' && (
        <div style={{
          background: '#202c33',
          padding: '24px 40px',
          borderRadius: 18,
          border: '1px solid rgba(134, 150, 160, 0.2)',
          textAlign: 'center',
          boxShadow: '0 20px 48px rgba(0, 0, 0, 0.7)'
        }}>
          <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>📴</div>
          <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#ea0038', fontWeight: 700 }}>Call Ended</h4>
          {callDuration > 0 && (
            <p style={{ margin: '6px 0 0', fontSize: '0.82rem', color: '#8696a0', fontWeight: 600 }}>
              Duration: {formatTime(callDuration)}
            </p>
          )}
        </div>
      )}
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

export default VideoCallModal;
