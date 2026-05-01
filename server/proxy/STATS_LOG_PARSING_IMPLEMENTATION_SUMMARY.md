# CPMA Log Parsing Implementation Summary

## Problem

With the switch to CPMA (closed-source mod), client-side event reporting via QVM injection is no longer possible, breaking the statistics tracking system.

## Solution

Implemented server-side log parsing in the WebSocket proxy to capture game events from CPMA server logs and forward them to the master server.

## What Was Changed

### New Files

1. **`server/proxy/logParser.js`** (130 lines)
   - Parses Quake 3/CPMA server log output
   - Extracts kills, joins, leaves, player names, and map names
   - Maintains client number → player name mapping
   - Handles CPMA-specific log formats (e.g., "8 in arena 0" suffix)

2. **`server/proxy/eventBatcher.js`** (90 lines)
   - Batches events every 5 seconds (configurable)
   - Enriches events with server time, game time, and map data
   - Sends events to master server's `/api/events` endpoint
   - Handles errors gracefully

3. **`server/proxy/test-parser.js`** (50 lines)
   - Test harness for the log parser
   - Validates parsing logic with sample logs

4. **`server/proxy/LOG_PARSING.md`**
   - Complete documentation of the feature
   - Configuration guide
   - Troubleshooting tips

### Modified Files

1. **`server/proxy/env.js`**
   - Added `ENABLE_LOG_PARSING` (default: true)
   - Added `EVENT_BATCH_INTERVAL_MS` (default: 5000ms)
   - Added `SERVER_BINARY_PATH` (default: "./ioq3ded")
   - Added `SERVER_ARGS` (default: "")

2. **`server/proxy/index.js`**
   - Now spawns and manages the ioq3ded server as a child process
   - Captures server stdout/stderr
   - Feeds log lines to the parser
   - Sends parsed events to the batcher
   - Implements automatic restart on crashes
   - Graceful shutdown handling

3. **`server/entrypoint.sh`**
   - Simplified to only start the proxy
   - Exports `SERVER_ARGS` for the proxy to use
   - Proxy now manages the server lifecycle

## Architecture Flow

```
CPMA Server (ioq3ded)
  ├─→ stdout/stderr
  │     ├─→ Kill: 0 1 6: Sul-Matuul killed tester000 by MOD_ROCKET
  │     ├─→ ClientBegin: 0
  │     ├─→ ClientDisconnect: 1
  │     └─→ ClientUserinfoChanged: 0 \n\PlayerName\...
  │
  ↓ (parsed by logParser.js)
  │
Event Objects
  ├─→ { event: "kill", killer: {...}, victim: {...}, meansOfDeath: 6 }
  ├─→ { event: "join", player: {...} }
  └─→ { event: "leave", player: {...} }
  │
  ↓ (batched by eventBatcher.js every 5s)
  │
Master Server /api/events
  └─→ PostgreSQL events table
       └─→ Statistics (kills, deaths, K/D, playtime, etc.)
```

## Supported Events

### Kill Events
```
Kill: 0 1 6: Sul-Matuul killed tester000 by MOD_ROCKET
```
Extracts:
- Killer client number and name
- Victim client number and name
- Weapon/means of death ID

### Join Events
```
ClientUserinfoChanged: 0 \n\Sul-Matuul\...
ClientBegin: 0
```
Extracts:
- Client number
- Player name

### Leave Events
```
ClientDisconnect: 0
```
Extracts:
- Client number
- Player name (from tracking)

### Map Changes
```
InitGame: \mapname\q3dm6\...
```
Extracts:
- Current map name

## Testing

The implementation has been tested with sample log data:

```bash
cd server/proxy
node test-parser.js
```

Output shows successful parsing of:
- ✅ Map detection from InitGame
- ✅ Player name tracking from ClientUserinfoChanged
- ✅ Join events from ClientBegin
- ✅ Kill events (standard and CPMA extended format)
- ✅ Leave events from ClientDisconnect
- ✅ Proper cleanup of player tracking

## Configuration

### Environment Variables

Set these in your deployment:

```bash
# Required
MASTER_SERVER_BASE=https://your-master-server.com

# Optional (with defaults)
ENABLE_LOG_PARSING=true
EVENT_BATCH_INTERVAL_MS=5000
SERVER_BINARY_PATH=./ioq3ded
SERVER_ARGS="+set dedicated 2 +exec autoexec.cfg"
```

### Docker Deployment

No changes needed to Docker setup. The entrypoint.sh script automatically:
1. Builds SERVER_ARGS from command-line arguments
2. Adds `+set fs_game cpma` if not present
3. Passes everything to the proxy

## Next Steps

1. **Deploy**: Deploy the updated proxy to your server
2. **Monitor**: Watch logs for `[SERVER]` output and event sending messages
3. **Verify**: Check master server logs for incoming events
4. **Test**: Play some games and verify statistics are being recorded

## Monitoring

Key log messages to watch:

```
EventBatcher started (batch interval: 5000ms)
Current map: q3dm6
Sending 3 event(s) to master server
[SERVER] Kill: 0 1 6: Sul-Matuul killed tester000 by MOD_ROCKET
```

## Benefits

1. **No client modification needed** - Works with closed-source CPMA
2. **Server-side only** - No changes to game client
3. **Reliable** - Events captured directly from authoritative server logs
4. **Backward compatible** - Can be disabled with `ENABLE_LOG_PARSING=false`
5. **Efficient** - Events batched to reduce HTTP overhead
6. **Resilient** - Automatic server restart on crashes

## Limitations

1. **gameTime not available** - Log lines don't include game time, so it's set to 0
2. **Timing accuracy** - Events timestamped when proxy receives log line, not exact game time
3. **Depends on log format** - Any CPMA log format changes may require parser updates

## Files Changed

```
server/
├── proxy/
│   ├── logParser.js          (NEW - 130 lines)
│   ├── eventBatcher.js       (NEW - 90 lines)
│   ├── test-parser.js        (NEW - 50 lines)
│   ├── LOG_PARSING.md        (NEW - documentation)
│   ├── env.js                (MODIFIED - added 4 config options)
│   └── index.js              (MODIFIED - added server spawning + log parsing)
└── entrypoint.sh             (MODIFIED - simplified to only start proxy)
```

Total: ~400 lines of new code + documentation

## Questions?

If you encounter any issues:

1. Check `server/proxy/LOG_PARSING.md` for troubleshooting
2. Run `node test-parser.js` to verify parsing logic
3. Check proxy logs for `[SERVER]` output
4. Verify `MASTER_SERVER_BASE` environment variable is set
5. Test with `ENABLE_LOG_PARSING=true` explicitly set
