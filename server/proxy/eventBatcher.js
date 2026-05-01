/**
 * Batches game events and sends them to the master server
 */

class EventBatcher {
    constructor(masterServerUrl, batchIntervalMs = 5000) {
        this.masterServerUrl = masterServerUrl;
        this.batchIntervalMs = batchIntervalMs;
        this.eventQueue = [];
        this.currentMap = null;
        this.intervalId = null;
    }

    /**
     * Start the batching interval
     */
    start() {
        if (this.intervalId) {
            console.warn('EventBatcher already started');
            return;
        }

        console.log(`EventBatcher started (batch interval: ${this.batchIntervalMs}ms)`);
        this.intervalId = setInterval(() => this.flush(), this.batchIntervalMs);
    }

    /**
     * Stop the batching interval and flush remaining events
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        this.flush();
    }

    /**
     * Add an event to the queue
     * @param {Object} event - Event object from log parser
     */
    addEvent(event) {
        // Enrich event with additional data
        // Note: serverTime and gameTime should be game server's internal time in milliseconds,
        // not Unix timestamps. Since we don't have access to the actual values from logs,
        // we use 0. The database will use received_at (timestamptz) for actual time tracking.
        const enrichedEvent = {
            ...event,
            serverTime: 0, // Game server internal time (not available from logs)
            gameTime: 0, // In-game time (not available from logs)
            map: this.currentMap || 'unknown', // Use 'unknown' if map not yet detected (database requires non-null)
        };

        this.eventQueue.push(enrichedEvent);
    }

    /**
     * Update the current map name
     * @param {string} mapName
     */
    setMap(mapName) {
        this.currentMap = mapName;
        console.log(`Current map: ${mapName}`);
    }

    /**
     * Send all queued events to the master server
     */
    async flush() {
        if (this.eventQueue.length === 0) {
            return;
        }

        const eventsToSend = [...this.eventQueue];
        this.eventQueue = [];

        const url = `${this.masterServerUrl}/api/events`;
        console.log(`Sending ${eventsToSend.length} event(s) to ${url}`);

        // Send events one by one (master server expects individual POSTs)
        for (const event of eventsToSend) {
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(event),
                });

                if (!response.ok) {
                    console.warn(`Failed to send event to ${url}: ${response.status} ${response.statusText}`);
                    console.warn('Event:', JSON.stringify(event));

                    // Try to get error details from response body
                    try {
                        const errorText = await response.text();
                        if (errorText) {
                            console.warn('Error response:', errorText);
                        }
                    } catch (e) {
                        // Ignore errors reading response body
                    }
                }
            } catch (error) {
                console.error(`Error sending event to ${url}:`, error.message);
                console.warn('Event:', JSON.stringify(event));
            }
        }
    }
}

module.exports = EventBatcher;
