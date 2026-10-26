'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Camera,
  User,
  Image as ImageIcon,
  Link2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  NarasumberItem,
  parseNarasumberData,
  serializeNarasumberData,
} from '@/lib/narasumber-helper';

interface NarasumberUploaderProps {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  description?: string;
  className?: string;
}

export function NarasumberUploader({
  value = '',
  onChange,
  label = 'Foto & Data Narasumber (Maksimal 3 Orang)',
  description = 'Upload secara bergantian untuk menghindari kegagalan, dan pastikan nama dan foto narasumber sudah sesuai',
  className = '',
}: NarasumberUploaderProps) {
  const [items, setItems] = useState<NarasumberItem[]>(() => parseNarasumberData(value));
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<{ [index: number]: string | null }>({});
  const [activeUrlInput, setActiveUrlInput] = useState<{ [index: number]: boolean }>({});
  const [manualUrls, setManualUrls] = useState<{ [index: number]: string }>({});

  const fileInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Sinkronisasi state internal saat prop value berubah dari luar (misal saat reset form atau edit modal)
  useEffect(() => {
    const parsed = parseNarasumberData(value);
    setItems(parsed);
  }, [value]);

  const updateItems = (newItems: NarasumberItem[]) => {
    setItems(newItems);
    const serialized = serializeNarasumberData(newItems);
    onChange(serialized);
  };

  const handleNameChange = (index: number, newName: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], nama: newName };
    updateItems(updated);
  };

  const handleClearSlot = (index: number) => {
    const updated = [...items];
    updated[index] = { id: index + 1, nama: '', fotoUrl: '' };
    setErrorMessage((prev) => ({ ...prev, [index]: null }));
    setActiveUrlInput((prev) => ({ ...prev, [index]: false }));
    setManualUrls((prev) => ({ ...prev, [index]: '' }));
    updateItems(updated);
  };

  const handleClearPhoto = (index: number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], fotoUrl: '' };
    setErrorMessage((prev) => ({ ...prev, [index]: null }));
    updateItems(updated);
  };

  const handleFileSelect = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadPhoto(index, file);
    if (fileInputRefs[index].current) {
      fileInputRefs[index].current!.value = '';
    }
  };

  const handleDrop = async (index: number, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await uploadPhoto(index, file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const uploadPhoto = async (index: number, file: File) => {
    // Validasi tipe file foto
    if (!file.type.startsWith('image/')) {
      setErrorMessage((prev) => ({
        ...prev,
        [index]: 'File harus berupa gambar (JPG, PNG, WebP).',
      }));
      return;
    }

    setUploadingIndex(index);
    setErrorMessage((prev) => ({ ...prev, [index]: null }));

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/cloudinary/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengunggah foto ke Cloudinary');
      }

      const uploadedUrl = data.file.url;
      const updated = [...items];
      updated[index] = { ...updated[index], fotoUrl: uploadedUrl };
      updateItems(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kegagalan upload foto';
      setErrorMessage((prev) => ({ ...prev, [index]: msg }));
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleApplyManualUrl = (index: number) => {
    const url = manualUrls[index]?.trim();
    if (!url) return;
    const updated = [...items];
    updated[index] = { ...updated[index], fotoUrl: url };
    setActiveUrlInput((prev) => ({ ...prev, [index]: false }));
    updateItems(updated);
  };

  return (
    <div className={`space-y-3.5 ${className}`}>
      {/* Header & Deskripsi */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 pb-1">
        <div>
          <label className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            {label}
          </label>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {description}
          </p>
        </div>
        <Badge
          variant="outline"
          className="w-fit text-[10px] font-medium text-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800"
        >
          Cloudinary CDN Auto-Sync
        </Badge>
      </div>

      {/* 3 Frame Upload Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map((index) => {
          const item = items[index] || { id: index + 1, nama: '', fotoUrl: '' };
          const isSlotUploading = uploadingIndex === index;
          const slotError = errorMessage[index];
          const hasPhoto = Boolean(item.fotoUrl && item.fotoUrl.trim());
          const hasData = Boolean(item.nama.trim() || hasPhoto);
          const showUrlField = activeUrlInput[index];

          return (
            <div
              key={index}
              className={`relative flex flex-col justify-between rounded-xl border p-3.5 transition-all duration-200 ${
                hasPhoto
                  ? 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/20 dark:bg-indigo-950/10 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {/* Header Frame */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span
                    className={`flex items-center justify-center w-5 h-5 rounded-full font-bold text-[11px] ${
                      index === 0
                        ? 'bg-indigo-600 text-white'
                        : index === 1
                        ? 'bg-purple-600 text-white'
                        : 'bg-blue-600 text-white'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                    Narasumber {index + 1}
                  </span>
                  {index === 0 ? (
                    <span className="text-[10px] text-slate-400 font-medium">(Utama)</span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium">(Opsional)</span>
                  )}
                </div>

                {hasData && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleClearSlot(index)}
                    title="Kosongkan frame ini"
                    className="h-6 w-6 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>

              {/* Input Keterangan / Nama Narasumber */}
              <div className="mt-3 space-y-1.5">
                <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-400" />
                  Nama Narasumber
                </label>
                <Input
                  type="text"
                  placeholder="Masukan nama narasumber"
                  value={item.nama}
                  onChange={(e) => handleNameChange(index, e.target.value)}
                  className="h-9 text-xs placeholder:text-slate-400 bg-white dark:bg-slate-800"
                />
              </div>

              {/* Upload Foto Frame */}
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <ImageIcon className="w-3 h-3 text-slate-400" />
                    Foto Narasumber
                  </span>
                  {hasPhoto && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Terunggah
                    </span>
                  )}
                </div>

                {/* Input File Tersembunyi */}
                <input
                  type="file"
                  ref={fileInputRefs[index]}
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={(e) => handleFileSelect(index, e)}
                  className="hidden"
                />

                {/* Kondisi 1: Sedang Uploading */}
                {isSlotUploading ? (
                  <div className="h-36 rounded-lg border border-dashed border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-950/20 flex flex-col items-center justify-center p-3 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-400 mb-2" />
                    <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
                      Mengunggah foto...
                    </p>
                    <span className="text-[10px] text-slate-400 mt-0.5">Menyimpan ke Cloudinary CDN</span>
                  </div>
                ) : hasPhoto ? (
                  /* Kondisi 2: Foto Sudah Ada */
                  <div className="space-y-2">
                    <div className="relative group h-36 w-full rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900/5 dark:bg-slate-950/40">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.fotoUrl}
                        alt={item.nama || `Narasumber ${index + 1}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <a
                          href={item.fotoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-white/90 text-slate-800 hover:bg-white text-xs font-medium shadow flex items-center gap-1"
                          title="Lihat foto ukuran penuh"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRefs[index].current?.click()}
                        className="h-7 text-[11px] flex-1 px-2 text-slate-700 dark:text-slate-300"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Ganti Foto
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleClearPhoto(index)}
                        className="h-7 text-[11px] px-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900/50"
                        title="Hapus foto"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Kondisi 3: Belum Ada Foto (Dropzone) */
                  <div className="space-y-2">
                    <div
                      onClick={() => fileInputRefs[index].current?.click()}
                      onDrop={(e) => handleDrop(index, e)}
                      onDragOver={handleDragOver}
                      className="h-36 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10 cursor-pointer flex flex-col items-center justify-center p-3 text-center transition-all group"
                    >
                      <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                        <UploadCloud className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                        Pilih / Drag Foto
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        JPG, PNG, WebP (Maks 10MB)
                      </span>
                    </div>

                    {/* Toggle Tempel URL Manual */}
                    <div>
                      {showUrlField ? (
                        <div className="space-y-1.5 pt-1">
                          <div className="flex gap-1.5">
                            <Input
                              type="url"
                              placeholder="https://..."
                              value={manualUrls[index] || ''}
                              onChange={(e) =>
                                setManualUrls((prev) => ({ ...prev, [index]: e.target.value }))
                              }
                              className="h-7 text-[11px] bg-white dark:bg-slate-800"
                            />
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleApplyManualUrl(index)}
                              className="h-7 px-2 text-[10px] bg-indigo-600 text-white hover:bg-indigo-700"
                            >
                              Terapkan
                            </Button>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setActiveUrlInput((prev) => ({ ...prev, [index]: false }))
                            }
                            className="text-[10px] text-slate-400 hover:underline"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setActiveUrlInput((prev) => ({ ...prev, [index]: true }))}
                          className="w-full text-center text-[10px] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center justify-center gap-1 py-0.5 hover:underline"
                        >
                          <Link2 className="w-2.5 h-2.5" />
                          atau tempel URL foto
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Pesan Error Per Slot */}
                {slotError && (
                  <div className="flex items-center gap-1 text-[10px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-1.5 rounded border border-rose-200 dark:border-rose-900/40">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{slotError}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
