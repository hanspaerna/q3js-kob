'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Trash2, Upload, FolderOpen, File, AlertTriangle, X, Download } from 'lucide-react';
import s from './admin.module.css';
import { Button } from '@/components/ui/button';
import { ADMIN_UPLOAD_LIMIT_MB } from '@/lib/constants';
import { hasManagerAccess } from '@/lib/auth';

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [files, setFiles] = useState<{ name: string; size: number }[]>([]);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [confirmFile, setConfirmFile] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadType, setUploadType] = useState<'skin' | 'map'>('skin');

  const modelFiles = files.filter(f => f.name.startsWith('model-'));
  const mapFiles = files.filter(f => !f.name.startsWith('model-'));

  async function loadFiles() {
    setError('');
    const res = await fetch('/api/baseq3');
    if (res.status === 401) {
      router.push('/');
    } else if (res.status === 404) {
      setError('Directory not found on server');
    } else if (res.ok) {
      const data = await res.json();
      setFiles(data.files);
    } else {
      setError(`Unexpected error: ${res.status}`);
    }
  }

  const hasAccess = hasManagerAccess(session?.user?.groups);

  useEffect(() => {
    if (status === 'authenticated' && hasAccess) {
      loadFiles();
    } else if (status === 'unauthenticated' || (status === 'authenticated' && !hasAccess)) {
      router.push('/');
    }
  }, [status, router, hasAccess]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    if (file.size > ADMIN_UPLOAD_LIMIT_MB * 1024 * 1024) {
      setUploadError(`File exceeds ${ADMIN_UPLOAD_LIMIT_MB} MB limit`);
      e.target.value = '';
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    // Add "model-" prefix for skins if not already present
    let uploadFile: File = file;
    if (uploadType === 'skin' && !file.name.startsWith('model-')) {
      const newName = `model-${file.name}`;
      uploadFile = new globalThis.File([file], newName, { type: file.type });
    }

    const formData = new FormData();
    formData.append('file', uploadFile);

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) resolve();
        else reject(new Error(xhr.responseText));
      });

      xhr.addEventListener('error', () => reject(new Error('Upload failed')));

      xhr.open('POST', '/api/baseq3/upload');
      xhr.send(formData);
    });

    await loadFiles();
    setUploading(false);
    setUploadProgress(null);
    e.target.value = '';
  }

  async function handleDelete() {
    await fetch('/api/baseq3/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: confirmFile })
    });
    setConfirmFile(null);
    await loadFiles();
  }

  if (status === 'loading') {
    return (
      <div className={s.page}>
        <div className={s.card}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!session || !hasAccess) {
    return null;
  }

  return (
    <div className={s.page}>
      <div className={s.container}>

        <div className={s.header}>
          <div className={s.headerTitle}>
            <FolderOpen size={24} color="var(--primary)" />
            <h1>Maps / Skins manager</h1>
          </div>
        </div>

        {error && <p className={s.error}>{error}</p>}

        <div>
          <p><small>Max file size: {ADMIN_UPLOAD_LIMIT_MB} MB.</small></p>
        </div>

        <div className={s.uploadTypeSwitch}>
          <button
            type="button"
            className={`${s.uploadTypeTab} ${uploadType === 'skin' ? s.active : ''}`}
            onClick={() => setUploadType('skin')}
          >
            Skin
          </button>
          <button
            type="button"
            className={`${s.uploadTypeTab} ${uploadType === 'map' ? s.active : ''}`}
            onClick={() => setUploadType('map')}
          >
            Map
          </button>
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
          ) : 'Click to upload a .pk3 file'}
          <input type="file" accept=".pk3" onChange={handleUpload} disabled={uploading} style={{ display: 'none' }} />
        </label>
        {uploadError && <p className={s.error}>{uploadError}</p>}

        <div className={s.fileLists}>
          <div className={s.fileColumn}>
            <h2 className={s.columnHeader}>Skins / Models</h2>
            <div className={s.fileList}>
              {modelFiles.length === 0
                ? <p className={s.emptyState}>No models found</p>
                : modelFiles.map(f => (
                    <div key={f.name} className={s.fileItem}>
                      <div className={s.fileItemName}>
                        <File size={14} color="var(--color-text-faint)" />
                        <span>{f.name}</span>
                      </div>
                      <div className={s.fileItemMeta}>
                        <span className={s.fileSize}>{formatBytes(f.size)}</span>
                        <a href={`/api/baseq3/${f.name}`} download className={s.btnIcon}>
                          <Download size={15} />
                        </a>
                        <button className={s.btnIcon} onClick={() => setConfirmFile(f.name)}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))
              }
            </div>
          </div>

          <div className={s.fileColumn}>
            <h2 className={s.columnHeader}>Maps</h2>
            <div className={s.fileList}>
              {mapFiles.length === 0
                ? <p className={s.emptyState}>No maps found</p>
                : mapFiles.map(f => (
                    <div key={f.name} className={s.fileItem}>
                      <div className={s.fileItemName}>
                        <File size={14} color="var(--color-text-faint)" />
                        <span>{f.name}</span>
                      </div>
                      <div className={s.fileItemMeta}>
                        <span className={s.fileSize}>{formatBytes(f.size)}</span>
                        <a href={`/api/baseq3/${f.name}`} download className={s.btnIcon}>
                          <Download size={15} />
                        </a>
                        <button className={s.btnIcon} onClick={() => setConfirmFile(f.name)}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))
              }
            </div>
          </div>
        </div>
      </div>

      {confirmFile && (
        <div className={s.backdrop} onClick={e => { if (e.target === e.currentTarget) setConfirmFile(null); }}>
          <div className={s.dialog}>
            <div className={s.dialogHeader}>
              <div className={s.dialogTitle}>
                <AlertTriangle size={20} color="var(--primary)" />
                <span>Confirm deletion</span>
              </div>
              <Button className={s.btnIcon} onClick={() => setConfirmFile(null)}><X size={16} /></Button>
            </div>
            <p className={s.dialogBody}>
              Are you sure you want to delete <em>{confirmFile}</em>?
            </p>
            <div className={s.dialogActions}>
              <Button variant="secondary" onClick={() => setConfirmFile(null)}>Cancel</Button>
              <Button className={s.btnPrimary} onClick={handleDelete}>
                <Trash2 size={13} /> Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}
