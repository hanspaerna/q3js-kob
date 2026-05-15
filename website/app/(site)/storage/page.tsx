'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, HardDrive, RefreshCw, File, Upload, Folder, ChevronRight, FolderPlus, Download } from 'lucide-react';
import s from '../serverfs/admin.module.css';

type StorageEntry = {
    name: string;
    path: string;
    size: number;
    type: 'file' | 'directory';
    dbName: string;
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
                            const path = typeof cursor.key === 'string' ? cursor.key : String(cursor.key);
                            const name = path.split('/').pop() || path;

                            if (value && typeof value === 'object' && 'contents' in value) {
                                entries.push({
                                    name,
                                    path,
                                    size: value.contents?.byteLength ?? value.contents?.length ?? 0,
                                    type: 'file',
                                    dbName,
                                });
                            } else if (value && typeof value === 'object' && 'mode' in value) {
                                const isDir = (value.mode & 0o170000) === 0o040000;
                                entries.push({
                                    name,
                                    path,
                                    size: 0,
                                    type: isDir ? 'directory' : 'file',
                                    dbName,
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

async function uploadFileToIDB(dbName: string, folderPath: string, fileName: string, data: Uint8Array): Promise<boolean> {
    const filePath = `${folderPath}/${fileName}`;

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

async function createFolderInIDB(dbName: string, folderPath: string): Promise<boolean> {
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

            const storeName = storeNames[0];

            try {
                const tx = db.transaction(storeName, 'readwrite');
                const store = tx.objectStore(storeName);

                // Emscripten IDBFS directory format
                const entry = {
                    mode: 16877, // 0o40755 - directory with rwxr-xr-x
                    timestamp: new Date(),
                };

                const putReq = store.put(entry, folderPath);

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

async function downloadFile(dbName: string, filePath: string): Promise<void> {
    return new Promise((resolve) => {
        const request = indexedDB.open(dbName);

        request.onerror = () => resolve();

        request.onsuccess = () => {
            const db = request.result;
            const storeNames = Array.from(db.objectStoreNames);

            if (storeNames.length === 0) {
                db.close();
                resolve();
                return;
            }

            const storeName = storeNames[0];

            try {
                const tx = db.transaction(storeName, 'readonly');
                const store = tx.objectStore(storeName);
                const getReq = store.get(filePath);

                getReq.onsuccess = () => {
                    const value = getReq.result;
                    db.close();

                    if (value && value.contents) {
                        const blob = new Blob([value.contents], { type: 'application/octet-stream' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = filePath.split('/').pop() || 'file';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                    }
                    resolve();
                };

                getReq.onerror = () => {
                    db.close();
                    resolve();
                };
            } catch {
                db.close();
                resolve();
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
    const [currentPath, setCurrentPath] = useState<string | null>(null); // null = root (show databases)
    const [deleting, setDeleting] = useState<string | null>(null);
    const [newFolderName, setNewFolderName] = useState('');
    const [creatingFolder, setCreatingFolder] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

    const loadStorage = useCallback(async () => {
        setLoading(true);
        const dbs = await listIDBDatabases();
        setDatabases(dbs);
        setLoading(false);
    }, []);

    useEffect(() => {
        loadStorage();
    }, [loadStorage]);

    // Clear selection when path changes
    useEffect(() => {
        setSelectedFiles(new Set());
    }, [currentPath]);

    const handleClear = async () => {
        if (!confirm('Are you sure you want to clear all cached game files? You will need to re-download them.')) {
            return;
        }
        setClearing(true);
        await clearAllStorage();
        setCurrentPath(null);
        await loadStorage();
        setClearing(false);
    };

    // Find the database name from current path (first path segment like /baseq3)
    const currentDbName = currentPath ? '/' + currentPath.split('/').filter(Boolean)[0] : null;
    const currentDb = currentDbName ? databases.find(db => db.name === currentDbName) : null;

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0 || !currentPath || !currentDbName) return;

        setUploadError(null);
        setUploading(true);
        setUploadProgress(0);

        const totalFiles = files.length;
        let uploadedCount = 0;
        let failedCount = 0;

        try {
            for (const file of Array.from(files)) {
                const buffer = await file.arrayBuffer();
                const data = new Uint8Array(buffer);
                const success = await uploadFileToIDB(currentDbName, currentPath, file.name, data);

                if (success) {
                    uploadedCount++;
                } else {
                    failedCount++;
                }

                setUploadProgress(Math.round((uploadedCount + failedCount) / totalFiles * 100));
            }

            await loadStorage();

            if (failedCount > 0) {
                setUploadError(`${failedCount} of ${totalFiles} files failed to upload.`);
            }
        } catch (err) {
            setUploadError(err instanceof Error ? err.message : 'Upload failed');
        }

        setUploading(false);
        setUploadProgress(null);
        e.target.value = '';
    };

    const handleDeleteFile = async (dbName: string, filePath: string) => {
        if (!confirm(`Delete ${filePath.split('/').pop()}?`)) {
            return;
        }
        setDeleting(filePath);
        await deleteFile(dbName, filePath);
        await loadStorage();
        setDeleting(null);
    };

    const handleDeleteFolder = async (dbName: string, folderPath: string) => {
        // Find all entries inside this folder
        const db = databases.find(d => d.name === dbName);
        const entriesInFolder = db?.entries.filter(e => e.path.startsWith(folderPath + '/') || e.path === folderPath) ?? [];
        const fileCount = entriesInFolder.filter(e => e.type === 'file').length;

        const message = fileCount > 0
            ? `Delete folder "${folderPath.split('/').pop()}" and its ${fileCount} file(s)?`
            : `Delete folder "${folderPath.split('/').pop()}"?`;

        if (!confirm(message)) {
            return;
        }

        setDeleting(folderPath);

        // Delete all entries inside the folder (including the folder itself)
        for (const entry of entriesInFolder) {
            await deleteFile(dbName, entry.path);
        }

        await loadStorage();
        setDeleting(null);
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim() || !currentPath || !currentDbName) return;

        const sanitizedName = newFolderName.trim().replace(/[/\\]/g, '');
        if (!sanitizedName) return;

        setCreatingFolder(true);
        const folderPath = `${currentPath}/${sanitizedName}`;
        const success = await createFolderInIDB(currentDbName, folderPath);

        if (success) {
            setNewFolderName('');
            await loadStorage();
        } else {
            setUploadError('Failed to create folder.');
        }

        setCreatingFolder(false);
    };

    const toggleFileSelection = (path: string) => {
        setSelectedFiles(prev => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    };

    const handleDeleteSelected = async () => {
        if (selectedFiles.size === 0 || !currentDbName) return;

        if (!confirm(`Delete ${selectedFiles.size} selected file(s)?`)) {
            return;
        }

        setDeleting('multiple');

        for (const filePath of selectedFiles) {
            await deleteFile(currentDbName, filePath);
        }

        setSelectedFiles(new Set());
        await loadStorage();
        setDeleting(null);
    };

    const selectAllFiles = () => {
        const allFilePaths = files.map(f => f.path);
        setSelectedFiles(new Set(allFilePaths));
    };

    const clearSelection = () => {
        setSelectedFiles(new Set());
    };

    const totalSize = databases.reduce((sum, db) => sum + db.totalSize, 0);

    // Get entries for current path
    const allEntries = currentDb?.entries ?? [];

    // Filter entries that are direct children of current path
    const getEntriesForPath = (entries: StorageEntry[], path: string) => {
        const pathWithSlash = path.endsWith('/') ? path : path + '/';

        // Get all entries that start with current path
        const childEntries = entries.filter(e => e.path.startsWith(pathWithSlash) && e.path !== path);

        // Group by immediate child (could be file or folder)
        const immediateChildren = new Map<string, StorageEntry>();

        for (const entry of childEntries) {
            const relativePath = entry.path.slice(pathWithSlash.length);
            const firstSegment = relativePath.split('/')[0];
            const isNestedDeeper = relativePath.includes('/');

            if (!immediateChildren.has(firstSegment)) {
                if (isNestedDeeper) {
                    // This is a virtual folder (path segment leading to deeper files)
                    immediateChildren.set(firstSegment, {
                        name: firstSegment,
                        path: pathWithSlash + firstSegment,
                        size: 0,
                        type: 'directory',
                        dbName: entry.dbName,
                    });
                } else {
                    immediateChildren.set(firstSegment, entry);
                }
            }
        }

        return Array.from(immediateChildren.values());
    };

    const currentEntries = currentPath ? getEntriesForPath(allEntries, currentPath) : [];
    const folders = currentEntries.filter(e => e.type === 'directory');
    const files = currentEntries.filter(e => e.type === 'file');

    // Breadcrumb parts
    const breadcrumbs = currentPath ? currentPath.split('/').filter(Boolean) : [];

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

                {/* Breadcrumb navigation */}
                <div className={s.breadcrumb} style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => setCurrentPath(null)}
                        className={s.breadcrumbItem}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: currentPath ? 'var(--primary)' : 'inherit',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                        }}
                    >
                        <HardDrive size={14} style={{ marginRight: '4px' }} />
                        Root
                    </button>
                    {breadcrumbs.map((part, index) => {
                        const pathUpToHere = '/' + breadcrumbs.slice(0, index + 1).join('/');
                        const isLast = index === breadcrumbs.length - 1;
                        return (
                            <span key={index} style={{ display: 'flex', alignItems: 'center' }}>
                                <ChevronRight size={14} color="var(--muted-foreground)" />
                                {isLast ? (
                                    <span style={{ padding: '4px 8px' }}>{part}</span>
                                ) : (
                                    <button
                                        onClick={() => setCurrentPath(pathUpToHere)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: 'var(--primary)',
                                            padding: '4px 8px',
                                        }}
                                    >
                                        {part}
                                    </button>
                                )}
                            </span>
                        );
                    })}
                </div>

                {/* Upload and folder creation - only show when inside a folder */}
                {currentPath && (
                    <>
                        <label className={`${s.uploadLabel} ${uploading ? s.disabled : ''}`}>
                            <Upload size={18} color={uploading ? '#555' : 'var(--primary)'} />
                            {uploading ? (
                                <div className={s.progressWrapper}>
                                    <span>{uploadProgress}%</span>
                                    <div className={s.progressBar}>
                                        <div className={s.progressFill} style={{ width: `${uploadProgress}%` }} />
                                    </div>
                                </div>
                            ) : `Click to upload files`}
                            <input type="file" multiple onChange={handleUpload} disabled={uploading} style={{ display: 'none' }} />
                        </label>
                        {uploadError && <p className={s.error}>{uploadError}</p>}
                    </>
                )}

                <div className={s.fileColumn}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                        <h2 className={s.columnHeader} style={{ margin: 0 }}>
                            {currentPath ? `Files in ${currentPath}` : 'Game Directories'}
                        </h2>
                        {currentPath && (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                    <Input
                                        placeholder="New folder name"
                                        value={newFolderName}
                                        onChange={(e) => setNewFolderName(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                                        disabled={creatingFolder}
                                        style={{ width: '150px' }}
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleCreateFolder}
                                        disabled={creatingFolder || !newFolderName.trim()}
                                    >
                                        <FolderPlus size={16} />
                                    </Button>
                                </div>
                                {files.length > 0 && (
                                    <>
                                        {selectedFiles.size > 0 && (
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={handleDeleteSelected}
                                                disabled={deleting === 'multiple'}
                                            >
                                                <Trash2 size={14} style={{ marginRight: '4px' }} />
                                                Delete {selectedFiles.size}
                                            </Button>
                                        )}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={selectedFiles.size === files.length ? clearSelection : selectAllFiles}
                                        >
                                            {selectedFiles.size === files.length ? 'Deselect all' : 'Select all files'}
                                        </Button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                    <div className={s.fileList}>
                        {loading ? (
                            <p className={s.emptyState}>Loading storage info...</p>
                        ) : !currentPath ? (
                            // Show database folders at root level
                            databases.length === 0 ? (
                                <p className={s.emptyState}>No cached game files found.</p>
                            ) : (
                                databases.map((db) => (
                                    <div
                                        key={db.name}
                                        className={s.fileItem}
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => setCurrentPath(db.name)}
                                    >
                                        <div className={s.fileItemName}>
                                            <Folder size={14} color="var(--primary)" />
                                            <span>{db.name}</span>
                                        </div>
                                        <div className={s.fileItemMeta}>
                                            <span className={s.fileSize}>{formatBytes(db.totalSize)}</span>
                                            <span style={{ color: 'var(--muted-foreground)', fontSize: '12px' }}>
                                                {db.entries.filter(e => e.type === 'file').length} files
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )
                        ) : (
                            // Show contents of current folder
                            <>
                                {folders.length === 0 && files.length === 0 ? (
                                    <p className={s.emptyState}>This folder is empty.</p>
                                ) : (
                                    <>
                                        {folders.map((entry) => (
                                            <div
                                                key={entry.path}
                                                className={s.fileItem}
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => setCurrentPath(entry.path)}
                                            >
                                                <div className={s.fileItemName}>
                                                    <Folder size={14} color="var(--primary)" />
                                                    <span>{entry.name}</span>
                                                </div>
                                                <div className={s.fileItemMeta}>
                                                    <button
                                                        className={s.btnIcon}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteFolder(entry.dbName, entry.path);
                                                        }}
                                                        disabled={deleting === entry.path}
                                                        title="Delete folder"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {files.map((entry) => (
                                            <div
                                                key={entry.path}
                                                className={s.fileItem}
                                                style={{ backgroundColor: selectedFiles.has(entry.path) ? 'var(--accent)' : undefined }}
                                            >
                                                <div className={s.fileItemName}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedFiles.has(entry.path)}
                                                        onChange={() => toggleFileSelection(entry.path)}
                                                        style={{ marginRight: '8px', cursor: 'pointer' }}
                                                    />
                                                    <File size={14} color="var(--muted-foreground)" />
                                                    <span>{entry.name}</span>
                                                </div>
                                                <div className={s.fileItemMeta}>
                                                    <span className={s.fileSize}>{formatBytes(entry.size)}</span>
                                                    <button
                                                        className={s.btnIcon}
                                                        onClick={() => downloadFile(entry.dbName, entry.path)}
                                                        title="Download file"
                                                    >
                                                        <Download size={14} />
                                                    </button>
                                                    <button
                                                        className={s.btnIcon}
                                                        onClick={() => handleDeleteFile(entry.dbName, entry.path)}
                                                        disabled={deleting === entry.path || deleting === 'multiple'}
                                                        title="Delete file"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
