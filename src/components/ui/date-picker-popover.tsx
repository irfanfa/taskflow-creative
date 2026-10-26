'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DatePickerPopoverProps {
  value: string; // format YYYY-MM-DD
  onChange: (date: string) => void;
  label?: string;
  required?: boolean;
  minDate?: string;
  className?: string;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export function DatePickerPopover({
  value,
  onChange,
  label,
  required,
  minDate,
  className,
}: DatePickerPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse tanggal terpilih atau fallback ke hari ini
  const parsedDate = value ? new Date(value + 'T00:00:00') : new Date();
  const validParsed = !isNaN(parsedDate.getTime()) ? parsedDate : new Date();

  const [viewYear, setViewYear] = useState(validParsed.getFullYear());
  const [viewMonth, setViewMonth] = useState(validParsed.getMonth());

  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    if (value) {
      const d = new Date(value + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }

  // Handle klik di luar untuk menutup popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const m = String(viewMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    onChange(`${viewYear}-${m}-${d}`);
    setIsOpen(false);
  };

  const handleQuickSelect = (daysFromToday: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysFromToday);
    const y = target.getFullYear();
    const m = String(target.getMonth() + 1).padStart(2, '0');
    const d = String(target.getDate()).padStart(2, '0');
    onChange(`${y}-${m}-${d}`);
    setViewYear(y);
    setViewMonth(target.getMonth());
    setIsOpen(false);
  };

  // Format label teks tombol
  const formatDisplay = () => {
    if (!value) return 'Pilih Tanggal...';
    try {
      const d = new Date(value + 'T00:00:00');
      if (isNaN(d.getTime())) return value;
      return new Intl.DateTimeFormat('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(d);
    } catch {
      return value;
    }
  };

  // Kalkulasi hari dalam bulan
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const today = new Date();
  const isToday = (day: number) =>
    today.getDate() === day &&
    today.getMonth() === viewMonth &&
    today.getFullYear() === viewYear;

  const isSelected = (day: number) => {
    if (!value) return false;
    const d = new Date(value + 'T00:00:00');
    return (
      d.getDate() === day &&
      d.getMonth() === viewMonth &&
      d.getFullYear() === viewYear
    );
  };

  const isDateDisabled = (day: number) => {
    if (!minDate) return false;
    const m = String(viewMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${viewYear}-${m}-${d}` < minDate;
  };

  return (
    <div className={cn('relative space-y-1.5', className)} ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-slate-100 shadow-2xs hover:border-slate-400 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/70 transition-colors cursor-pointer text-left',
          !value && 'text-slate-400 dark:text-slate-500'
        )}
      >
        <span className="flex items-center gap-2 truncate">
          <CalendarIcon className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="truncate">{formatDisplay()}</span>
        </span>
        <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-800/60 shrink-0 ml-1">
          Pilih
        </span>
      </button>

      {/* Popover Calendar */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-72 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-xl transition-all animate-in fade-in-50 zoom-in-95">
          {/* Header Navigasi Bulan & Tahun */}
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
              aria-label="Bulan sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
              aria-label="Bulan berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Baris Nama Hari */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
            {DAY_NAMES.map((d, idx) => (
              <span
                key={d}
                className={cn(
                  'text-[10px] font-semibold py-1',
                  idx === 0
                    ? 'text-rose-500 dark:text-rose-400'
                    : 'text-slate-400 dark:text-slate-500'
                )}
              >
                {d}
              </span>
            ))}
          </div>

          {/* Grid Tanggal */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Hari bulan sebelumnya */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => {
              const prevDay = daysInPrevMonth - firstDayOfMonth + i + 1;
              return (
                <span
                  key={`prev-${i}`}
                  className="text-[11px] p-1.5 text-slate-300 dark:text-slate-600 select-none"
                >
                  {prevDay}
                </span>
              );
            })}

            {/* Hari bulan aktif */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const active = isSelected(day);
              const current = isToday(day);
              const disabled = isDateDisabled(day);

              return (
                <button
                  key={`day-${day}`}
                  type="button"
                  disabled={disabled}
                  onClick={() => !disabled && handleSelectDay(day)}
                  className={cn(
                    'text-[11px] font-medium h-7 w-7 rounded-lg flex items-center justify-center transition-all cursor-pointer mx-auto',
                    disabled
                      ? 'opacity-30 cursor-not-allowed text-slate-400'
                      : active
                      ? 'bg-amber-600 text-white font-bold shadow-xs'
                      : current
                      ? 'border border-amber-500/70 text-amber-700 dark:text-amber-400 font-bold bg-amber-50/50 dark:bg-amber-950/30'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Shortcut Pilihan Cepat */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1 text-[10px]">
            <button
              type="button"
              onClick={() => handleQuickSelect(0)}
              className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-amber-100 dark:hover:bg-amber-950/60 hover:text-amber-700 dark:hover:text-amber-300 transition-colors font-medium cursor-pointer"
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => handleQuickSelect(1)}
              className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-amber-100 dark:hover:bg-amber-950/60 hover:text-amber-700 dark:hover:text-amber-300 transition-colors font-medium cursor-pointer"
            >
              Besok
            </button>
            <button
              type="button"
              onClick={() => handleQuickSelect(3)}
              className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-amber-100 dark:hover:bg-amber-950/60 hover:text-amber-700 dark:hover:text-amber-300 transition-colors font-medium cursor-pointer"
            >
              +3 Hari
            </button>
            <button
              type="button"
              onClick={() => handleQuickSelect(7)}
              className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-amber-100 dark:hover:bg-amber-950/60 hover:text-amber-700 dark:hover:text-amber-300 transition-colors font-medium cursor-pointer"
            >
              +1 Minggu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
