'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, HardDrive, RefreshCw, File, Upload } from 'lucide-react';
import s from '../admin/admin.module.css';

type StorageEntry = {
    name: string;
    size: number;
    type: 'file' | 'directory';
    dbName?: string;
};

type DatabaseInfo = {
    name: string;
    entries: StorageEntry[];
    totalSize: number;
};

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

async function listIDBDatabases(): Promise<DatabaseInfo[]> {
    if (!('indexedDB' in window)) return [];

    const databases = await indexedDB.databases();
    const results: DatabaseInfo[] = [];

    for (const dbInfo of databases) {
        if (!dbInfo.name) continue;

        try {
            const entries = await listDatabaseContents(dbInfo.name);
            const totalSize = entries.reduce((sum, e) => sum + e.size, 0);
            results.push({
                name: dbInfo.name,
                entries,
                totalSize,
            });
        } catch {
            results.push({
                name: dbInfo.name,
                entries: [],
                totalSize: 0,
            });
        }
    }

    return results;
}

async function listDatabaseContents(dbName: string): Promise<StorageEntry[]> {
    return new Promise((resolve) => {
        const request = indexedDB.open(dbName);

        request.onerror = () => resolve([]);

        request.onsuccess = () => {
            const db = request.result;
            const entries: StorageEntry[] = [];

            if (db.objectStoreNames.length === 0) {
                db.close();
                resolve([]);
                return;
            }

            const storeNames = Array.from(db.objectStoreNames);
            let completed = 0;

            for (const storeName of storeNames) {
                try {
                    const tx = db.transaction(storeName, 'readonly');
                    const store = tx.objectStore(storeName);
                    const cursorReq = store.openCursor();

                    cursorReq.onsuccess = () => {
                        const cursor = cursorReq.result;
                        if (cursor) {
                            const value = cursor.value;
                            const name = typeof cursor.key === 'string' ? cursor.key : String(cursor.key);

                            if (value && typeof value === 'object' && 'contents' in value) {
                                entries.push({
                                    name,
                                    size: value.contents?.byteLength ?? value.contents?.length ?? 0,
                                    type: 'file',
                                });
                            } else if (value && typeof value === 'object' && 'mode' in value) {
                                const isDir = (value.mode & 0o170000) === 0o040000;
                                entries.push({
                                    name,
                                    size: 0,
                                    type: isDir ? 'directory' : 'file',
                                });
                            }
                            cursor.continue();
                        } else {
                            completed++;
                            if (completed === storeNames.length) {
                                db.close();
                                resolve(entries);
                            }
                        }
                    };

                    cursorReq.onerror = () => {
                        completed++;
                        if (completed === storeNames.length) {
                            db.close();
                            resolve(entries);
                        }
                    };
                } catch {
                    completed++;
                    if (completed === storeNames.length) {
                        db.close();
                        resolve(entries);
                    }
                }
            }
        };
    });
}

async function clearAllStorage(): Promise<void> {
    const databases = await indexedDB.databases();

    for (const dbInfo of databases) {
        if (dbInfo.name) {
            await new Promise<void>((resolve) => {
                const req = indexedDB.deleteDatabase(dbInfo.name!);
                req.onsuccess = () => resolve();
                req.onerror = () => resolve();
                req.onblocked = () => resolve();
            });
        }
    }
}

async function uploadFileToIDB(fileName: string, data: Uint8Array): Promise<boolean> {
    // Upload to the baseq3 database in Emscripten IDBFS format
    const dbName = '/baseq3';
    const filePath = `/baseq3/${fileName}`;

    return new Promise((resolve) => {
        const request = indexedDB.open(dbName);

        request.onerror = () => resolve(false);

        request.onsuccess = () => {
            const db = request.result;
            const storeNames = Array.from(db.objectStoreNames);

            if (storeNames.length === 0) {
                db.close();
                resolve(false);
                return;
            }

            // Use the first object store (typically 'FILE_DATA' for IDBFS)
            const storeName = storeNames[0];

            try {
                const tx = db.transaction(storeName, 'readwrite');
                const store = tx.objectStore(storeName);

                // Emscripten IDBFS format
                const entry = {
                    contents: data,
                    mode: 33206, // Regular file with rw permissions (0o100666)
                    timestamp: new Date(),
                };

                const putReq = store.put(entry, filePath);

                putReq.onsuccess = () => {
                    db.close();
                    resolve(true);
                };

                putReq.onerror = () => {
                    db.close();
                    resolve(false);
                };
            } catch {
                db.close();
                resolve(false);
            }
        };
    });
}

async function deleteFile(dbName: string, fileName: string): Promise<boolean> {
    return new Promise((resolve) => {
        const request = indexedDB.open(dbName);

        request.onerror = () => resolve(false);

        request.onsuccess = () => {
            const db = request.result;
            const storeNames = Array.from(db.objectStoreNames);

            if (storeNames.length === 0) {
                db.close();
                resolve(false);
                return;
            }

            let deleted = false;
            let completed = 0;

            for (const storeName of storeNames) {
                try {
                    const tx = db.transaction(storeName, 'readwrite');
                    const store = tx.objectStore(storeName);
                    const deleteReq = store.delete(fileName);

                    deleteReq.onsuccess = () => {
                        deleted = true;
                        completed++;
                        if (completed === storeNames.length) {
                            db.close();
                            resolve(deleted);
                        }
                    };

                    deleteReq.onerror = () => {
                        completed++;
                        if (completed === storeNames.length) {
                            db.close();
                            resolve(deleted);
                        }
                    };
                } catch {
                    completed++;
                    if (completed === storeNames.length) {
                        db.close();
                        resolve(deleted);
                    }
                }
            }
        };
    });
}

export default function StoragePage() {
    const [databases, setDatabases] = useState<DatabaseInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [clearing, setClearing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const loadStorage = useCallback(async () => {
        setLoading(true);
        const dbs = await listIDBDatabases();
        setDatabases(dbs);
        setLoading(false);
    }, []);

    useEffect(() => {
        loadStorage();
    }, [loadStorage]);

    const handleClear = async () => {
        if (!confirm('Are you sure you want to clear all cached game files? You will need to re-download them.')) {
            return;
        }
        setClearing(true);
        await clearAllStorage();
        await loadStorage();
        setClearing(false);
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadError(null);

        if (!file.name.endsWith('.pk3')) {
            setUploadError('Only .pk3 files are supported');
            e.target.value = '';
            return;
        }

        setUploading(true);
        setUploadProgress(0);

        try {
            const buffer = await file.arrayBuffer();
            setUploadProgress(50);

            const data = new Uint8Array(buffer);
            const success = await uploadFileToIDB(file.name, data);

            if (success) {
                setUploadProgress(100);
                await loadStorage();
            } else {
                setUploadError('Failed to save file. Make sure the game has been loaded at least once.');
            }
        } catch (err) {
            setUploadError(err instanceof Error ? err.message : 'Upload failed');
        }

        setUploading(false);
        setUploadProgress(null);
        e.target.value = '';
    };

    const [deleting, setDeleting] = useState<string | null>(null);

    const handleDeleteFile = async (dbName: string, fileName: string) => {
        if (!confirm(`Delete ${fileName.split('/').pop()}?`)) {
            return;
        }
        setDeleting(fileName);
        await deleteFile(dbName, fileName);
        await loadStorage();
        setDeleting(null);
    };

    const totalSize = databases.reduce((sum, db) => sum + db.totalSize, 0);
    const gameFiles = databases
        .flatMap(db => db.entries.map(e => ({ ...e, dbName: db.name })))
        .filter(e => e.type === 'file' && e.name.endsWith('.pk3'));

    return (
        <div className={s.page}>
            <div className={s.container}>
                <div className={s.header}>
                    <div className={s.headerTitle}>
                        <HardDrive size={24} color="var(--primary)" />
                        <h1>Local Storage</h1>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Button variant="outline" onClick={loadStorage} disabled={loading}>
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                            Refresh
                        </Button>
                        <Button variant="destructive" onClick={handleClear} disabled={clearing || loading}>
                            <Trash2 size={16} />
                            Clear Cache
                        </Button>
                    </div>
                </div>

                <div>
                    <p><small>Total cached size: <strong>{formatBytes(totalSize)}</strong></small></p>
                </div>

                <label className={`${s.uploadLabel} ${uploading ? s.disabled : ''}`}>
                    <Upload size={18} color={uploading ? '#555' : 'var(--primary)'} />
                    {uploading ? (
                        <div className={s.progressWrapper}>
                            <span>{uploadProgress}%</span>
                            <div className={s.progressBar}>
                                <div className={s.progressFill} style={{ width: `${uploadProgress}%` }} />
                            </div>
                        </div>
                    ) : 'Click to upload a .pk3 file to local storage'}
                    <input type="file" accept=".pk3" onChange={handleUpload} disabled={uploading} style={{ display: 'none' }} />
                </label>
                {uploadError && <p className={s.error}>{uploadError}</p>}

                <div className={s.fileColumn}>
                    <h2 className={s.columnHeader}>Cached Game Files</h2>
                    <div className={s.fileList}>
                        {loading ? (
                            <p className={s.emptyState}>Loading storage info...</p>
                        ) : gameFiles.length === 0 ? (
                            <p className={s.emptyState}>No cached game files found.</p>
                        ) : (
                            gameFiles.map((entry) => (
                                <div key={entry.name} className={s.fileItem}>
                                    <div className={s.fileItemName}>
                                        <File size={14} color="var(--color-text-faint)" />
                                        <span>{entry.name.split('/').pop()}</span>
                                    </div>
                                    <div className={s.fileItemMeta}>
                                        <span className={s.fileSize}>{formatBytes(entry.size)}</span>
                                        <button
                                            className={s.btnIcon}
                                            onClick={() => entry.dbName && handleDeleteFile(entry.dbName, entry.name)}
                                            disabled={deleting === entry.name}
                                            title="Delete file"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
