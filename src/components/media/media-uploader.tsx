'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  FileText,
  Loader2,
  Trash2,
  Link2,
  FolderOpen,
  Info,
  Image as ImageIcon,
  Film,
  FileArchive,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface MediaUploaderProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  description?: string;
  className?: string;
}

export function MediaUploader({
  value,
  onChange,
  label = 'Asset Mentah / Lampiran Cloud (Opsional)',
  description = 'File otomatis diunggah ke Cloudinary CDN (25 GB gratis) tanpa membebani server hosting/database.',
  className = '',
}: MediaUploaderProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'link'>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileSize, setUploadedFileSize] = useState<string | null>(null);
  const [uploadedType, setUploadedType] = useState<'image' | 'video' | 'raw' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [showConfigHelper, setShowConfigHelper] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Periksa apakah Cloudinary API sudah terkonfigurasi di server
  useEffect(() => {
    fetch('/api/cloudinary/upload')
      .then((res) => res.json())
      .then((data) => {
        setIsConfigured(Boolean(data.configured));
        if (!data.configured && !value) {
          // Jika belum dikonfigurasi, arahkan default tab ke link manual
          setActiveTab('link');
        }
      })
      .catch(() => {
        setIsConfigured(false);
      });
  }, [value]);

  // Deteksi nama file dan tipe dari URL yang sudah ada
  useEffect(() => {
    if (value && !uploadedFileName) {
      try {
        const urlObj = new URL(value);
        const segments = urlObj.pathname.split('/');
        const lastSegment = segments[segments.length - 1];
        setUploadedFileName(decodeURIComponent(lastSegment) || 'Lampiran Cloud');
        if (value.match(/\.(jpg|jpeg|png|gif|webp|svg)/i)) {
          setUploadedType('image');
        } else if (value.match(/\.(mp4|mov|webm|avi|mkv)/i)) {
          setUploadedType('video');
        } else {
          setUploadedType('raw');
        }
      } catch {
        setUploadedFileName('Tautan Lampiran');
      }
    }
  }, [value, uploadedFileName]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await uploadFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setErrorMessage(null);
    setUploadProgress(20);

    const formData = new FormData();
    formData.append('file', file);

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => (prev < 90 ? prev + 15 : prev));
    }, 250);

    try {
      const response = await fetch('/api/cloudinary/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      const data = await response.json();

      if (!response.ok || !data.success) {
        if (data.notConfigured) {
          setIsConfigured(false);
          setShowConfigHelper(true);
        }
        throw new Error(data.error || 'Gagal mengunggah file ke Cloudinary');
      }

      setUploadProgress(100);
      setUploadedFileName(data.file.fileName);
      setUploadedType(data.file.resourceType);

      if (data.file.size) {
        const bytes = data.file.size;
        setUploadedFileSize(
          bytes > 1024 * 1024
            ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
            : `${Math.round(bytes / 1024)} KB`
        );
      } else {
        setUploadedFileSize(
          file.size > 1024 * 1024
            ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
            : `${Math.round(file.size / 1024)} KB`
        );
      }

      onChange(data.file.url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kegagalan saat upload';
      setErrorMessage(msg);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    onChange('');
    setUploadedFileName(null);
    setUploadedFileSize(null);
    setUploadedType(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="space-y-0.5">
          <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <UploadCloud className="h-3.5 w-3.5" />
            </span>
            {label}
          </label>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{description}</p>
        </div>

        {/* Tab Toggle: Upload Langsung vs Link Manual */}
        <div className="flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
              activeTab === 'upload'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Upload File (Cloudinary)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('link')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
              activeTab === 'link'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Paste Tautan
          </button>
        </div>
      </div>

      {/* Info jika Cloudinary belum dikonfigurasi */}
      {isConfigured === false && showConfigHelper && (
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/70 dark:bg-indigo-950/40 p-3.5 text-xs text-indigo-900 dark:text-indigo-200 space-y-1.5 animate-in fade-in-50">
          <div className="flex items-center gap-2 font-semibold text-indigo-900 dark:text-indigo-100">
            <Info className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>Kredensial Cloudinary Belum Diisi</span>
          </div>
          <p className="leading-relaxed text-indigo-800 dark:text-indigo-300">
            Daftar gratis di{' '}
            <a
              href="https://cloudinary.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline hover:text-indigo-600"
            >
              cloudinary.com
            </a>{' '}
            (dapat 25 GB gratis), lalu salin 3 variabel berikut ke file{' '}
            <code className="bg-indigo-100 dark:bg-indigo-900/80 px-1 py-0.5 rounded font-mono font-semibold">
              .env.local
            </code>
            :
          </p>
          <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg font-mono text-[11px] text-slate-800 dark:text-slate-200 space-y-1 border border-indigo-100 dark:border-indigo-900">
            <div>CLOUDINARY_CLOUD_NAME=nama_cloud_anda</div>
            <div>CLOUDINARY_API_KEY=api_key_anda</div>
            <div>CLOUDINARY_API_SECRET=api_secret_anda</div>
          </div>
          <p className="text-[11px] text-indigo-600 dark:text-indigo-400 pt-1 flex items-start gap-1.5">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span><em>Sebelum mengisi, Anda tetap dapat menggunakan tab <strong>Paste Tautan</strong> di atas untuk menempelkan link Google Drive/Dropbox secara bebas.</em></span>
          </p>
        </div>
      )}

      {/* Tampilan Jika File Sudah Terpilih / Terisi */}
      {value ? (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/20 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in-50">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 overflow-hidden">
              {uploadedType === 'image' && value.startsWith('http') ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={value}
                  alt="Preview"
                  className="h-full w-full object-cover"
                />
              ) : uploadedType === 'video' ? (
                <Film className="h-5 w-5" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
            </div>
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                  {uploadedFileName || 'Lampiran Terunggah'}
                </span>
                <Badge variant="outline" className="border-emerald-300 dark:border-emerald-800 text-[10px] text-emerald-700 dark:text-emerald-300 shrink-0">
                  {value.includes('cloudinary.com') ? 'Cloudinary CDN' : 'Cloud Link'}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-sm sm:max-w-md font-mono">
                {value}
              </p>
              {uploadedFileSize && (
                <span className="text-[10px] text-slate-400">Ukuran: {uploadedFileSize}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-600 transition-colors shadow-2xs"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Buka File
            </a>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemove}
              className="h-8 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-slate-200 dark:border-slate-800"
              title="Hapus file ini"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : activeTab === 'upload' ? (
        /* Dropzone Upload Langsung */
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`relative rounded-xl border-2 border-dashed p-6 transition-all text-center cursor-pointer ${
            isUploading
              ? 'border-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/20 cursor-wait'
              : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 bg-slate-50/40 dark:bg-slate-950/30 hover:bg-slate-50 dark:hover:bg-slate-900/60'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading}
          />

          {isUploading ? (
            <div className="space-y-3 py-2">
              <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mx-auto" />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Mengunggah ke Cloudinary CDN...
                </p>
                <div className="w-48 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400">Mengoptimalkan CDN & menghasilkan link</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 mx-auto shadow-2xs">
                <UploadCloud className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Klik untuk pilih file atau seret & lepas (Drag & Drop) di sini
                </p>
                <p className="text-[11px] text-slate-400">
                  Mendukung Foto (PNG, JPG, SVG), Video (MP4, MOV), Audio, PDF, ZIP, PSD, dll. (Maksimal 100 MB)
                </p>
              </div>
              <div className="pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 gap-1.5 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 hover:bg-indigo-50"
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                  Pilih File dari Komputer
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Mode Paste Link Manual */
        <div className="space-y-2">
          <div className="relative">
            <Link2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              id="cloud-media-link-input"
              type="url"
              placeholder="https://drive.google.com/... https://dropbox.com/... atau https://res.cloudinary.com/..."
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>
          <p className="text-[11px] text-slate-400">
            Tempelkan link Google Drive, Dropbox, Figma, atau cloud storage lainnya jika file sudah tersedia secara daring.
          </p>
        </div>
      )}

      {/* Pesan Error jika Upload Gagal */}
      {errorMessage && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs animate-in fade-in-50">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setActiveTab('link')}
            className="text-xs h-7 self-start sm:self-auto shrink-0 bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 font-semibold"
          >
            Beralih ke Paste Tautan
          </Button>
        </div>
      )}
    </div>
  );
}
