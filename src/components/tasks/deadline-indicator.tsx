'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, Clock, AlertOctagon, CheckCircle2 } from 'lucide-react';

interface DeadlineIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  deadline: string | Date;
  isCompleted?: boolean;
  showDetails?: boolean;
}

export function DeadlineIndicator({
  deadline,
  isCompleted = false,
  showDetails = true,
  className,
  ...props
}: DeadlineIndicatorProps) {
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const diffMs = deadlineDate.getTime() - now.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  // Format tanggal & jam WIB
  const formattedWIB = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  }).format(deadlineDate) + ' WIB';

  // Status Selesai
  if (isCompleted) {
    return (
      <div className={cn('inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400', className)} {...props}>
        <span className="font-medium text-slate-600 dark:text-slate-300">{formattedWIB}</span>
        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
          Tuntas
        </span>
      </div>
    );
  }

  // 1. Terlambat (Merah)
  if (diffMs < 0) {
    const overdueHours = Math.abs(diffHours);
    const overdueDays = Math.abs(diffDays);
    const timeText = overdueDays > 1 ? `${overdueDays} hari lalu` : `${overdueHours} jam lalu`;

    return (
      <div
        className={cn(
          'inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 shadow-2xs',
          className
        )}
        title={`Batas waktu terlewati: ${formattedWIB}`}
        {...props}
      >
        <span className="truncate">Terlambat ({timeText})</span>
        {showDetails && <span className="text-[11px] font-normal opacity-80 hidden sm:inline">&bull; {formattedWIB}</span>}
      </div>
    );
  }

  // 2. Mendekati: <= 1 Hari (Oranye)
  if (diffHours <= 24) {
    return (
      <div
        className={cn(
          'inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-orange-50 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 shadow-2xs',
          className
        )}
        title={`Mendekati deadline: ${formattedWIB}`}
        {...props}
      >
        <span className="truncate">
          Mendesak: sisa {diffHours <= 1 ? 'kurang dari 1 jam' : `${diffHours} jam`}
        </span>
        {showDetails && <span className="text-[11px] font-normal opacity-80 hidden sm:inline">&bull; {formattedWIB}</span>}
      </div>
    );
  }

  // 3. Mendekati: <= 3 Hari (Kuning)
  if (diffDays <= 3) {
    return (
      <div
        className={cn(
          'inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shadow-2xs',
          className
        )}
        title={`Batas waktu: ${formattedWIB}`}
        {...props}
      >
        <span className="truncate">Sisa {diffDays} hari</span>
        {showDetails && <span className="text-[11px] font-normal opacity-80 hidden sm:inline">&bull; {formattedWIB}</span>}
      </div>
    );
  }

  // 4. Aman: > 3 Hari (Hijau)
  return (
    <div
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs',
        className
      )}
      title={`Batas waktu: ${formattedWIB}`}
      {...props}
    >
      <span className="truncate font-semibold">Sisa {diffDays} hari</span>
      {showDetails && <span className="text-[11px] opacity-80 hidden sm:inline">&bull; {formattedWIB}</span>}
    </div>
  );
}
