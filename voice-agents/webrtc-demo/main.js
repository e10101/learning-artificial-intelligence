let localStream = null;
let localVideo = null;
let remoteVideo = null;
let peerConnection = null;
let sdpOfferTextarea = null;
let sdpAnswerTextarea = null;

// Configuration for STUN/TURN servers
const iceServers = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun.miwifi.com:3478' },
        { urls: 'stun:stun.modulus.gr:3478' },
        {
            urls: 'turn:numb.viagenie.ca',
            credential: 'muazkh',
            username: 'webrtc@live.com'
        }
    ]
};

// Debug the WebRTC connection
const logEvent = (event, data) => {
    console.log(`[WebRTC] ${event}:`, data);
};

const startMedia = async () => {
    try {
        logEvent('Starting media', null);

        // Stop any existing stream
        if (localStream) {
            stopMedia();
        }

        logEvent('Starting media', null);

        localStream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true,
        });

        logEvent('Media started', localStream);

        // Display the local stream in the local video element
        if (localVideo) {
            localVideo.srcObject = localStream;
        }

        logEvent('Media started', localStream);

        // Create peer connection after media is started
        createPeerConnection();

        return localStream;
    } catch (error) {
        console.error('Error starting media:', error);
        alert(`Failed to get media: ${error.message}`);
        throw error;
    }
};

const stopMedia = () => {
    if (!localStream) {
        console.log('No media to stop');
        return;
    }

    // Stop all tracks
    localStream.getTracks().forEach(track => {
        track.stop();
    });

    // Clear the video element
    if (localVideo) {
        localVideo.srcObject = null;
    }

    // Close any existing peer connection
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }

    localStream = null;
    logEvent('Media stopped', null);
};

const createPeerConnection = () => {
    // Close any existing peer connection
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }

    logEvent('Creating peer connection', null);

    // Create a new peer connection
    peerConnection = new RTCPeerConnection(iceServers);

    // Debug event handlers
    peerConnection.addEventListener('negotiationneeded', e => logEvent('negotiationneeded', e));
    peerConnection.addEventListener('icecandidateerror', e => logEvent('icecandidateerror', e));
    peerConnection.addEventListener('signalingstatechange', () => logEvent('signalingstatechange', peerConnection.signalingState));

    // Add event listeners
    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            logEvent('ICE candidate', event.candidate);
        } else {
            logEvent('ICE gathering complete', null);
            // We don't update SDP here anymore to avoid confusion with multiple updates
        }
    };

    peerConnection.onicegatheringstatechange = () => {
        logEvent('ICE gathering state', peerConnection.iceGatheringState);
    };

    peerConnection.ontrack = event => {
        logEvent(`Remote track received (${event.track.kind})`, event.streams[0]);
        if (remoteVideo && event.streams && event.streams[0]) {
            // Check if it's already set to avoid unnecessary updates
            if (remoteVideo.srcObject !== event.streams[0]) {
                remoteVideo.srcObject = event.streams[0];
                logEvent('Set remote video from ontrack event', event.streams[0]);

                // Add event listeners to monitor remote video status
                remoteVideo.onloadedmetadata = () => {
                    logEvent('Remote video metadata loaded', remoteVideo.videoWidth + 'x' + remoteVideo.videoHeight);
                };

                remoteVideo.onplaying = () => {
                    logEvent('Remote video started playing', null);
                };

                // Force play if autoplay doesn't work
                remoteVideo.play().catch(err => {
                    logEvent('Remote video play error, might need user interaction', err.message);
                });
            }
        } else {
            logEvent('Remote track received but missing stream', event.track.kind);
            // Create a new MediaStream if one wasn't provided
            if (remoteVideo && event.track) {
                const stream = new MediaStream();
                stream.addTrack(event.track);
                remoteVideo.srcObject = stream;
                logEvent('Created new MediaStream for remote track', event.track.kind);
            }
        }
    };

    peerConnection.onconnectionstatechange = () => {
        logEvent('Connection state change', peerConnection.connectionState);

        if (peerConnection.connectionState === 'connected') {
            document.body.classList.add('connected');
            document.body.classList.remove('connection-failed');

            // Check if remote video is playing - this should only be a fallback
            setTimeout(() => {
                if (remoteVideo && !remoteVideo.srcObject && peerConnection.getReceivers) {
                    logEvent('Remote video not playing after connection established - attempting recovery', null);
                    const videoReceiver = peerConnection.getReceivers()
                        .find(receiver => receiver.track && receiver.track.kind === 'video');

                    if (videoReceiver) {
                        const stream = new MediaStream();
                        stream.addTrack(videoReceiver.track);
                        remoteVideo.srcObject = stream;
                        logEvent('Recovery: manually set remote video', stream);
                    }
                }
            }, 1000);
        } else if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'disconnected') {
            document.body.classList.remove('connected');
            document.body.classList.add('connection-failed');
        } else {
            document.body.classList.remove('connected');
            document.body.classList.remove('connection-failed');
        }
    };

    peerConnection.oniceconnectionstatechange = () => {
        logEvent('ICE connection state change', peerConnection.iceConnectionState);
    };

    // Add local tracks to the peer connection
    if (localStream) {
        localStream.getTracks().forEach(track => {
            logEvent('Adding local track', track.kind);
            peerConnection.addTrack(track, localStream);
        });
    } else {
        logEvent('No local stream available to add to peer connection', null);
    }

    return peerConnection;
};

const createOffer = async () => {
    try {
        if (!localStream) {
            alert('Please start media before creating an offer');
            return;
        }

        // We don't recreate the peer connection here anymore
        // We assume it was created during startMedia
        if (!peerConnection) {
            logEvent('No peer connection, creating one', null);
            createPeerConnection();
        }

        logEvent('Creating offer', null);

        // Create an offer with explicit transceivers if supported
        if (peerConnection.addTransceiver) {
            try {
                // Add transceivers to explicitly request audio and video
                if (!peerConnection.getTransceivers().length) {
                    logEvent('Adding audio and video transceivers', null);
                    peerConnection.addTransceiver('audio', { direction: 'sendrecv' });
                    peerConnection.addTransceiver('video', { direction: 'sendrecv' });
                }
            } catch (e) {
                logEvent('Error adding transceivers', e);
                // Fall back to createOffer options
            }
        }

        // Create an offer
        const offer = await peerConnection.createOffer({
            offerToReceiveAudio: false,
            offerToReceiveVideo: true
        });

        logEvent('Offer created', offer);

        // Set local description
        await peerConnection.setLocalDescription(offer);
        logEvent('Local description set', peerConnection.localDescription);

        // Display the offer immediately after setting local description
        if (sdpOfferTextarea) {
            sdpOfferTextarea.value = JSON.stringify(peerConnection.localDescription);
        }
    } catch (error) {
        console.error('Error creating offer:', error);
        alert('Failed to create offer: ' + error.message);
    }
};

const createAnswer = async () => {
    try {
        if (!localStream) {
            alert('Please start media before creating an answer');
            return;
        }

        // Get the offer from the textarea
        const offerText = sdpOfferTextarea.value.trim();
        if (!offerText) {
            alert('Please paste an SDP offer first');
            return;
        }

        let offer;
        try {
            offer = JSON.parse(offerText);
        } catch (e) {
            alert('Invalid SDP format. Please paste a valid JSON SDP offer.');
            return;
        }

        // We'll reuse the existing peer connection or create a new one if needed
        if (!peerConnection) {
            logEvent('No peer connection, creating one', null);
            createPeerConnection();
        } else {
            // Reset the connection to start fresh
            logEvent('Resetting peer connection for answer', null);
            createPeerConnection();
        }

        logEvent('Setting remote description (offer)', offer);

        // Set the remote description (offer)
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        logEvent('Remote description set', offer);

        // Create an answer
        logEvent('Creating answer', null);
        const answer = await peerConnection.createAnswer();
        logEvent('Answer created', answer);

        // Set local description (answer)
        await peerConnection.setLocalDescription(answer);
        logEvent('Local description set', answer);

        // Display the answer immediately after setting local description
        if (sdpAnswerTextarea) {
            sdpAnswerTextarea.value = JSON.stringify(peerConnection.localDescription);
        }
    } catch (error) {
        console.error('Error creating answer:', error);
        alert('Failed to create answer: ' + error.message);
    }
};

const applyAnswer = async () => {
    try {
        if (!peerConnection) {
            alert('Please create an offer first before applying an answer');
            return;
        }

        // Get the answer from the textarea
        const answerText = sdpAnswerTextarea.value.trim();
        if (!answerText) {
            alert('Please paste an SDP answer first');
            return;
        }

        let answer;
        try {
            answer = JSON.parse(answerText);
        } catch (e) {
            alert('Invalid SDP format. Please paste a valid JSON SDP answer.');
            return;
        }

        // Check peer connection state
        if (peerConnection.signalingState !== 'have-local-offer') {
            logEvent('Invalid signaling state', peerConnection.signalingState);
            alert(`Peer connection is in an invalid state: ${peerConnection.signalingState}. Expected 'have-local-offer'.`);
            return;
        }

        logEvent('Setting remote description (answer)', answer);

        // Set the remote description (answer)
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        logEvent('Remote answer applied', null);

        // Add a more aggressive recovery for video display
        setTimeout(() => {
            if (remoteVideo && (!remoteVideo.srcObject || remoteVideo.paused)) {
                logEvent('Attempting recovery for remote video after applying answer', null);

                if (peerConnection.getReceivers) {
                    const videoReceiver = peerConnection.getReceivers()
                        .find(receiver => receiver.track && receiver.track.kind === 'video');

                    if (videoReceiver && videoReceiver.track) {
                        const stream = new MediaStream();
                        stream.addTrack(videoReceiver.track);
                        remoteVideo.srcObject = stream;
                        remoteVideo.play().catch(e => {
                            logEvent('Recovery play attempt failed, may need user interaction', e);
                        });
                        logEvent('Applied recovery: manually set remote video from receiver', stream);
                    }
                }
            }
        }, 1000);

        // Provide user feedback
        alert('Answer applied. Connection should establish shortly... Click on the remote video area if it stays black.');
    } catch (error) {
        console.error('Error applying answer:', error);
        alert('Failed to apply answer: ' + error.message);
    }
};

let init = async () => {
    logEvent('Initializing', null);

    // Get references to video elements and other UI
    localVideo = document.getElementById('localVideo');
    remoteVideo = document.getElementById('remoteVideo');
    sdpOfferTextarea = document.getElementById('sdpOffer');
    sdpAnswerTextarea = document.getElementById('sdpAnswer');

    // Add click handler to remote video to help with autoplay issues
    if (remoteVideo) {
        remoteVideo.addEventListener('click', () => {
            if (remoteVideo.paused) {
                logEvent('Manual play of remote video attempted', null);
                remoteVideo.play().catch(err => {
                    logEvent('Remote video play error after click', err.message);
                });
            }
        });
    }

    // Reset connection status classes
    document.body.classList.remove('connected');
    document.body.classList.remove('connection-failed');

    // Connect buttons to functions
    const startButton = document.getElementById('startButton');
    const stopButton = document.getElementById('stopButton');
    const createOfferButton = document.getElementById('createOfferButton');
    const createAnswerButton = document.getElementById('createAnswerButton');
    const applyAnswerButton = document.getElementById('applyAnswerButton');

    startButton.addEventListener('click', async () => {
        logEvent('Start button clicked', null);
        await startMedia();
    });

    stopButton.addEventListener('click', () => {
        logEvent('Stop button clicked', null);
        stopMedia();
    });

    createOfferButton.addEventListener('click', async () => {
        logEvent('Create offer button clicked', null);
        await createOffer();
    });

    createAnswerButton.addEventListener('click', async () => {
        logEvent('Create answer button clicked', null);
        await createAnswer();
    });

    applyAnswerButton.addEventListener('click', async () => {
        logEvent('Apply answer button clicked', null);
        await applyAnswer();
    });
}

// Wait for DOM to load before initializing
document.addEventListener('DOMContentLoaded', init);