/* app/admin/page.tsx */
'use client';
import { useState } from 'react';
import { Trash2, Upload, Lock, FolderOpen, LogOut, File, AlertTriangle, X } from 'lucide-react';
import s from './admin.module.css';
import { Button } from '@/components/ui/button';
import { ADMIN_UPLOAD_LIMIT_MB } from '@/lib/constants';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [files, setFiles] = useState<{ name: string; size: number }[]>([]);
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [confirmFile, setConfirmFile] = useState<string | null>(null);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const modelFiles = files.filter(f => f.name.startsWith('model-'));
  const mapFiles = files.filter(f => !f.name.startsWith('model-'));

  const headers = { 'x-admin-password': password };

  async function login() {
    setError('');
    const res = await fetch('/api/baseq3', { headers });
    if (res.status === 401) setError('Wrong password');
    else if (res.status === 404) setError('Directory not found on server');
    else if (res.ok) {
      const data = await res.json();
      setFiles(data.files);
      setAuthed(true);
    } else {
      setError(`Unexpected error: ${res.status}`);
    }
  }

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

    const formData = new FormData();
    formData.append('file', file);

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
      xhr.setRequestHeader('x-admin-password', password);
      xhr.send(formData);
    });

    await login();
    setUploading(false);
    setUploadProgress(null);
    e.target.value = '';
  }

  function openConfirm(filename: string) {
    setConfirmFile(filename);
    setConfirmPassword('');
    setConfirmError('');
  }

  function closeConfirm() {
    setConfirmFile(null);
    setConfirmPassword('');
    setConfirmError('');
  }

  async function handleDelete() {
    if (confirmPassword !== password) {
      setConfirmError('Wrong password');
      return;
    }
    await fetch('/api/baseq3/delete', {
      method: 'DELETE',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: confirmFile })
    });
    closeConfirm();
    await login();
  }

  if (!authed) return (
    <div className={s.page}>
      <div className={s.card}>
        <div className={s.cardHeader}>
          <FolderOpen size={36} color="var(--primary)" />
          <h1>q3js-kob manager</h1>
          <p>Enter password to continue</p>
        </div>
        <div className={s.inputWrapper}>
          <Lock size={15} color="#555" className={s.inputIcon} />
          <input className={s.input} type="password" placeholder="Password"
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()} />
        </div>
        {error && <p className={s.error}>{error}</p>}
        <Button className="w-full" onClick={login}>Login</Button>
      </div>
    </div>
  );

  return (
    <div className={s.page}>
      <div className={s.container}>

        <div className={s.header}>
          <div className={s.headerTitle}>
            <FolderOpen size={24} color="var(--primary)" />
            <h1>q3js-kob manager</h1>
          </div>
          <Button variant="secondary" onClick={() => setAuthed(false)}>
            <LogOut size={13} /> Logout
          </Button>
        </div>

        <div>
          <p><small>NB! All custom model filenames must match the format "model-$NAME.pk3".</small></p>
          <p><small>Max file size: {ADMIN_UPLOAD_LIMIT_MB} MB.</small></p>
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
                        <button className={s.btnIcon} onClick={() => openConfirm(f.name)}>
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
                        <button className={s.btnIcon} onClick={() => openConfirm(f.name)}>
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
        <div className={s.backdrop} onClick={e => { if (e.target === e.currentTarget) closeConfirm(); }}>
          <div className={s.dialog}>
            <div className={s.dialogHeader}>
              <div className={s.dialogTitle}>
                <AlertTriangle size={20} color="var(--primary)" />
                <span>Confirm deletion</span>
              </div>
              <Button className={s.btnIcon} onClick={closeConfirm}><X size={16} /></Button>
            </div>
            <p className={s.dialogBody}>
              You are about to delete <em>{confirmFile}</em>. Enter your password to confirm.
            </p>
            <div className={s.inputWrapper}>
              <Lock size={15} color="#555" className={s.inputIcon} />
              <input className={s.input} type="password" placeholder="Enter password to confirm"
                value={confirmPassword} autoFocus
                onChange={e => { setConfirmPassword(e.target.value); setConfirmError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleDelete()} />
            </div>
            {confirmError && <p className={s.error}>{confirmError}</p>}
            <div className={s.dialogActions}>
              <Button variant="secondary" onClick={closeConfirm}>Cancel</Button>
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