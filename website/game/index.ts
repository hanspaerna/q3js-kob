import {getWsProtocol} from "@/lib/utils.ts";
import {
    ensureMounts,
    estimateTotalBytes,
    fetchIntoUint8,
    PERSIST_CONFIG_DIR,
    PERSIST_DATA_DIR,
    PERSIST_STATE_DIR,
    type Prog,
    type IOQ3Module,
    syncfs
} from "@/lib/fs.ts";

type Params = {
    host: string;
    proxyPort: number;
    name: string;
    rafUpdate: (prog: Prog) => void;
    fsGame: string;
    customPlayerModels?: string[];
}

type FileEntry = {
    src: string;
    dst: string;
};

const config = {
    baseq3: {
        files: [
            {src: "baseq3/q3key", dst: "/baseq3"},
            {src: "baseq3/pak0.pk3", dst: "/baseq3"},
            {src: "baseq3/pak1.pk3", dst: "/baseq3"},
            {src: "baseq3/pak2.pk3", dst: "/baseq3"},
            {src: "baseq3/pak3.pk3", dst: "/baseq3"},
            {src: "baseq3/pak4.pk3", dst: "/baseq3"},
            {src: "baseq3/pak5.pk3", dst: "/baseq3"},
            {src: "baseq3/pak6.pk3", dst: "/baseq3"},
            {src: "baseq3/pak7.pk3", dst: "/baseq3"},
            {src: "baseq3/pak8.pk3", dst: "/baseq3"},
            {src: "baseq3/zzczhdwr1.pk3", dst: "/baseq3"}, // CZ45 Q3A Weapon Model Remake (3 files)
            {src: "baseq3/zzczhdwr2.pk3", dst: "/baseq3"},
            {src: "baseq3/zzczhdwr3.pk3", dst: "/baseq3"},
            {src: "baseq3/pak9hqq37.pk3", dst: "/baseq3"}, // [HQQ] High Quality Quake - v3.7 (UI/font upscaler)
        ],
    },
    cpma: {
        files: [
            {src: "cpma/cfg-maps/mapmodes.txt", dst: "/cpma/cfg-maps"},

            // core pak
            {src: "cpma/z-cpma-pak153.pk3", dst: "/cpma"},

            // misc root files
            {src: "cpma/changelog.txt", dst: "/cpma"},
            {src: "cpma/description.txt", dst: "/cpma"},
            {src: "cpma/readme.txt", dst: "/cpma"},
            {src: "cpma/openlibm_license.md", dst: "/cpma"},
            {src: "cpma/cpma.ico", dst: "/cpma"},
            {src: "cpma/cpma-trans.ico", dst: "/cpma"},

            // classes
            {src: "cpma/classes/fighter.cfg", dst: "/cpma/classes"},
            {src: "cpma/classes/scout.cfg", dst: "/cpma/classes"},
            {src: "cpma/classes/sniper.cfg", dst: "/cpma/classes"},
            {src: "cpma/classes/tank.cfg", dst: "/cpma/classes"},

            // hud
            {src: "cpma/hud/arqon.cfg", dst: "/cpma/hud"},
            {src: "cpma/hud/hud1.cfg", dst: "/cpma/hud"},
            {src: "cpma/hud/hud2.cfg", dst: "/cpma/hud"},
            {src: "cpma/hud/hud3.cfg", dst: "/cpma/hud"},
            {src: "cpma/hud/hud4.cfg", dst: "/cpma/hud"},
            {src: "cpma/hud/hud5.cfg", dst: "/cpma/hud"},
            {src: "cpma/hud/hud6.cfg", dst: "/cpma/hud"},
            {src: "cpma/hud/hud7.cfg", dst: "/cpma/hud"},
	
            // stats
            {src: "cpma/stats/basics/arrdown.gif", dst: "/cpma/stats/basics"},
            {src: "cpma/stats/basics/arrup.gif", dst: "/cpma/stats/basics"},
            {src: "cpma/stats/basics/stats141.css", dst: "/cpma/stats/basics"},
            {src: "cpma/stats/basics/stats141.xsl", dst: "/cpma/stats/basics"},
	
            // viewcam
            {src: "cpma/viewcam/cpm3a.cfg", dst: "/cpma/viewcam"},
            {src: "cpma/viewcam/cpm3.cfg", dst: "/cpma/viewcam"},
            {src: "cpma/viewcam/q3dm12.cfg", dst: "/cpma/viewcam"},

            // core maps (required)
            {src: "cpma/map_cpm10.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm11a.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm11.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm12.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm13.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm14.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm15.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm16.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm17.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm18.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm18r.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm19.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm1a.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm20.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm21.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm22.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm23.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm24.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm25.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm26_cpmctf4.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm27.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm28.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm29.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm2.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm3a.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm3.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm4a.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm4.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm5.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm6.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm7.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm8.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm9.pk3", dst: "/cpma"},
            {src: "cpma/map_cpma3.pk3", dst: "/cpma"},
            {src: "cpma/map_cpmctf1.pk3", dst: "/cpma"},
            {src: "cpma/map_cpmctf2.pk3", dst: "/cpma"},
            {src: "cpma/map_cpmctf3.pk3", dst: "/cpma"},
            {src: "cpma/map_cpmctf5.pk3", dst: "/cpma"},

            // beta core maps
            {src: "cpma/map_cpm33_b1.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm32_b1.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm30_b1.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm3b_b1.pk3", dst: "/cpma"},
        ],
    }

} as const satisfies Record<string, { files: readonly FileEntry[] }>;

// models are stored in baseq3 for any fs_game, be it CPMA or anything else
export function getConfigWithCustomModels(customPlayerModels: string[]) {
  // "api/" prefix is very important, as we call an internal API route to dynamically load the new models
  const extraModelFiles = customPlayerModels.map(model => ({ src: `api/baseq3/${model}`, dst: "/baseq3" }));
    
  return {
        ...config,
        baseq3: {
            files: [
                ...config.baseq3.files,
                ...extraModelFiles
            ]
        },
        cpma: config.cpma,
    };
}

type SupportedGameDir = keyof typeof config;

type IOQ3RuntimeModule = IOQ3Module & {
    canvas?: HTMLCanvasElement;
};

type RuntimeModule = IOQ3RuntimeModule & {
    addRunDependency: (id: string) => void;
    removeRunDependency: (id: string) => void;
};

function isSupportedGameDir(gameDir: string): gameDir is SupportedGameDir {
    return gameDir in config;
}


let runtimeModule: IOQ3RuntimeModule | null = null;
let runtimePromise: Promise<IOQ3RuntimeModule> | null = null;

function registerIOQ3Runtime(promise: Promise<IOQ3RuntimeModule>) {
    runtimePromise = promise;
    runtimeModule = null;

    promise
        .then((module) => {
            runtimeModule = module;
        })
        .catch(() => {
            if (runtimePromise === promise) {
                runtimePromise = null;
                runtimeModule = null;
            }
        });
}

export default async function startGame({host, proxyPort, name, rafUpdate, fsGame, customPlayerModels = []}: Params) {
    const importIoquake3 = new Function("return import('/ioquake3.js')");
    const ioquake3Module = await (importIoquake3() as Promise<{ default: (moduleArg?: unknown) => unknown }>);
    const ioquake3 = ioquake3Module.default;
    const canvas = document.getElementById("canvas") as HTMLCanvasElement | null;

    if (!canvas) {
        throw new Error("Game canvas not found");
    }

    const initialViewport = canvas.getBoundingClientRect();
    const initialWidth = Math.max(1, Math.round(initialViewport.width || window.innerWidth));
    const initialHeight = Math.max(1, Math.round(initialViewport.height || window.innerHeight));

    canvas.width = initialWidth;
    canvas.height = initialHeight;

    const fs_basegame = "baseq3";
    const fs_game = fsGame;

    let generatedArguments = `
        +set sv_pure 0
        +set net_enabled 1
        +set r_mode -2
        +set r_fullscreen 0
        +set cl_allowDownload 1
        +set con_scale 2
        +set fs_game "${fs_game}"
        +set fs_homeconfigpath "${PERSIST_CONFIG_DIR}"
        +set fs_homedatapath "${PERSIST_DATA_DIR}"
        +set fs_homestatepath "${PERSIST_STATE_DIR}"
        +set com_introplayed 1
        +set ui_cdkeychecked 1
        +set cl_firststart 0
        +set cg_fov 120
        +bind h "+button3"
    `;

    // Spearmint's Very High Quality Graphics settings by zturtleman, compatible with ioquake3 (r_flares excluded due to OpenGL error)
    generatedArguments += `
        +set r_picmip 0
        +set r_lodBias -2
        +set r_subdivisions 1
        +set r_textureMode "GL_LINEAR_MIPMAP_LINEAR"
        +set r_ext_texture_filter_anisotropic 1
        +set r_ext_max_anisotropy 16
        +set r_ext_multisample 4
        +set r_ext_framebuffer_multisample 4
        +set r_lodCurveError 10000
    `;

    generatedArguments += ` +connect ${host}:${proxyPort} `;
    generatedArguments += ` +set name "${name.replace(/"/g, "'")}" `;

    const dataURL = new URL(location.origin + location.pathname);

    const runtimePromise = ioquake3({
        websocket: {
            url: `${getWsProtocol()}//${host}:${proxyPort}`,
            subprotocol: "binary"
        },
        canvas,
        arguments: generatedArguments.trim().split(/\s+/),
        onRuntimeInitialized: () => {
            rafUpdate({received: 0, total: 0, pct: 100, current: "ready", stage: "ready"});
        },
        locateFile: (path: string) => {
            if (path.endsWith(".wasm")) return "/ioquake3.wasm";
        },
        preRun: [
            async (module: RuntimeModule) => {
                module.addRunDependency("setup-ioq3-filesystem");
                try {
                    rafUpdate({
                        received: 0,
                        total: 0,
                        pct: 0,
                        current: "Preparing local storage",
                        stage: "initializing"
                    });
                    const mountDirs = Array.from(new Set([fs_basegame, fs_game]));
                    const {persist} = await ensureMounts(module, {assetGameDirs: mountDirs});
                    const configuredGameDirs = mountDirs.filter(isSupportedGameDir);
                    const configWithCustomModels = getConfigWithCustomModels(customPlayerModels);

                    const allFileEntries = configuredGameDirs.flatMap<FileEntry>((g) => configWithCustomModels[g].files);
                    const uniqueFileEntries = Array.from(
                        new Map(
                            allFileEntries.map((f: FileEntry) => {
                                const assetName = f.src.split("/").pop() as string;
                                const dstPath = `${f.dst}/${assetName}`;
                                return [dstPath, f] as const;
                            })
                        ).values()
                    );

                    console.log("uniqueFileEntries: ");
                    console.log(uniqueFileEntries);

                    const validModelFiles = new Set(
                        uniqueFileEntries
                            .map(f => f.src.split("/").pop() as string)
                    );

                    console.log("validModelFiles: ");
                    console.log(validModelFiles);

                    // to clean-up server and clients from bad custom models, remove all models from clients that are no longer on the server
                    try {
                        const baseq3Files = module.FS.readdir('/baseq3') as string[];
                        for (const file of baseq3Files) {
                            if (file.startsWith('model-') && file.endsWith('.pk3')) {
                                if (!validModelFiles.has(file)) {
                                    module.FS.unlink(`/baseq3/${file}`);
                                    console.log(`Removed a custom model from client that does not exist on server: ${file}`);
                                }
                            }
                        }
                    } catch {
                        // /baseq3 might not exist yet on first run, safe to ignore
                    }

                    const pendingEntries = (await Promise.all(
                        uniqueFileEntries.map(async (f: FileEntry) => {
                            const assetName = f.src.split("/").pop() as string;
                            const dstPath = `${f.dst}/${assetName}`;

                            let localSize = -1;
                            try {
                                const st = module.FS.stat(dstPath);
                                localSize = st?.size ?? -1;
                            } catch {
                                // file doesn't exist yet
                            }

                            if (localSize <= 0) return f; // doesn't exist, always download

                            try {
                                const url = new URL(f.src, dataURL);
                                const head = await fetch(url, { method: 'HEAD' });
                                const remoteSize = parseInt(head.headers.get('content-length') ?? '-1', 10);
                                if (remoteSize > 0 && remoteSize !== localSize) return f; // size mismatch, re-download
                                return null; // sizes match, skip
                            } catch {
                                return null; // can't check, assume it's fine
                            }
                        })
                    )).filter((f): f is FileEntry => f !== null);

                    console.log("pendingEntries: ");
                    console.log(pendingEntries);

                    const pendingUrls = pendingEntries.map((f: FileEntry) => new URL(f.src, dataURL));
                    const totalBytes = await estimateTotalBytes(pendingUrls);
                    let receivedBytes = 0;
                    const downloadStart = Date.now();

                    for (let i = 0; i < pendingEntries.length; i++) {
                        const f = pendingEntries[i];
                        const url = pendingUrls[i];
                        const name = f.src.split("/").pop() as string;
                        const dstPath = `${f.dst}/${name}`;

                        rafUpdate({
                            received: receivedBytes,
                            total: totalBytes,
                            pct: totalBytes ? Math.floor((receivedBytes / totalBytes) * 100) : 0,
                            current: f.src,
                            stage: "downloading"
                        });

                        const data = await fetchIntoUint8(url, (n) => {
                            receivedBytes += n;
                            const pct = totalBytes ? Math.min(100, Math.floor((receivedBytes / totalBytes) * 100)) : 0;
                            const elapsedSeconds = Math.max((Date.now() - downloadStart) / 1000, 0.001);
                            const bytesPerSecond = receivedBytes / elapsedSeconds;
                            const remainingBytes = Math.max(totalBytes - receivedBytes, 0);
                            const etaSeconds = bytesPerSecond > 0 ? Math.ceil(remainingBytes / bytesPerSecond) : undefined;
                            rafUpdate({
                                received: receivedBytes,
                                total: totalBytes,
                                pct,
                                current: f.src,
                                stage: "downloading",
                                etaSeconds
                            });
                        });

                        module.FS.mkdirTree(f.dst);
                        module.FS.writeFile(dstPath, data);
                    }

                    if (persist) {
                        await syncfs(module, false);
                    }
                    rafUpdate({
                        received: totalBytes,
                        total: totalBytes,
                        pct: 100,
                        current: "Launching engine",
                        stage: "launching"
                    });
                } finally {
                    module.removeRunDependency("setup-ioq3-filesystem");
                }
            },
        ],
    }) as Promise<RuntimeModule>;

    registerIOQ3Runtime(runtimePromise);
}
