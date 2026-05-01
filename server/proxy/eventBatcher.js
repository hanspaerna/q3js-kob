/**
 * Batches game events and sends them to the master server
 */

// Standard Quake 3 Arena bot names
const STANDARD_BOT_NAMES = [
    'Sarge', 'Grunt', 'Major', 'Visor', 'Razor', 'Bitterman', 'Crash', 'Orbb',
    'Slash', 'Doom', 'Phobos', 'Hunter', 'Ranger', 'Wrack', 'Bones', 'Sorlag',
    'Klesk', 'Tankjr', 'Mynx', 'Anarki', 'Hossman', 'Gorre', 'Uriel', 'Angel',
    'Lucy', 'Patriot', 'Xaero', 'Keel', 'Cadavre', 'Daemia', 'Stripe', 'Grism',
    'Tig', 'Sly'
];

class EventBatcher {
    constructor(masterServerUrl, batchIntervalMs = 5000, filterBots = true, apiToken = null) {
        this.masterServerUrl = masterServerUrl;
        this.batchIntervalMs = batchIntervalMs;
        this.filterBots = filterBots;
        this.apiToken = apiToken;
        this.eventQueue = [];
        this.currentMap = null;
        this.intervalId = null;
        this.filteredCount = 0; // Track how many bot events were filtered

        // Log token status for debugging
        if (!this.apiToken || this.apiToken.trim() === '') {
            console.warn('EventBatcher initialized WITHOUT API token - requests will fail!');
        } else {
            console.log('EventBatcher initialized with API token');
        }
    }

    /**
     * Check if a player name is a bot
     * @param {string} name - Player name
     * @returns {boolean} - True if the name is a bot
     */
    isBot(name) {
        if (!name) return false;

        // Case-insensitive comparison with standard bot names
        const normalizedName = name.toLowerCase();
        return STANDARD_BOT_NAMES.some(botName => botName.toLowerCase() === normalizedName);
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
        // Filter bot events if enabled
        if (this.filterBots) {
            if (event.event === 'kill') {
                // Filter kills where killer or victim is a bot
                const killerIsBot = this.isBot(event.killer?.name);
                const victimIsBot = this.isBot(event.victim?.name);

                if (killerIsBot || victimIsBot) {
                    this.filteredCount++;
                    if (this.filteredCount === 1 || this.filteredCount % 10 === 0) {
                        console.log(`Filtered bot event (total: ${this.filteredCount}): ${event.killer?.name} killed ${event.victim?.name}`);
                    }
                    return; // Skip this event
                }
            } else if (event.event === 'join' || event.event === 'leave') {
                // Filter join/leave events for bots
                const playerIsBot = this.isBot(event.player?.name);

                if (playerIsBot) {
                    this.filteredCount++;
                    if (this.filteredCount === 1 || this.filteredCount % 10 === 0) {
                        console.log(`Filtered bot event (total: ${this.filteredCount}): ${event.player?.name} ${event.event}`);
                    }
                    return; // Skip this event
                }
            }
        }

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
                const headers = {
                    'Content-Type': 'application/json',
                };

                // Add Authorization header if API token is configured
                if (this.apiToken) {
                    headers['Authorization'] = `Bearer ${this.apiToken}`;
                }

                const response = await fetch(url, {
                    method: 'POST',
                    headers,
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
