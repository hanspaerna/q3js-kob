# Q3JS-KOB (a fork of Q3JS)

This fork includes many changes and new features:
  - Server's admin UI that can be opened right in the game by pressing F2!
  - Quake 3's client config can be customized on the website before joining
  - Integrated in-game chat that streams messages from Q3 server and allows sending them via website
  - Automatic downloading of custom player models to web clients
  - Server file manager for uploading player models and maps, if you are authenticated
  - Local file manager to manually modify the game client's IndexedDB!
  - OIDC auth for trusted players and admins (two groups: 'quakers' for players, 'admins' or 'quakemanagers' for admins)
  - Primarily CPMA-oriented
  - Enforced hassle-free fullscreen mode that eliminates mouse pointer lock issues
  - Player statistics are collected server-side (by proxy) and don't require any modifications of the client
  - Best suited for a single server, or multiple that share the same files
  - No Google Analytics or SEO
  - Mobile controls support is removed
  - Home page is simplified (no server search)
  - Check of integrity of the client files and removal of those that are no longer on server
  - Usernames are limited to 16 chars according to CPMA requirements and cannot have spaces
  - Server card is reactive, it is refreshed automatically with a reasonable interval
  - Added Telegram bot (./tgbot) that sends the messages starting with "/q3" from a chat into Q3 server chat, and vice versa
  - I've probably missed something...

Q3JS compiles `ioquake3` to WebAssembly, streams the original `pak` assets through a modern React front end, tunnels UDP
traffic through a WebSocket proxy, and keeps server metadata in a Quarkus backend.


## Building Docker images

NOTE: there is no need to bake 'baseq3' game folder into the server image, just mount it in Compose/Kubernetes instead.

You can just run one of these scripts to deploy the latest version to Docker registry:

```
./pack-master.sh
./pack-server.sh
./pack-website.sh
./pack-tgbot.sh
```

## Repository map

| Path            | Description                                                                                 |
|-----------------|---------------------------------------------------------------------------------------------|
| `game/`         | Emscripten build scripts that compile `ioquake3` into `ioquake3.{js,wasm}`.                 |
| `game/emsdk/`   | Local Emscripten SDK checkout used by `game/build.sh`.                                      |
| `game/ioq3/`    | Submodule pointing to the `ioquake3` source code.                                           |
| `server/`       | Native dedicated server build, Dockerfile, entrypoint, and WebSocket↔UDP proxy.             |
| `server/proxy/` | A proxy of the server that creates a WebSocket for clients and sends a heartbeat to master. |
| `master/`       | Quarkus app (REST master server)                                                            |
| `website/`      | Vite + React + TanStack Router UI that embeds the WASM build and server picker.             |


## Local development

### Browser client (`game/` + `website/`)

- `game/build.sh` bootstraps Emscripten, patches GLSL shaders for precision qualifiers, and builds a Release target with
  SDL2, WebGL2, and filesystem support (`-sFORCE_FILESYSTEM=1 -lidbfs.js`).
- The generated artifacts are consumed by the React app (`website/src/lib/ioquake3.js` and `.wasm`). Persistent data
  lives in IDBFS; `GamePage.tsx` handles mounting/syncing and versioned cache invalidation.
- Tooling: Vite + Tailwind CSS, TanStack Router, TanStack Query, shadcn/ui, Vitest, and Biome for formatting/linting.
  Use `npm run test`, `npm run lint`, `npm run format`, `npm run check`.

-  **Build the WebAssembly client**
   ```bash
   cd game
   ./build.sh                   # installs/activates emsdk 4.0.19 and compiles ioquake3
   ```
   The output `game/build/Release/ioquake3.{js,wasm}` must be copied (or symlinked) into `website/src/lib/`. The script
   already patches OpenGL shaders for WebGL 2 / GLES precision requirements.

   **NB!** Do **NOT** rebuild client and replace ioquake3.{js,wasm} stored in `website/lib/` and `website/public/` if playing in CPMA, as there is a very hard to debug network issue that prevents CPMA client to connect to the server with endless "Awaiting challenge...".

-  **Run the website (UI)**
   ```bash
   cd website
   npm install
   npm run dev                  # Vite dev server on http://localhost:3000
   ```
   The SPA polls the REST API for server data and opens the WebSocket proxy when you click “Play”.

#### Custom maps

Automatic download of maps is already enabled by ioquake3 client itself, just add a new map to baseq3/ dir of the server, reload the current map once again with rcon, and then the new one will be available.

#### Custom player models

The website part of this custom fork can also download custom models from baseq3/ folder of the server and install them into clients dynamically. Just copy your model into baseq3/ and name it accordingly: "model-$NAME.pk3". That's it.

If custom model is no longer on server, it will also be removed from clients on their next loading.

NB! The server's baseq3 folder must be mapped to /app/public/baseq3 of the website container for this feature to work. The models (and custom maps) are global for any fs_game, so they will be available in CPMA as well, even though they're installed in baseq3.


### Dedicated server (`server/`)

- `server/build.sh` configures `ioq3ded` (headless server, QVMs enabled) via CMake/GCC, copies `baseq3/` into the build
  output, and leaves binaries in `server/build/Release/`.
- `ws-udp-proxy/index.js` converts browser WebSocket traffic to raw UDP packets understood by the Quake server.
  Environment variables:
    - `Q3_HOST`, `Q3_PORT` – native server address (defaults `127.0.0.1:27960`).
    - `WS_PORT` – listen port for browsers (`27961`).
    - `RCON_PASS` – optional; enables the “kick ping 999” watchdog (matches `rconPassword` in `entrypoint.sh`).
    - `POLL_MS`, `RESP_TIMEOUT_MS`, `CONSEC_REQUIRED` – tune heartbeat/kick behaviour.
- `entrypoint.sh` launches both the proxy and `ioq3ded` with sensible defaults (dedicated server, `q3dm17`). Use the
  multi-stage `server/Dockerfile` if you prefer container builds: `docker build -t q3js/server ./server`.

-  **Build & run the dedicated server + proxy**
   ```bash
   cd server
   ./build.sh                   # cmake build of ioq3ded in server/build/Release
   ./entrypoint.sh              # launches ioq3ded with the default cvars/maps
   ```
    - The proxy listens on `WS_PORT` (default `27961`) and points to `Q3_HOST:Q3_PORT` (default `127.0.0.1:27960`).
      Override via env vars when running `entrypoint.sh` or the Docker container.

### Master/API service (`master/`)

- **Run the Quarkus service**
   ```bash
   cd master
   ./mvnw quarkus:dev           # REST API on http://localhost:8080, UDP master on :27950
   ```
   Test the API: `curl http://localhost:8080/api/servers`.
- Tests: `./mvnw test`. Native builds: `./mvnw package -Dnative`.

### Telegram Chat Bot

Completely optional. The idea is to send the messages from a group chat with friends into the game, if they start with "/q3".
Every message from in-game Q3 chat goes automatically into the selected Telegram chat
Cyrillic letters are automatically transliterated.

## Troubleshooting

- **Browser shows black screen:** Ensure `website/src/lib/ioquake3.{js,wasm}` matches the latest build and that the
  files are referenced by Vite (restart `npm run dev` after copying).
- **`emsdk_env.sh not found`:** Set `EMSDK_ROOT=/path/to/emsdk` before running `game/build.sh`.

## Using acquired assets

Copy the baseq3 folder into `public/` folder of the website deployment (i.e. `public/baseq3/`) so the browser client can download them.

> **Legal notice:** The `pak` files are free, shareware demo versions of Quake III Arena. To play the full game, you
> must own a legal copy of Quake III Arena or Quake III: Team Arena and copy the corresponding `pak` files from your
> installation.

## License & credits

- Engine source is [ioquake3](https://github.com/ioquake/ioq3) (GPLv2). See `game/ioq3/`.
- Game assets remain © id Software / Bethesda. Supply your own `baseq3` data.
- New code in this repository is licensed under the same terms as the respective sub-projects unless noted otherwise.
- The WebSocket proxy and integration glue were developed by
  [lklacar](https://github.com/lklacar); please provide attribution if you reuse these components.
- The `q3js.com` website and its original content are likewise authored and owned by lklacar; include proper credit when
  referencing or republishing any portion of it.
