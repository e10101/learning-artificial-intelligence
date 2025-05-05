# WebRTC Demo

## Feature List

- [x] Get local stream
- [x] Create offer
- [ ] Create Answer

## Demo about Data Channel

Steps

- Create `RTCPeerConnection`
- `createDataChannel`
- `createOffer`
- `createAnswer`

### Make Connection First

In the A client Chrome console, create offer:

```javascript
// Create connection configuration
const pcConfig = {
    iceServers: [
        { urls: 'stun:stun.miwifi.com:3478' },
    ],
};

// Create RTCPeerConnection
const pc = new RTCPeerConnection(pcConfig);
```

In the A client, create data channel:

```javascript
// Create Data Channel
const dc = pc.createDataChannel('chatChannel');

dc.onopen = () => {
    console.log("Data Channel open.");
};
dc.onmessage = (event) => {
    console.log("Received a message:", event.data);
};
dc.onclose = () => {
    console.log("Data Channel close");
}
dc.onerror = (err) => {
    console.log("Got an error of data channel", err);
}
```

```javascript
// Set up ICE candidate handling
const iceCandidates = [];
pc.onicecandidate = (event) => {
    if (event.candidate) {
        console.log("Got a new ICE candidate", event);
        iceCandidates.push(event.candidate);
    } else {
        console.log("ICE candidate gathering completed");
        // Now the localDescription contains all gathered candidates
        console.log("Please copy Offer Sdp to the peer:");
        console.log(JSON.stringify(pc.localDescription));
    }
};

// Create Offer
const offer = await pc.createOffer();
await pc.setLocalDescription(offer);
console.log('LocalDescription', pc.localDescription);

pc.createOffer().then(offer => {
        return pc.setLocalDescription(offer);
    }).then(() => {
        console.log("Waiting for ICE candidate gathering to complete...");
        // The offer with candidates will be logged by the onicecandidate handler
    }).catch(err => {
        console.error('Unable to create offer', err);
    });
```

In the B client Chrome console, create answer:

```javascript
// Create connection configuration
const pcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ],
};

// Create RTCPeerConnection
const pc = new RTCPeerConnection(pcConfig);
```

In the B client, define the event handler first:

```javascript
pc.ondatachannel = (event) => {
    const dc = event.channel;
    window.dataChannel = dc;

    console.log("Received data channel", dc.label);

    dc.onopen = () => {
        console.log("Data Channel open.");
    };
    dc.onmessage = (event) => {
        console.log("Received a message:", event.data);
    };
    dc.onclose = () => {
        console.log("Data Channel close");
    }
    dc.onerror = (err) => {
        console.log("Got an error of data channel", err);
    }
}
```

```javascript

// Set up ICE candidate handling
const iceCandidates = [];
pc.onicecandidate = (event) => {
    if (event.candidate) {
        iceCandidates.push(event.candidate);
    } else {
        console.log("ICE candidate gathering completed");
        // Now the localDescription contains all gathered candidates
        console.log("Please copy Answer Sdp to the sender:");
        console.log(JSON.stringify(pc.localDescription));
    }
};

```

Please copy the offer from client A to B:

```javascript
// Copy the offer and assign, please replace with
// the offer created in the A client console.
const offer = {"type": "offer", "sdp": "..."};
```

Continue in the client B:

```javascript
// Create answer
pc.setRemoteDescription(new RTCSessionDescription(offer))
    .then(() => {
        return pc.createAnswer();
    })
    .then(answer => {
        return pc.setLocalDescription(answer);
    })
    .then(() => {
        console.log("Waiting for ICE candidate gathering to complete...");
        // The answer with candidates will be logged by the onicecandidate handler
    })
    .catch(err => {
        console.error("Unable to create answer", err);
    });
```

In the A client Chrome console, apply the answer:

```javascript
// Please copy the answer from client B, for example:
const answer = {"type": "answer", "sdp": "..."};
```

Continue in the client A:

```javascript
// Set remote description
pc.setRemoteDescription(new RTCSessionDescription(answer))
    .then(() => {
        console.log('Set the Remote Description (Answer) successfully.');
        console.log('Connection should now be establishing...');
    })
    .catch(err => {
        console.error('Unable to set the answer', err);
    });
```

### Check Connection State (Optional)

In both clients, you can monitor the connection state:

```javascript
// Monitor connection state changes
pc.onconnectionstatechange = (event) => {
    console.log('Connection state change:', pc.connectionState);
    switch(pc.connectionState) {
        case 'connected':
            console.log('Connection established successfully!');
            break;
        case 'disconnected':
        case 'failed':
            console.log('Connection failed or disconnected');
            break;
        case 'closed':
            console.log('Connection closed');
            break;
    }
};

// You can also check the ICE connection state
pc.oniceconnectionstatechange = (event) => {
    console.log('ICE connection state:', pc.iceConnectionState);
};
```

### Send Messages

Then in the A client, you can send messages:

```javascript
dc.send("hello");
```

In the B client, you can send messages back too:

```javascript
dataChannel.send("Hi");
```
