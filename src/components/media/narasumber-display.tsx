'use client';

import React, { useState } from 'react';
import {
  ExternalLink,
  Camera,
  User,
  Copy,
  Check,
  FileText,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  parseNarasumberData,
  getActiveNarasumber,
  NarasumberItem,
} from '@/lib/narasumber-helper';

interface NarasumberDisplayProps {
  linkReferensi?: string | null;
  className?: string;
}

export function NarasumberDisplay({ linkReferensi, className = '' }: NarasumberDisplayProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!linkReferensi || !linkReferensi.trim()) {
    return null;
  }

  const rawTrimmed = linkReferensi.trim();
  const isLegacySingleLink = !rawTrimmed.startsWith('[');

  // Jika berupa URL tunggal legacy yang bukan format JSON
  if (isLegacySingleLink) {
    return (
      <div className={`mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 ${className}`}>
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-indigo-600" />
          Lampiran / Tautan Referensi:
        </div>
        <a
          href={rawTrimmed}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 hover:underline bg-indigo-50/60 dark:bg-indigo-950/30 px-3 py-2 rounded-lg border border-indigo-100 dark:border-indigo-900/40 break-all"
        >
          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          <span>{rawTrimmed}</span>
        </a>
      </div>
    );
  }

  const allItems = parseNarasumberData(rawTrimmed);
  const activeItems = getActiveNarasumber(allItems);

  if (activeItems.length === 0) {
    return null;
  }

  const handleCopyName = (name: string, index: number) => {
    if (!name) return;
    navigator.clipboard.writeText(name);
    setCopiedIndex(index);
    setTimeout(() => {
      setCopiedIndex(null);
    }, 2000);
  };

  return (
    <div className={`mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 ${className}`}>
      {/* Header Bagian */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Camera className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
            Foto & Data Narasumber
          </span>
        </div>
        <Badge
          variant="outline"
          className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800"
        >
          {activeItems.length} Narasumber
        </Badge>
      </div>

      {/* Grid Kartu Narasumber */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
        {activeItems.map((item, idx) => {
          const isCopied = copiedIndex === idx;
          const hasPhoto = Boolean(item.fotoUrl && item.fotoUrl.trim());

          return (
            <div
              key={item.id || idx}
              className="flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-3 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
            >
              <div>
                {/* Header Slot */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    Narasumber {item.id}
                  </span>
                  {item.nama && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyName(item.nama, idx)}
                      className="h-5 px-1.5 text-[10px] text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                      title="Salin nama narasumber"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-2.5 h-2.5 mr-1 text-emerald-600" />
                          Tersalin
                        </>
                      ) : (
                        <>
                          <Copy className="w-2.5 h-2.5 mr-1" />
                          Salin
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {/* Foto Preview */}
                {hasPhoto ? (
                  <div className="relative group h-40 w-full rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900/5 dark:bg-slate-950/50 mb-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.fotoUrl}
                      alt={item.nama || `Narasumber ${item.id}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <a
                      href={item.fotoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium gap-1.5 backdrop-blur-[1px]"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Lihat Ukuran Penuh</span>
                    </a>
                  </div>
                ) : (
                  <div className="h-28 w-full rounded-lg border border-dashed border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/40 flex flex-col items-center justify-center text-slate-400 mb-2.5">
                    <User className="w-6 h-6 mb-1 opacity-50" />
                    <span className="text-[10px]">Foto belum dilampirkan</span>
                  </div>
                )}

                {/* Nama Narasumber */}
                <div className="px-0.5">
                  <div className="text-[10px] text-slate-400 font-medium">Nama Narasumber:</div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-snug break-words mt-0.5">
                    {item.nama || '(Nama belum diisi)'}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              {hasPhoto && (
                <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                  <a
                    href={item.fotoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 w-full text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors shadow-2xs"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Buka Foto Resolusi Penuh</span>
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
