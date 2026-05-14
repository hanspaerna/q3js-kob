/**
 * Parses Quake 3 / CPMA server log output to extract game events
 */

class LogParser {
    constructor() {
        // Map client numbers to player names
        this.playerNames = new Map();
    }

    /**
     * Strip Quake 3 color codes from a player name
     * Color codes are in format: ^0-^9
     * @param {string} name - Player name with color codes
     * @returns {string} - Clean player name
     */
    stripColorCodes(name) {
        return name.replace(/\^\d/g, '');
    }

    /**
     * Parse a single log line and return an event object if found
     * @param {string} line - Log line from server stdout/stderr
     * @returns {Object|null} - Event object or null if no event found
     */
    parseLine(line) {
        // Remove timestamp prefix if present (format: "0:00 " or "12:34 ")
        const cleanLine = line.replace(/^\d+:\d+\s+/, '');

        // ClientUserinfoChanged: <clientNum> <userinfo>
        // Example: ClientUserinfoChanged: 0 \n\Sul-Matuul\t\0\model\sarge\hmodel\sarge\...
        const userinfoMatch = cleanLine.match(/ClientUserinfoChanged:\s*(\d+)\s+(.+)/);
        if (userinfoMatch) {
            const clientNum = parseInt(userinfoMatch[1]);
            const userinfo = userinfoMatch[2];

            // Extract name from userinfo string (format: \key\value\key\value...)
            const nameMatch = userinfo.match(/\\n\\([^\\]+)/);
            if (nameMatch) {
                this.playerNames.set(clientNum, nameMatch[1]);
            }
            return null; // Not an event, just tracking player info
        }

        // CPMA join: "PlayerName^7 has passed authorization."
        const cpmaJoinMatch = cleanLine.match(/^(.+?)\s+has passed authorization\.$/);
        if (cpmaJoinMatch) {
            const rawName = cpmaJoinMatch[1].trim();
            const playerName = this.stripColorCodes(rawName);

            return {
                event: 'join',
                player: {
                    clientNum: 0, // We don't know the client number from this log
                    name: playerName
                }
            };
        }

        // CPMA disconnect: broadcast: print "PlayerName^7 disconnected\n"
        const cpmaDisconnectMatch = cleanLine.match(/broadcast:\s*print\s+"(.+?)\s+disconnected\\n"/);
        if (cpmaDisconnectMatch) {
            const rawName = cpmaDisconnectMatch[1].trim();
            const playerName = this.stripColorCodes(rawName);

            return {
                event: 'leave',
                player: {
                    clientNum: 0, // We don't know the client number from this log
                    name: playerName
                }
            };
        }

        // Standard Q3 ClientBegin: <clientNum>
        // This is when a player actually joins the game (after connecting)
        const beginMatch = cleanLine.match(/ClientBegin:\s*(\d+)/);
        if (beginMatch) {
            const clientNum = parseInt(beginMatch[1]);
            const playerName = this.playerNames.get(clientNum);

            if (playerName) {
                return {
                    event: 'join',
                    player: {
                        clientNum,
                        name: playerName
                    }
                };
            }
        }

        // Standard Q3 ClientDisconnect: <clientNum>
        const disconnectMatch = cleanLine.match(/ClientDisconnect:\s*(\d+)/);
        if (disconnectMatch) {
            const clientNum = parseInt(disconnectMatch[1]);
            const playerName = this.playerNames.get(clientNum);

            if (playerName) {
                const event = {
                    event: 'leave',
                    player: {
                        clientNum,
                        name: playerName
                    }
                };

                // Clean up after disconnect
                this.playerNames.delete(clientNum);

                return event;
            }
        }

        // Kill: <killer> <victim> <mod>: <killer_name> killed <victim_name> by <weapon>
        // Example: Kill: 0 1 6: Sul-Matuul killed tester000 by MOD_ROCKET
        // CPMA may add extra info like "8 in arena 0" at the end
        const killMatch = cleanLine.match(/Kill:\s*(\d+)\s+(\d+)\s+(\d+):\s*(.+?)\s+killed\s+(.+?)\s+by\s+(\S+)/);
        if (killMatch) {
            const killerNum = parseInt(killMatch[1]);
            const victimNum = parseInt(killMatch[2]);
            const mod = parseInt(killMatch[3]);
            const killerName = killMatch[4];
            const victimName = killMatch[5];
            const weapon = killMatch[6];

            return {
                event: 'kill',
                killer: {
                    clientNum: killerNum,
                    name: killerName
                },
                victim: {
                    clientNum: victimNum,
                    name: victimName
                },
                meansOfDeath: mod
            };
        }

        return null; // Line doesn't match any pattern
    }

    /**
     * Extract map name from a log line if present
     * @param {string} line - Log line from server
     * @returns {string|null} - Map name or null
     */
    extractMapName(line) {
        // Remove timestamp prefix if present
        const cleanLine = line.replace(/^\d+:\d+\s+/, '');

        // InitGame: contains all game settings including mapname
        // Example: InitGame: \sv_maxclients\16\mapname\q3dm6\gamename\cpma\...
        const initGameMatch = cleanLine.match(/InitGame:.*\\mapname\\([^\\]+)/);
        if (initGameMatch) {
            return initGameMatch[1];
        }

        // Also check for map loading messages
        // Example: "Loading map q3dm17" or "map: q3dm17"
        const mapLoadMatch = cleanLine.match(/(?:Loading map|map:)\s+(\S+)/i);
        if (mapLoadMatch) {
            return mapLoadMatch[1];
        }

        return null;
    }

    /**
     * Extract game type from a log line if present
     * @param {string} line - Log line from server
     * @returns {number|null} - Game type number or null
     */
    extractGameType(line) {
        // Remove timestamp prefix if present
        const cleanLine = line.replace(/^\d+:\d+\s+/, '');

        // InitGame: contains g_gametype
        // Example: InitGame: \sv_maxclients\16\mapname\q3dm6\g_gametype\0\...
        const initGameMatch = cleanLine.match(/InitGame:.*\\g_gametype\\(\d+)/);
        if (initGameMatch) {
            return parseInt(initGameMatch[1], 10);
        }

        return null;
    }

    /**
     * Reset the parser state (clear player tracking)
     */
    reset() {
        this.playerNames.clear();
    }
}

module.exports = LogParser;
