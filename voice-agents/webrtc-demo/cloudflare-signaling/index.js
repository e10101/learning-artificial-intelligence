// src/index.js (Entry Worker)
export default {
    async fetch(request, env, ctx) {
        // Handle CORS preflight requests
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Upgrade, Connection, Sec-WebSocket-Key, Sec-WebSocket-Version, Sec-WebSocket-Extensions',
                    'Access-Control-Max-Age': '86400',
                }
            });
        }

        const url = new URL(request.url);
        console.log('Incoming request:', {
            method: request.method,
            url: url.toString(),
            headers: Object.fromEntries(request.headers.entries())
        });

        // Health check endpoint
        if (url.pathname === '/health') {
            return new Response('OK', {
                headers: {
                    'Content-Type': 'text/plain',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                }
            });
        }

        // Assume room ID is in the path, e.g., /room/my-room-id
        const match = url.pathname.match(/^\/room\/([a-zA-Z0-9_-]+)/);
        if (!match) {
            return new Response("Not found", {
                status: 404,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                }
            });
        }
        const roomId = match[1];

        // Check if it's a WebSocket upgrade request
        const upgradeHeader = request.headers.get("Upgrade");
        const connectionHeader = request.headers.get("Connection");
        const secWebSocketKey = request.headers.get("Sec-WebSocket-Key");
        const secWebSocketVersion = request.headers.get("Sec-WebSocket-Version");

        console.log('WebSocket upgrade headers:', {
            upgrade: upgradeHeader,
            connection: connectionHeader,
            secWebSocketKey,
            secWebSocketVersion
        });

        if (!upgradeHeader || !connectionHeader || !secWebSocketKey ||
            upgradeHeader.toLowerCase() !== "websocket" ||
            !connectionHeader.toLowerCase().includes("upgrade") ||
            secWebSocketVersion !== "13") {
            console.log('WebSocket upgrade failed:', {
                hasUpgrade: !!upgradeHeader,
                hasConnection: !!connectionHeader,
                hasKey: !!secWebSocketKey,
                upgradeValue: upgradeHeader,
                connectionValue: connectionHeader,
                version: secWebSocketVersion
            });
            return new Response("Expected WebSocket upgrade", {
                status: 426,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Upgrade': 'websocket',
                    'Connection': 'Upgrade',
                }
            });
        }

        try {
            // Get Durable Object ID
            const doId = env.SIGNALING_ROOM.idFromName(roomId);
            // Get Durable Object stub
            const stub = env.SIGNALING_ROOM.get(doId);
            // Forward the request to the Durable Object
            return await stub.fetch(request);
        } catch (error) {
            console.error('Error handling WebSocket:', error);
            return new Response(`Internal Server Error: ${error.message}`, {
                status: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'text/plain',
                }
            });
        }
    },
};

// src/room.js (Durable Object - assuming filename matches class_name or mapped through build step)
// Note: Specific API may change with Cloudflare updates, please refer to latest documentation
export class SignalingRoom {
    constructor(state, env) {
        this.state = state;
        this.env = env;
        this.sessions = []; // Store WebSocket connections
        this.roomId = state.id.toString(); // Initialize roomId from state ID
        this.heartbeatInterval = 30000; // 30 seconds heartbeat interval
    }

    // Handle requests from the entry Worker
    async fetch(request) {
        // Handle WebSocket upgrade
        const upgradeHeader = request.headers.get("Upgrade");
        if (upgradeHeader && upgradeHeader.toLowerCase() === "websocket") {
            console.log('DO: Creating WebSocket pair');
            // Create WebSocket pair
            const webSocketPair = new WebSocketPair();
            const [client, server] = Object.values(webSocketPair);

            // Handle the server side of the WebSocket
            await this.handleWebSocketSession(server);

            // Return the client side with appropriate headers
            const response = new Response(null, {
                status: 101,
                webSocket: client,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Upgrade': 'websocket',
                    'Connection': 'Upgrade',
                    'Sec-WebSocket-Accept': request.headers.get('Sec-WebSocket-Key'),
                }
            });
            console.log('DO: Returning WebSocket response with headers:', Object.fromEntries(response.headers.entries()));
            return response;
        }

        return new Response("Expected WebSocket", {
            status: 426,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Upgrade': 'websocket',
                'Connection': 'Upgrade',
            }
        });
    }

    // Handle a single WebSocket session
    async handleWebSocketSession(websocket) {
        try {
            console.log('DO: Accepting WebSocket connection');
            websocket.accept();
            this.sessions.push(websocket);

            console.log(`[${this.roomId}] WebSocket connected. Total: ${this.sessions.length}`);

            // Send immediate welcome message
            websocket.send(JSON.stringify({
                type: 'welcome',
                message: 'Connected to signaling server',
                roomId: this.roomId,
                timestamp: new Date().toISOString()
            }));

            // Set up heartbeat
            const heartbeatInterval = setInterval(() => {
                if (websocket.readyState === 1) { // OPEN
                    try {
                        websocket.send(JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() }));
                    } catch (error) {
                        console.error(`[${this.roomId}] Heartbeat failed:`, error);
                        this.removeSession(websocket);
                        clearInterval(heartbeatInterval);
                    }
                } else {
                    clearInterval(heartbeatInterval);
                }
            }, this.heartbeatInterval);

            // Set up message listener
            websocket.addEventListener("message", async (event) => {
                try {
                    let data = event.data;
                    let parsedData;

                    try {
                        parsedData = JSON.parse(data);
                    } catch (e) {
                        parsedData = { type: 'message', content: data };
                    }

                    // Handle ping/pong
                    if (parsedData.type === 'pong') {
                        return;
                    }

                    console.log(`[${this.roomId}] Message received:`, parsedData);

                    // Broadcast to others
                    await this.broadcast(JSON.stringify({
                        ...parsedData,
                        timestamp: new Date().toISOString()
                    }), websocket);

                } catch (error) {
                    console.error(`[${this.roomId}] Error processing message:`, error);
                    websocket.send(JSON.stringify({
                        type: 'error',
                        message: error.message,
                        timestamp: new Date().toISOString()
                    }));
                }
            });

            // Set up close listener
            websocket.addEventListener("close", (event) => {
                console.log(`[${this.roomId}] WebSocket closed: ${event.code} ${event.reason}`);
                clearInterval(heartbeatInterval);
                this.removeSession(websocket);
            });

            // Set up error listener
            websocket.addEventListener("error", (event) => {
                console.error(`[${this.roomId}] WebSocket error:`, event);
                clearInterval(heartbeatInterval);
                this.removeSession(websocket);
            });

        } catch (error) {
            console.error(`[${this.roomId}] Error in handleWebSocketSession:`, error);
            if (websocket.readyState === 1) {
                websocket.close(1011, "Internal Server Error");
            }
        }
    }

    // Broadcast message to all other clients in the room
    async broadcast(message, sender = null) {
        const promises = this.sessions.map(async (session) => {
            if (session !== sender && session.readyState === 1) { // OPEN
                try {
                    session.send(message);
                } catch (error) {
                    console.error(`[${this.roomId}] Broadcast error:`, error);
                    this.removeSession(session);
                }
            }
        });

        await Promise.all(promises);
    }

    // Remove WebSocket from session list
    removeSession(websocket) {
        const index = this.sessions.indexOf(websocket);
        if (index !== -1) {
            this.sessions.splice(index, 1);
            console.log(`[${this.roomId}] WebSocket removed. Total: ${this.sessions.length}`);

            // Notify others
            this.broadcast(JSON.stringify({
                type: 'user-left',
                timestamp: new Date().toISOString(),
                totalUsers: this.sessions.length
            }));
        }
    }
}