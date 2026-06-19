const dgram = require('dgram');
const fs = require('fs');
const http = require('http');
const WebSocket = require('ws');
const { spawn } = require('child_process');
const readline = require('readline');
const { env } = require('./env');
const LogParser = require('./logParser');
const EventBatcher = require('./eventBatcher');
const ChatHandler = require('./chatHandler');
const MatchResultParser = require('./matchResultParser');

const chatHandler = new ChatHandler();
const matchResultParser = new MatchResultParser();

const MASTER_SERVER_BASE = env.MASTER_SERVER_BASE;
const SECONDARY_MASTER_SERVER_BASE = env.SECONDARY_MASTER_SERVER_BASE;
const HEARTBEAT_INTERVAL_MS = env.HEARTBEAT_INTERVAL_MS;
const TARGET_HOST = env.TARGET_HOST;
const TARGET_PORT = env.TARGET_PORT;
const PROXY_PORT = env.PROXY_PORT;
const SECURE = env.SECURE;
const ENABLE_LOG_PARSING = env.ENABLE_LOG_PARSING;
const EVENT_BATCH_INTERVAL_MS = env.EVENT_BATCH_INTERVAL_MS;
const SERVER_BINARY_PATH = env.SERVER_BINARY_PATH;
const SERVER_ARGS = env.SERVER_ARGS;
const FILTER_BOT_EVENTS = env.FILTER_BOT_EVENTS;
const API_TOKEN = env.API_TOKEN;
const LOCATION = env.LOCATION;

let publishHost = env.PUBLISH_HOST;
const publishPort = env.PUBLISH_PORT || PROXY_PORT;

const HEARTBEAT_URL = `${MASTER_SERVER_BASE}/api/servers/heartbeat`;
const SECONDARY_HEARTBEAT_URL = SECONDARY_MASTER_SERVER_BASE
    ? `${SECONDARY_MASTER_SERVER_BASE}/api/servers/heartbeat`
    : null;
const MAX_WS_BUFFERED_BYTES = 1_000_000;

let heartbeatBodyJson = null;
let heartbeatInFlight = false;

function rebuildHeartbeatBody() {
    if (!publishHost) {
        heartbeatBodyJson = null;
        return;
    }

    heartbeatBodyJson = JSON.stringify({
        targetHost: publishHost,
        proxyPort: publishPort,
        targetPort: TARGET_PORT,
        secure: SECURE,
        location: LOCATION,
    });
}

async function initPublishHost() {
    if (publishHost) {
        rebuildHeartbeatBody();
        return;
    }

    const res = await fetch('https://api.ipify.org');
    publishHost = await res.text();
    rebuildHeartbeatBody();
    console.log(`Resolved public IP: ${publishHost}`);
}

async function sendHeartbeat() {
    if (!heartbeatBodyJson || heartbeatInFlight) {
        return;
    }

    heartbeatInFlight = true;
    try {
        // Send heartbeat to primary master server
        const primaryPromise = fetch(HEARTBEAT_URL, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_TOKEN}` },
            body: heartbeatBodyJson,
        }).then(res => {
            if (!res.ok) {
                console.warn('Primary heartbeat failed:', res.status, res.statusText);
            }
        }).catch(e => {
            console.warn('Primary heartbeat error:', e.message);
        });

        // Send heartbeat to secondary master server if configured
        let secondaryPromise = Promise.resolve();
        if (SECONDARY_HEARTBEAT_URL) {
            secondaryPromise = fetch(SECONDARY_HEARTBEAT_URL, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: heartbeatBodyJson,
            }).then(res => {
                if (!res.ok) {
                    console.warn('Secondary heartbeat failed:', res.status, res.statusText);
                }
            }).catch(e => {
                console.warn('Secondary heartbeat error:', e.message);
            });
        }

        // Wait for both heartbeats to complete
        await Promise.all([primaryPromise, secondaryPromise]);
    } finally {
        heartbeatInFlight = false;
    }
}

async function heartbeatLoop() {
    for (;;) {
        await sendHeartbeat();
        await new Promise(resolve => setTimeout(resolve, HEARTBEAT_INTERVAL_MS));
    }
}

function setCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, statusCode, payload) {
    setCorsHeaders(res);
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(payload));
}

// Query game server for status via UDP getstatus
function queryServerStatus(timeout = 3000) {
    return new Promise((resolve, reject) => {
        const socket = dgram.createSocket('udp4');
        const query = Buffer.from([0xff, 0xff, 0xff, 0xff, ...Buffer.from('getstatus xxx\n')]);
        let responded = false;

        const timer = setTimeout(() => {
            if (!responded) {
                responded = true;
                socket.close();
                reject(new Error('Server query timed out'));
            }
        }, timeout);

        socket.on('message', (msg) => {
            if (responded) return;
            responded = true;
            clearTimeout(timer);
            socket.close();

            // Response format: \xff\xff\xff\xffstatusResponse\n<infostring>\n<players>
            const response = msg.toString('latin1');
            if (!response.startsWith('\xff\xff\xff\xffstatusResponse\n')) {
                reject(new Error('Invalid response from server'));
                return;
            }

            // Parse the info string (key\value\key\value format)
            const lines = response.slice(4).split('\n');
            const infoLine = lines[1] || '';
            const info = {};
            const parts = infoLine.split('\\');
            for (let i = 1; i < parts.length - 1; i += 2) {
                info[parts[i]] = parts[i + 1];
            }

            resolve(info);
        });

        socket.on('error', (err) => {
            if (!responded) {
                responded = true;
                clearTimeout(timer);
                socket.close();
                reject(err);
            }
        });

        // Bind to ephemeral port before sending
        socket.bind(0, () => {
            console.log(`[QUERY] Sending getstatus to ${TARGET_HOST}:${TARGET_PORT}`);
            socket.send(query, TARGET_PORT, TARGET_HOST);
        });
    });
}

const httpServer = http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
        setCorsHeaders(res);
        res.writeHead(204);
        res.end();
        return;
    }

    const path = req.url || '/';

    if (req.method === 'GET' && path === '/healthz') {
        sendJson(res, 200, { ok: true });
        return;
    }

    if (req.method === 'GET' && path.startsWith('/matchResult')) {
        const matchResult = matchResultParser.parse();
        sendJson(res, 200, matchResult);
        return;
    }

    if (req.method === 'GET' && path.startsWith('/chat')) {
        const limit = 100;
        sendJson(res, 200, chatHandler.getHistory(limit));
        return;
    }

    if (req.method === 'GET' && path === '/maplist') {
        try {
            const serverInfo = await queryServerStatus();
            const gameType = parseInt(serverInfo.g_gametype, 10);

            if (isNaN(gameType)) {
                sendJson(res, 503, { error: 'Could not determine game type from server' });
                return;
            }

            const maplistFile = GAMETYPE_MAPLIST_FILES[gameType];
            if (!maplistFile) {
                sendJson(res, 404, { error: `No maplist configured for game type ${gameType}` });
                return;
            }

            fs.readFile(maplistFile, 'utf8', (err, data) => {
                if (err) {
                    console.error(`[MAPLIST] Failed to read ${maplistFile}:`, err.message);
                    sendJson(res, 500, { error: 'Failed to read maplist file' });
                    return;
                }

                // Parse file into array of map names, preserving order
                const maps = data
                    .split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0 && !line.startsWith('//'));

                sendJson(res, 200, maps);
            });
        } catch (err) {
            console.error(`[MAPLIST] Server query failed:`, err.message);
            sendJson(res, 503, { error: 'Failed to query server status' });
        }
        return;
    }

    sendJson(res, 404, { error: 'Not found' });
});

// WebSocket server for game UDP proxy
const wssGame = new WebSocket.Server({ noServer: true, perMessageDeflate: false });

// WebSocket server for chat
const wssChat = new WebSocket.Server({ noServer: true, perMessageDeflate: false });

httpServer.on('upgrade', (req, socket, head) => {
    const pathname = req.url || '/';

    if (pathname === '/chat' || pathname.startsWith('/chat?')) {
        wssChat.handleUpgrade(req, socket, head, (ws) => {
            wssChat.emit('connection', ws, req);
        });
    } else {
        wssGame.handleUpgrade(req, socket, head, (ws) => {
            wssGame.emit('connection', ws, req);
        });
    }
});

httpServer.listen(PROXY_PORT, () => {
    console.log(`WS<->UDP proxy on ws://0.0.0.0:${PROXY_PORT}/`);
    console.log(`Chat WebSocket on ws://0.0.0.0:${PROXY_PORT}/chat`);
    console.log(`Default target: ${TARGET_HOST}:${TARGET_PORT}`);
});

wssChat.on('connection', (ws) => {
    chatHandler.handleConnection(ws);
});

wssGame.on('connection', ws => {
    const udp = dgram.createSocket('udp4');
    udp.connect(TARGET_PORT, TARGET_HOST);

    let closed = false;
    function close() {
        if (closed) return;
        closed = true;
        try {
            udp.close();
        } catch {}
    }

    udp.on('message', msg => {
        if (ws.readyState !== WebSocket.OPEN) return;
        if (ws.bufferedAmount > MAX_WS_BUFFERED_BYTES) return;

        ws.send(msg, { binary: true }, err => {
            if (err) console.warn('WS send error:', err.message);
        });
    });

    udp.on('error', err => {
        console.warn('UDP error:', err.message);
        close();
        try {
            ws.close();
        } catch {}
    });

    ws.on('message', (data, isBinary) => {
        if (!isBinary) return;

        udp.send(data, err => {
            if (err) console.warn('UDP send error:', err.message);
        });
    });

    ws.on('close', close);
    ws.on('error', close);
});

// Server process management and log parsing
let serverProcess = null;
let logParser = null;
let eventBatcher = null;
let currentGameType = null;

// Map game type to maplist file path
const GAMETYPE_MAPLIST_FILES = {
    0: '/server/cpma/cfg-maps/ffamaps.txt',
    3: '/server/cpma/cfg-maps/teammaps.txt',
    4: '/server/cpma/cfg-maps/ctfmaps.txt',
    7: '/server/cpma/cfg-maps/ctfmaps.txt',
};

function startServerWithLogParsing() {
    if (!ENABLE_LOG_PARSING) {
        console.log('Log parsing disabled');
        return;
    }

    console.log(`Starting server: ${SERVER_BINARY_PATH} ${SERVER_ARGS}`);

    // Initialize log parser and event batcher
    logParser = new LogParser();

    // Check if API_TOKEN is set
    if (!API_TOKEN || API_TOKEN.trim() === '') {
        console.error('ERROR: API_TOKEN environment variable is not set!');
        console.error('Event submission and heartbeat to master server will fail.');
        console.error('Please set API_TOKEN to the same value configured on the master server.');
    }

    eventBatcher = new EventBatcher(MASTER_SERVER_BASE, EVENT_BATCH_INTERVAL_MS, FILTER_BOT_EVENTS, API_TOKEN);
    eventBatcher.start();

    if (FILTER_BOT_EVENTS) {
        console.log('Bot event filtering enabled');
    }
    console.log('API authentication:', API_TOKEN && API_TOKEN.trim() !== '' ? 'enabled' : 'DISABLED (events will be rejected!)');

    // Parse server arguments
    const args = SERVER_ARGS.trim().split(/\s+/).filter(arg => arg.length > 0);

    // Spawn server process
    serverProcess = spawn(SERVER_BINARY_PATH, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: process.cwd(),
    });

    // Create readline interfaces for stdout and stderr
    const stdoutReader = readline.createInterface({
        input: serverProcess.stdout,
        crlfDelay: Infinity,
    });

    const stderrReader = readline.createInterface({
        input: serverProcess.stderr,
        crlfDelay: Infinity,
    });

    // Parse log lines from stdout
    stdoutReader.on('line', (line) => {
        // Echo server output for debugging
        console.log(`[SERVER] ${line}`);

        // Process chat messages
        chatHandler.processLine(line);

        if (logParser) {
            // Try to extract current map from server output
            const mapName = logParser.extractMapName(line);
            if (mapName && eventBatcher) {
                eventBatcher.setMap(mapName);
            }

            // Try to extract game type from server output
            const gameType = logParser.extractGameType(line);
            if (gameType !== null) {
                currentGameType = gameType;
                console.log(`[GAMETYPE] Set to ${gameType}`);
            }

            // Parse the line for events
            const event = logParser.parseLine(line);
            if (event && eventBatcher) {
                eventBatcher.addEvent(event);
            }
        }
    });

    // Parse log lines from stderr (some messages might go here)
    stderrReader.on('line', (line) => {
        console.log(`[SERVER:ERR] ${line}`);

        // Process chat messages
        chatHandler.processLine(line);

        // Also check stderr for map, gametype, and events
        if (logParser) {
            // Try to extract current map from server output
            const mapName = logParser.extractMapName(line);
            if (mapName && eventBatcher) {
                eventBatcher.setMap(mapName);
            }

            // Try to extract game type from server output
            const gameType = logParser.extractGameType(line);
            if (gameType !== null) {
                currentGameType = gameType;
                console.log(`[GAMETYPE] Set to ${gameType}`);
            }

            const event = logParser.parseLine(line);
            if (event && eventBatcher) {
                eventBatcher.addEvent(event);
            }
        }
    });

    // Handle server process exit
    serverProcess.on('exit', (code, signal) => {
        console.log(`Server process exited (code: ${code}, signal: ${signal})`);

        if (eventBatcher) {
            eventBatcher.stop();
        }

        // Restart server if it crashes (unless it was SIGTERM/SIGINT from us)
        if (signal !== 'SIGTERM' && signal !== 'SIGINT') {
            console.log('Server crashed, restarting in 5 seconds...');
            setTimeout(() => {
                if (logParser) {
                    logParser.reset();
                }
                startServerWithLogParsing();
            }, 5000);
        }
    });

    serverProcess.on('error', (err) => {
        console.error('Failed to start server:', err);
    });
}

// Graceful shutdown
function shutdown() {
    console.log('Shutting down...');

    if (eventBatcher) {
        eventBatcher.stop();
    }

    if (serverProcess) {
        serverProcess.kill('SIGTERM');
    }

    process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

(async () => {
    try {
        await initPublishHost();
        await sendHeartbeat();
        heartbeatLoop().catch(err => {
            console.error('Heartbeat loop crashed:', err);
        });

        // Start server with log parsing if enabled
        startServerWithLogParsing();
    } catch (e) {
        console.error('Startup failed:', e);
        process.exit(1);
    }
})();
