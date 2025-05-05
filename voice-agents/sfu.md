# Selective Forwarding Unit (SFU)

## Summary

An SFU, or Selective Forwarding Unit, is a server architecture pattern used in real-time communication systems like WebRTC, particularly for multi-party calls (three or more participants). Unlike pure peer-to-peer (Mesh) where every participant connects directly to everyone else (causing high upload bandwidth and CPU load), and unlike an MCU (Multipoint Conferencing Unit) which decodes, mixes, and re-encodes streams (causing high server CPU load and latency), an SFU takes a middle-ground approach.

Each participant sends their audio/video stream only once to the SFU. The SFU then acts like a router: it selectively forwards these incoming streams to the other connected participants without decoding or re-encoding the media itself. This significantly reduces the client's upload bandwidth requirement compared to Mesh and keeps the server CPU load much lower than an MCU. Clients download separate streams for each participant they are viewing/hearing. While SFU is not part of the core WebRTC standard itself, it heavily relies on WebRTC protocols (ICE, DTLS, SRTP) for establishing secure connections between the clients and the SFU server. It's the dominant architecture for scalable, high-quality multi-party WebRTC applications today.

## Solutions

### Open Source

- **Janus WebRTC Server**: A powerful and flexible general-purpose WebRTC gateway that can be configured as an SFU.
- **Jitsi Videobridge**: The core component of the Jitsi Meet project, a Java implementation focused on SFU functionality.
- **Mediasoup**: A very high-performance and flexible Node.js/C++ SFU library, known for being developer-friendly.
- **Pion**: A WebRTC library implemented in Go, which can be used to build SFUs.
- **LiveKit**: A newer open-source WebRTC platform with a built-in high-performance SFU.

### Commercial Platforms (often use SFUs internally)

- Twilio Programmable Video
- Vonage Video API (TokBox)
- Agora
