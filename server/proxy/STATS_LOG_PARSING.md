# Server Log Parsing for Statistics

This proxy now includes built-in log parsing to capture game events (kills, joins, leaves) from the CPMA server and send them to the master server for statistics tracking.

## How It Works

1. **Server Management**: The proxy spawns and manages the `ioq3ded` server process as a child process
2. **Log Capture**: Server stdout/stderr is captured in real-time
3. **Event Parsing**: Log lines are parsed to extract:
   - Player joins (`ClientBegin`)
   - Player leaves (`ClientDisconnect`)
   - Kills (`Kill: ...`)
   - Player names (`ClientUserinfoChanged`)
   - Current map (`InitGame`)
4. **Event Batching**: Events are collected and sent to the master server every 5 seconds (configurable)
5. **Master Server**: Events are sent to `/api/events` endpoint in the same format as before

## Configuration

Set these environment variables to configure log parsing:

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_LOG_PARSING` | `true` | Enable/disable log parsing |
| `EVENT_BATCH_INTERVAL_MS` | `5000` | How often to send batched events (milliseconds) |
| `SERVER_BINARY_PATH` | `./ioq3ded` | Path to the server binary (relative to working directory) |
| `SERVER_ARGS` | `""` | Command-line arguments for the server |
| `MASTER_SERVER_BASE` | Required | URL of the master server (e.g., `https://master.example.com`) |

## Log Format Support

The parser recognizes standard Quake 3 and CPMA log formats:

### Player Tracking
```
ClientUserinfoChanged: 0 \n\PlayerName\t\0\model\sarge\...
```
Extracts player names and maps them to client numbers.

### Join Events
```
ClientBegin: 0
```
Triggers a "join" event for the player at client slot 0.

### Leave Events
```
ClientDisconnect: 0
```
Triggers a "leave" event for the player at client slot 0.

### Kill Events
```
Kill: 0 1 6: Sul-Matuul killed tester000 by MOD_ROCKET
```
Format: `Kill: <killer_num> <victim_num> <mod>: <killer_name> killed <victim_name> by <weapon>`

CPMA may add extra info at the end (e.g., "8 in arena 0") which is ignored.

### Map Detection
```
InitGame: \sv_maxclients\16\mapname\q3dm6\gamename\cpma\...
```
Extracts the current map name from server initialization.

## Event Format

Events sent to the master server follow the `CreateEventRequest` schema:

### Join Event
```json
{
  "event": "join",
  "player": {
    "clientNum": 0,
    "name": "PlayerName"
  },
  "serverTime": 1234567890,
  "gameTime": 0,
  "map": "q3dm6"
}
```

### Leave Event
```json
{
  "event": "leave",
  "player": {
    "clientNum": 0,
    "name": "PlayerName"
  },
  "serverTime": 1234567890,
  "gameTime": 0,
  "map": "q3dm6"
}
```

### Kill Event
```json
{
  "event": "kill",
  "killer": {
    "clientNum": 0,
    "name": "Sul-Matuul"
  },
  "victim": {
    "clientNum": 1,
    "name": "tester000"
  },
  "meansOfDeath": 6,
  "serverTime": 1234567890,
  "gameTime": 0,
  "map": "q3dm6"
}
```

## Testing

To test the log parser without running the full server:

```bash
cd /server/proxy
node test-parser.js
```

This will parse sample log lines and show the extracted events.

## Deployment

The `entrypoint.sh` script has been updated to:
1. Set `SERVER_ARGS` environment variable from command-line arguments
2. Start only the proxy (which spawns the server)

The proxy handles:
- Server lifecycle management
- Automatic restart on crashes (5 second delay)
- Graceful shutdown (SIGTERM/SIGINT)
- Event batching and sending

## Troubleshooting

### No events are being sent

1. Check that `ENABLE_LOG_PARSING=true`
2. Verify `MASTER_SERVER_BASE` is set correctly
3. Check proxy logs for `[SERVER]` output - server logs should be visible
4. Look for "Sending X event(s) to master server" messages every 5 seconds

### Events missing player names

- Player names are tracked via `ClientUserinfoChanged` lines
- If joins happen before userinfo is set, the event won't have a name
- This is normal for bots or quick reconnects

### Server keeps restarting

- Check server logs (`[SERVER]` prefix) for crash messages
- Verify server binary path and arguments are correct
- Ensure game files (pak0.pk3, etc.) are present in baseq3/cpma directories

### Map name not set

- Map name is extracted from `InitGame` lines
- If you see `"map": null` in events, the parser didn't detect the map yet
- Map should be set after the first `InitGame` log line

## Architecture Changes

### Before
```
entrypoint.sh
  ├─→ proxy (background)
  └─→ ioq3ded (background)
```

### After
```
entrypoint.sh
  └─→ proxy
       └─→ ioq3ded (child process)
            ├─→ stdout → log parser → event batcher → master server
            └─→ stderr → log parser → event batcher → master server
```

## Files

- `logParser.js` - Parses server log lines and extracts events
- `eventBatcher.js` - Batches events and sends to master server
- `index.js` - Main proxy with server spawning and log parsing
- `test-parser.js` - Test script for the log parser
- `env.js` - Environment variable configuration
