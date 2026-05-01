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
        const enrichedEvent = {
            ...event,
            serverTime: Date.now(),
            gameTime: 0, // We don't have access to game time from logs
        };

        // Add map if available
        if (this.currentMap) {
            enrichedEvent.map = this.currentMap;
        }

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

        console.log(`Sending ${eventsToSend.length} event(s) to master server`);

        // Send events one by one (master server expects individual POSTs)
        for (const event of eventsToSend) {
            try {
                const response = await fetch(`${this.masterServerUrl}/api/events`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(event),
                });

                if (!response.ok) {
                    console.warn(`Failed to send event: ${response.status} ${response.statusText}`);
                    console.warn('Event:', JSON.stringify(event));
                }
            } catch (error) {
                console.error('Error sending event to master server:', error.message);
                console.warn('Event:', JSON.stringify(event));
            }
        }
    }
}

module.exports = EventBatcher;
