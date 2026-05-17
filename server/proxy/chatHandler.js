const WebSocket = require('ws');
const fs = require('fs');

const CHAT_HISTORY_MAX = 10000;
const DEFAULT_PERSISTENCE_PATH = '/server/persist/chat-history.json';

class ChatHandler {
    constructor(persistencePath = DEFAULT_PERSISTENCE_PATH) {
        this.persistencePath = persistencePath;
        this.history = [];
        this.clients = new Set();
        this.saveTimeout = null;

        this.load();
    }

    /**
     * Load chat history from file
     */
    load() {
        try {
            if (fs.existsSync(this.persistencePath)) {
                const data = fs.readFileSync(this.persistencePath, 'utf8');
                this.history = JSON.parse(data);
                console.log(`[CHAT] Loaded ${this.history.length} messages from ${this.persistencePath}`);
            }
        } catch (err) {
            console.error(`[CHAT] Failed to load history:`, err.message);
            this.history = [];
        }
    }

    /**
     * Save chat history to file (debounced)
     */
    save() {
        // Debounce saves to avoid excessive disk writes
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        this.saveTimeout = setTimeout(() => {
            try {
                fs.writeFileSync(this.persistencePath, JSON.stringify(this.history));
            } catch (err) {
                console.error(`[CHAT] Failed to save history:`, err.message);
            }
        }, 1000);
    }

    /**
     * Extract chat message from a log line
     * @param {string} line - Log line from server
     * @returns {object|null} - Chat message object or null
     */
    extractMessage(line) {
        // Match "say: PlayerName: message" pattern
        const sayMatch = line.match(/^say:\s*(.+)$/);
        if (sayMatch) {
            return {
                timestamp: new Date().toISOString(),
                text: sayMatch[1],
            };
        }

        // Match "Rcon from <ip>: say <message>" pattern
        const rconMatch = line.match(/^Rcon from [^:]+:\s*say\s+(.+)$/);
        if (rconMatch) {
            return {
                timestamp: new Date().toISOString(),
                text: rconMatch[1],
            };
        }

        return null;
    }

    /**
     * Process a log line, extract chat if present, store and broadcast
     * @param {string} line - Log line from server
     */
    processLine(line) {
        const message = this.extractMessage(line);
        if (message) {
            // Add to history
            this.history.push(message);
            if (this.history.length > CHAT_HISTORY_MAX) {
                this.history.shift();
            }

            // Persist to disk
            this.save();

            // Broadcast to connected clients
            this.broadcast(message);
        }
    }

    /**
     * Broadcast a message to all connected WebSocket clients
     * @param {object} message - Chat message to broadcast
     */
    broadcast(message) {
        const json = JSON.stringify(message);
        for (const client of this.clients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(json);
            }
        }
    }

    /**
     * Handle new WebSocket connection for chat
     * @param {WebSocket} ws - WebSocket client
     */
    handleConnection(ws) {
        this.clients.add(ws);
        console.log(`[CHAT] Client connected (${this.clients.size} total)`);

        ws.on('close', () => {
            this.clients.delete(ws);
            console.log(`[CHAT] Client disconnected (${this.clients.size} total)`);
        });

        ws.on('error', () => {
            this.clients.delete(ws);
        });
    }

    /**
     * Get chat history
     * @param {number} limit - Max number of messages to return
     * @returns {Array} - Array of chat messages
     */
    getHistory(limit = CHAT_HISTORY_MAX) {
        const count = Math.min(limit, this.history.length);
        return this.history.slice(-count);
    }
}

module.exports = ChatHandler;
