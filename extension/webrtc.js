(() => {
  const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

  class WebRTCManager {
    constructor({ firebase, roomId, userId, getDisplayName, ui }) {
      this.firebase = firebase;
      this.roomId = roomId;
      this.userId = userId;
      this.getDisplayName = getDisplayName || (() => "Guest");
      this.ui = ui;
      this.pc = null;
      this.localStream = null;
      this.remoteStream = new MediaStream();
      this.unsubs = [];
      this.micMuted = false;
      this.cameraOff = false;
      this.handledOfferFrom = null;
    }

    async start() {
      if (this.pc || this.localStream) {
        this.ui?.setCallStatus("Call already active.");
        return;
      }

      const users = await this.firebase.get(`rooms/${this.roomId}/users`);
      const onlineUsers = Object.entries(users || {}).filter(([, user]) => user.online);
      if (onlineUsers.length > 2) {
        this.ui?.setCallStatus("Video call currently supports 2 users only.");
        return;
      }

      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      } catch (error) {
        this.ui?.setCallStatus(`Camera/mic permission failed: ${error.message}`);
        return;
      }

      this.ui?.setLocalStream(this.localStream);
      this.ui?.setRemoteStream(this.remoteStream);
      this.ui?.setCallState?.({ active: true, micMuted: this.micMuted, cameraOff: this.cameraOff });
      this.createPeer();
      await this.listenForSignals();

      const offers = await this.firebase.get(`rooms/${this.roomId}/webrtc/offers`);
      const incoming = Object.values(offers || {}).find((offer) => offer.from !== this.userId);
      if (incoming) await this.answerOffer(incoming);
      else await this.createOffer();

      this.ui?.setCallStatus("Call signaling started.");
    }

    createPeer() {
      this.closePeerOnly();
      this.remoteStream = new MediaStream();
      this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      this.localStream.getTracks().forEach((track) => this.pc.addTrack(track, this.localStream));
      this.pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => this.remoteStream.addTrack(track));
        this.ui?.setRemoteStream(this.remoteStream);
      };
      this.pc.onicecandidate = (event) => {
        if (event.candidate) {
          this.firebase.push(`rooms/${this.roomId}/webrtc/candidates/${this.userId}`, event.candidate.toJSON()).catch(() => undefined);
        }
      };
      this.pc.onconnectionstatechange = () => {
        this.ui?.setCallStatus(`Call: ${this.pc.connectionState}`);
      };
    }

    async listenForSignals() {
      this.clearSignalListeners();
      this.unsubs.push(await this.firebase.onValue(`rooms/${this.roomId}/webrtc/offers`, async (offers) => {
        const incoming = Object.values(offers || {}).find((offer) => offer.from !== this.userId);
        if (incoming && this.localStream && incoming.from !== this.handledOfferFrom) {
          await this.answerOffer(incoming);
        }
      }));
      this.unsubs.push(await this.firebase.onValue(`rooms/${this.roomId}/webrtc/answers/${this.userId}`, async (answer) => {
        if (answer?.sdp && this.pc && !this.pc.currentRemoteDescription) {
          await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
      }));
      this.unsubs.push(await this.firebase.onValue(`rooms/${this.roomId}/webrtc/candidates`, async (candidateGroups) => {
        if (!this.pc) return;
        const candidates = Object.entries(candidateGroups || {})
          .filter(([from]) => from !== this.userId)
          .flatMap(([, group]) => Object.values(group || {}));
        for (const candidate of candidates) {
          try { await this.pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (_) { /* Ignore duplicates/races. */ }
        }
      }));
    }

    async createOffer() {
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      await this.firebase.set(`rooms/${this.roomId}/webrtc/offers/${this.userId}`, {
        type: offer.type,
        sdp: offer.sdp,
        from: this.userId,
        displayName: this.getDisplayName(),
        createdAt: Date.now()
      });
    }

    async answerOffer(offer) {
      this.handledOfferFrom = offer.from;
      if (!this.pc) this.createPeer();
      if (this.pc.signalingState !== "stable") return;
      await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      await this.firebase.set(`rooms/${this.roomId}/webrtc/answers/${offer.from}`, {
        type: answer.type,
        sdp: answer.sdp,
        from: this.userId,
        to: offer.from,
        displayName: this.getDisplayName(),
        createdAt: Date.now()
      });
      this.answeredFor = offer.from;
    }

    toggleMute() {
      this.micMuted = !this.micMuted;
      this.localStream?.getAudioTracks().forEach((track) => { track.enabled = !this.micMuted; });
      this.ui?.setCallStatus(this.micMuted ? "Microphone muted." : "Microphone on.");
      this.ui?.setCallState?.({ active: true, micMuted: this.micMuted, cameraOff: this.cameraOff });
      return this.micMuted;
    }

    toggleCamera() {
      this.cameraOff = !this.cameraOff;
      this.localStream?.getVideoTracks().forEach((track) => { track.enabled = !this.cameraOff; });
      this.ui?.setCallStatus(this.cameraOff ? "Camera off." : "Camera on.");
      this.ui?.setCallState?.({ active: true, micMuted: this.micMuted, cameraOff: this.cameraOff });
      return this.cameraOff;
    }

    async end() {
      this.clearSignalListeners();
      this.closePeerOnly();
      this.localStream?.getTracks().forEach((track) => track.stop());
      this.localStream = null;
      this.ui?.setLocalStream(null);
      this.ui?.setRemoteStream(null);
      this.ui?.setCallState?.({ active: false, micMuted: false, cameraOff: false });
      await this.firebase.remove(`rooms/${this.roomId}/webrtc`).catch(() => undefined);
      this.ui?.setCallStatus("Call ended.");
    }

    closePeerOnly() {
      this.pc?.close();
      this.pc = null;
    }

    clearSignalListeners() {
      this.unsubs.forEach((unsub) => unsub?.());
      this.unsubs = [];
    }
  }

  window.WatchPartyWebRTCManager = WebRTCManager;
})();
