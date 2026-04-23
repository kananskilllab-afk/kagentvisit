import React, { useRef, useState } from 'react';
import { Upload, X, FileText, Loader2, AlertCircle, Plus } from 'lucide-react';
import api from '../../utils/api';

const MAX_FILE_SIZE_MB = 10;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];

function FilePreview({ file, onRemove }) {
    const isPdf = file.mimeType === 'application/pdf' || file.url?.endsWith('.pdf');

    return (
        <div className="relative group w-20 h-20 flex-shrink-0">
            {isPdf ? (
                <div className="w-full h-full rounded-lg border-2 border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-1">
                    <FileText className="w-6 h-6 text-slate-400" />
                    <span className="text-[10px] text-slate-400 text-center leading-tight px-1 truncate w-full text-center">
                        {file.name || 'PDF'}
                    </span>
                </div>
            ) : (
                <img
                    src={file.url}
                    alt={file.name || 'Receipt'}
                    className="w-full h-full object-cover rounded-lg border-2 border-slate-200"
                />
            )}

            {/* Remove button */}
            {onRemove && (
                <button
                    type="button"
                    onClick={() => onRemove(file.url)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full
                        flex items-center justify-center opacity-0 group-hover:opacity-100
                        transition-opacity shadow-sm hover:bg-red-600"
                >
                    <X className="w-3 h-3" />
                </button>
            )}

            {/* Uploading overlay */}
            {file.uploading && (
                <div className="absolute inset-0 bg-white/70 rounded-lg flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-brand-blue animate-spin" />
                </div>
            )}
        </div>
    );
}

/**
 * ImageUpload — reusable multi-file upload component.
 *
 * Props:
 *   urls: string[]          — current uploaded URLs (controlled)
 *   onChange: (urls) => void — called with new full array whenever files change
 *   maxFiles: number        — default 5
 *   label: string           — defaults to "Upload Receipts"
 *   context: string         — passed to /api/uploads/register (e.g. 'expense_receipt')
 *   refModel / refId        — passed to /api/uploads/register if provided
 *   disabled: boolean
 */
export default function ImageUpload({
    urls = [],
    onChange,
    maxFiles = 5,
    label = 'Upload Receipts',
    context = 'expense_receipt',
    refModel,
    refId,
    disabled = false,
}) {
    const inputRef = useRef();
    // files: Array<{ url, name, mimeType, uploading, error }>
    const [files, setFiles] = useState(() =>
        urls.map(u => typeof u === 'string' ? { url: u, uploadId: null, name: '', mimeType: '', uploading: false } : { ...u, name: '', mimeType: '', uploading: false })
    );
    const [globalError, setGlobalError] = useState('');

    const canAddMore = files.length < maxFiles;

    const uploadOne = async (file) => {
        // Client validation
        if (!ACCEPTED_TYPES.includes(file.type)) {
            return { error: `${file.name}: unsupported file type (use JPG, PNG, WebP, or PDF)` };
        }
        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
            return { error: `${file.name}: exceeds ${MAX_FILE_SIZE_MB} MB limit` };
        }

        const fd = new FormData();
        fd.append('photo', file);

        try {
            const res = await api.post('/upload', fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const data = res.data?.data;
            if (!data?.url) throw new Error('Upload response missing URL');

            let uploadId = null;
            // Persist Upload record for audit trail
            try {
                const regRes = await api.post('/uploads/register', {
                    url: data.url,
                    publicId: data.publicId || null,
                    provider: data.provider || 'cloudinary',
                    context,
                    refModel: refModel || null,
                    refId: refId || null,
                    mimeType: data.mimeType || file.type,
                    sizeBytes: data.sizeBytes || file.size,
                    originalName: data.originalName || file.name,
                });
                if (regRes.data?.data?._id) {
                    uploadId = regRes.data.data._id;
                }
            } catch (_) { /* non-fatal — upload itself succeeded */ }

            return { url: data.url, name: file.name, mimeType: file.type, uploadId };
        } catch (err) {
            return { error: `${file.name}: ${err.response?.data?.message || err.message}` };
        }
    };

    const handleFiles = async (selectedFiles) => {
        setGlobalError('');
        const incoming = Array.from(selectedFiles);
        const available = maxFiles - files.filter(f => !f.error).length;

        if (incoming.length > available) {
            setGlobalError(`You can add ${available} more file${available !== 1 ? 's' : ''} (max ${maxFiles}).`);
            return;
        }

        // Add placeholder entries with uploading=true
        const placeholders = incoming.map(f => ({
            url: URL.createObjectURL(f),  // local preview while uploading
            name: f.name,
            mimeType: f.type,
            uploading: true,
            localOnly: true,
        }));

        setFiles(prev => [...prev, ...placeholders]);

        // Upload sequentially and replace placeholders with real URLs
        const results = [];
        for (let i = 0; i < incoming.length; i++) {
            const result = await uploadOne(incoming[i]);
            results.push({ ...result, originalLocal: placeholders[i].url });
        }

        setFiles(prev => {
            const updated = prev.map(f => {
                const match = results.find(r => r.originalLocal === f.url);
                if (!match) return f;
                if (match.error) return { ...f, uploading: false, error: match.error };
                return { url: match.url, name: match.name, mimeType: match.mimeType, uploadId: match.uploadId, uploading: false };
            });
            // Report errors
            const errors = results.filter(r => r.error).map(r => r.error);
            if (errors.length) setGlobalError(errors.join(' · '));
            // Notify parent with final URLs and uploadIds
            const validFiles = updated
                .filter(f => !f.uploading && !f.error && !f.localOnly)
                .map(f => ({ url: f.url, uploadId: f.uploadId }));
            onChange?.(validFiles);
            return updated;
        });
    };

    const handleDrop = (e) => {
        e.preventDefault();
        if (disabled) return;
        handleFiles(e.dataTransfer.files);
    };

    const handleRemove = (url) => {
        setFiles(prev => {
            const updated = prev.filter(f => f.url !== url);
            onChange?.(updated.filter(f => !f.uploading && !f.error && !f.localOnly).map(f => ({ url: f.url, uploadId: f.uploadId })));
            return updated;
        });
    };

    const errorFiles = files.filter(f => f.error);

    return (
        <div className="space-y-3">
            {/* Preview grid */}
            {files.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {files.map((f, i) => (
                        <FilePreview
                            key={f.url + i}
                            file={f}
                            onRemove={!disabled ? handleRemove : null}
                        />
                    ))}
                </div>
            )}

            {/* Upload zone */}
            {canAddMore && !disabled && (
                <label
                    className="flex flex-col items-center gap-2 px-4 py-5 rounded-xl border-2 border-dashed
                        border-slate-200 text-slate-400 hover:border-brand-blue hover:text-brand-blue
                        cursor-pointer transition-all group"
                    onDragOver={e => e.preventDefault()}
                    onDrop={handleDrop}
                >
                    <input
                        ref={inputRef}
                        type="file"
                        className="hidden"
                        accept={ACCEPTED_TYPES.join(',')}
                        multiple
                        onChange={e => handleFiles(e.target.files)}
                    />
                    <div className="w-9 h-9 rounded-full bg-slate-100 group-hover:bg-blue-50 flex items-center justify-center transition-colors">
                        <Upload className="w-4 h-4" />
                    </div>
                    <div className="text-center">
                        <p className="text-xs font-semibold">{label}</p>
                        <p className="text-[10px] mt-0.5 text-slate-400">
                            JPG, PNG, WebP or PDF · max {MAX_FILE_SIZE_MB} MB each
                            {maxFiles > 1 && ` · up to ${maxFiles} files`}
                        </p>
                    </div>
                </label>
            )}

            {/* Per-file errors */}
            {errorFiles.map((f, i) => (
                <div key={i} className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    {f.error}
                    <button type="button" onClick={() => handleRemove(f.url)} className="ml-auto text-red-400 hover:text-red-600">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            ))}

            {/* Global error */}
            {globalError && (
                <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {globalError}
                </div>
            )}
        </div>
    );
}
