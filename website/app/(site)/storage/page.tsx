'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, HardDrive, RefreshCw, File } from 'lucide-react';
import s from '../admin/admin.module.css';

type StorageEntry = {
    name: string;
    size: number;
    type: 'file' | 'directory';
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

export default function StoragePage() {
    const [databases, setDatabases] = useState<DatabaseInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [clearing, setClearing] = useState(false);

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

    const totalSize = databases.reduce((sum, db) => sum + db.totalSize, 0);
    const gameFiles = databases
        .flatMap(db => db.entries)
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
