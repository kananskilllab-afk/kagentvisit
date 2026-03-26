import React, { useState } from 'react';
import imageCompression from 'browser-image-compression';
import api from '../../utils/api';
import { Camera, Image as ImageIcon, X, Loader2, CheckCircle2, AlertCircle, UploadCloud } from 'lucide-react';

const PhotoUpload = ({ value, onChange, disabled }) => {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const [preview, setPreview] = useState(value || null);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Reset state
        setError(null);
        setUploading(true);

        try {
            // 1. Compression Options
            const options = {
                maxSizeMB: 1,           // Try to keep it around 1MB
                maxWidthOrHeight: 1280, // Reasonable resolution
                useWebWorker: true,
                initialQuality: 0.8
            };

            // 2. Compress the image
            const compressedFile = await imageCompression(file, options);
            
            // 3. Create preview for UI
            const previewUrl = URL.createObjectURL(compressedFile);
            setPreview(previewUrl);

            // 4. Upload to our server
            const formData = new FormData();
            formData.append('photo', compressedFile, 'visit_photo.jpg');

            const response = await api.post('/upload', formData);

            if (response.data?.success) {
                const finalUrl = response.data.data.url;
                onChange(finalUrl); // Update form state
                setPreview(finalUrl); // Use finalized server URL
            } else {
                throw new Error('Upload failed');
            }

        } catch (err) {
            console.error('Photo processing/upload failed:', err);
            setError(err.message || 'Failed to process or upload image');
            setPreview(value); // Revert to previous value
        } finally {
            setUploading(false);
        }
    };

    const clearPhoto = () => {
        if (disabled) return;
        onChange('');
        setPreview(null);
        setError(null);
    };

    return (
        <div className="space-y-3">
            <div className="relative group">
                {preview ? (
                    <div className="card p-0 overflow-hidden relative aspect-video sm:aspect-[4/3] bg-slate-100 flex items-center justify-center border-2 border-dashed border-slate-200">
                        <img 
                            src={preview} 
                            alt="Visit preview" 
                            className="w-full h-full object-cover"
                        />
                        {!disabled && !uploading && (
                            <button
                                onClick={clearPhoto}
                                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                        {uploading && (
                            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] flex flex-col items-center justify-center text-white p-4">
                                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                <p className="text-sm font-bold animate-pulse">Compressing & Uploading...</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <label className={`
                        flex flex-col items-center justify-center p-8 sm:p-12 border-2 border-dashed rounded-3xl transition-all cursor-pointer
                        ${error ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50 hover:bg-blue-50/50 hover:border-brand-sky/40 group'}
                        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                    `}>
                        <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileChange}
                            disabled={disabled || uploading}
                            capture="environment" // Hint for mobile to open camera
                        />
                        <div className="p-4 rounded-2xl bg-white shadow-card-sm border border-slate-100 mb-4 group-hover:scale-110 transition-transform">
                            <Camera className="w-8 h-8 text-brand-sky" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-bold text-slate-700">Tap to Take Photo</p>
                            <p className="text-xs text-slate-400 mt-1">or browse gallery</p>
                        </div>
                        <div className="mt-6 flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-100 shadow-sm text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            <UploadCloud className="w-3 h-3" />
                            High Res. Compression Active
                        </div>
                    </label>
                )}
            </div>

            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-semibold animate-slide-up">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                </div>
            )}

            {preview && !uploading && !error && (
                <div className="flex items-center gap-2 py-1 text-brand-green text-[10px] font-bold uppercase tracking-wider">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Photo Verified & Uploaded
                </div>
            )}
        </div>
    );
};

export default PhotoUpload;
