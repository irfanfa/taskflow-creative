'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimePickerPopoverProps {
  value: string; // format HH:mm, contoh '17:00'
  onChange: (time: string) => void;
  label?: string;
  className?: string;
}

export function TimePickerPopover({
  value,
  onChange,
  label = 'Pukul',
  className,
}: TimePickerPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse jam dan menit saat ini
  const rawValue = value || '17:00';
  const [hours, setHours] = useState(() => (rawValue.split(':')[0] || '17').padStart(2, '0'));
  const [minutes, setMinutes] = useState(() => (rawValue.split(':')[1] || '00').padStart(2, '0'));

  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    if (value && value.includes(':')) {
      const [h, m] = value.split(':');
      setHours(h.padStart(2, '0'));
      setMinutes(m.padStart(2, '0'));
    }
  }

  // Klik di luar popover untuk menutup
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

  const handleApply = () => {
    const h = hours.padStart(2, '0');
    const m = minutes.padStart(2, '0');
    onChange(`${h}:${m}`);
    setIsOpen(false);
  };

  const handleHourChange = (newHour: string) => {
    setHours(newHour);
    const m = minutes.padStart(2, '0');
    onChange(`${newHour}:${m}`);
  };

  const handleMinuteChange = (newMinute: string) => {
    setMinutes(newMinute);
    const h = hours.padStart(2, '0');
    onChange(`${h}:${newMinute}`);
  };

  return (
    <div className={cn('relative space-y-1.5', className)} ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-slate-100 shadow-2xs hover:border-slate-400 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/70 transition-colors cursor-pointer text-left"
      >
        <span className="flex items-center gap-2 truncate">
          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {value || '17:00'} WIB
          </span>
        </span>
        <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 shrink-0 ml-1">
          Atur Jam
        </span>
      </button>

      {/* Popover Manual Time Picker */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-64 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xl transition-all animate-in fade-in-50 zoom-in-95">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              Atur Jam Manual
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
              {hours}:{minutes} WIB
            </span>
          </div>

          <div className="flex items-center justify-center gap-3 py-2">
            {/* Hour Selector */}
            <div className="flex-1 text-center">
              <label className="text-[10px] font-semibold text-slate-500 block mb-1.5">
                Jam (00 - 23)
              </label>
              <select
                value={hours}
                onChange={(e) => handleHourChange(e.target.value)}
                className="w-full text-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-2xs"
              >
                {Array.from({ length: 24 }).map((_, i) => {
                  const h = String(i).padStart(2, '0');
                  return (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  );
                })}
              </select>
            </div>

            <span className="text-slate-400 font-bold text-lg pt-4">:</span>

            {/* Minute Selector */}
            <div className="flex-1 text-center">
              <label className="text-[10px] font-semibold text-slate-500 block mb-1.5">
                Menit (00 - 59)
              </label>
              <select
                value={minutes}
                onChange={(e) => handleMinuteChange(e.target.value)}
                className="w-full text-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-2xs"
              >
                {Array.from({ length: 60 }).map((_, i) => {
                  const m = String(i).padStart(2, '0');
                  return (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              Terapkan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
