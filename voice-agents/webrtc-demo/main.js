let localStream = null;
let localVideo = null;
let remoteVideo = null;

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

let init = async () => {
    console.log("init");

    // Get references to video elements
    localVideo = document.getElementById('localVideo');
    remoteVideo = document.getElementById('remoteVideo');

    // Connect buttons to functions
    const startButton = document.getElementById('startButton');
    const stopButton = document.getElementById('stopButton');

    startButton.addEventListener('click', async () => {
        console.log('Start button clicked');
        await startMedia();
    });

    stopButton.addEventListener('click', () => {
        console.log('Stop button clicked');
        stopMedia();
    });
}

// Wait for DOM to load before initializing
document.addEventListener('DOMContentLoaded', init);