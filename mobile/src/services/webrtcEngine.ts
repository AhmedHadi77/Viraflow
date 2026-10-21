/** The phone's WebRTC engine (react-native-webrtc). The web app uses webrtcEngine.web.tsx instead. */
export function loadWebRtcEngine(): unknown {
  return require("react-native-webrtc");
}
