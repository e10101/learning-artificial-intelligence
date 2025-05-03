let localStream = null;
let localVideo = null;
let remoteVideo = null;
let peerConnection = null;
let sdpOfferTextarea = null;

// Configuration for STUN/TURN servers
const iceServers = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
};

const startMedia = async () => {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
        });

        // Display the local stream in the local video element
        if (localVideo) {
            localVideo.srcObject = localStream;
        }

        console.log('Media started', localStream);
        return localStream;
    } catch (error) {
        console.error('Error starting media:', error);
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

    localStream = null;
    console.log('Media stopped');
};

const createPeerConnection = () => {
    // Close any existing peer connection
    if (peerConnection) {
        peerConnection.close();
    }

    // Create a new peer connection
    peerConnection = new RTCPeerConnection(iceServers);

    // Add event listeners
    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            console.log('ICE candidate', event.candidate);
        } else {
            console.log('ICE gathering complete');
            // Display the complete SDP offer
            if (sdpOfferTextarea && peerConnection.localDescription) {
                sdpOfferTextarea.value = JSON.stringify(peerConnection.localDescription);
            }
        }
    };

    peerConnection.ontrack = event => {
        console.log('Remote track received', event.streams[0]);
        if (remoteVideo) {
            remoteVideo.srcObject = event.streams[0];
        }
    };

    // Add local tracks to the peer connection
    if (localStream) {
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
    } else {
        console.warn('No local stream available to add to peer connection');
    }

    return peerConnection;
};

const createOffer = async () => {
    if (!localStream) {
        alert('Please start media before creating an offer');
        return;
    }

    try {
        // Ensure we have a peer connection
        createPeerConnection();

        // Create an offer
        const offer = await peerConnection.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
        });

        // Set local description
        await peerConnection.setLocalDescription(offer);

        console.log('Offer created', offer);

        // The complete SDP will be set in the onicecandidate callback when ice gathering is complete
        // But we can show the initial offer now
        if (sdpOfferTextarea) {
            sdpOfferTextarea.value = JSON.stringify(offer);
        }
    } catch (error) {
        console.error('Error creating offer:', error);
        alert('Failed to create offer: ' + error.message);
    }
};

let init = async () => {
    console.log("init");

    // Get references to video elements and other UI
    localVideo = document.getElementById('localVideo');
    remoteVideo = document.getElementById('remoteVideo');
    sdpOfferTextarea = document.getElementById('sdpOffer');

    // Connect buttons to functions
    const startButton = document.getElementById('startButton');
    const stopButton = document.getElementById('stopButton');
    const createOfferButton = document.getElementById('createOfferButton');

    startButton.addEventListener('click', async () => {
        console.log('Start button clicked');
        await startMedia();
    });

    stopButton.addEventListener('click', () => {
        console.log('Stop button clicked');
        stopMedia();
    });

    createOfferButton.addEventListener('click', async () => {
        console.log('Create offer button clicked');
        await createOffer();
    });
}

// Wait for DOM to load before initializing
document.addEventListener('DOMContentLoaded', init);