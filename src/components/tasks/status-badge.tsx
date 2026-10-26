import React from 'react';
import { cn } from '@/lib/utils';
import type { TaskStatus } from '@/types/database';
import {
  Clock,
  PlayCircle,
  Eye,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: TaskStatus;
  showIcon?: boolean;
}

export function StatusBadge({ status, showIcon = false, className, ...props }: StatusBadgeProps) {
  const config: Record<
    TaskStatus,
    { label: string; bg: string; text: string; border: string; icon: React.ElementType }
  > = {
    'Dalam Antrean': {
      label: 'Dalam Antrean',
      bg: 'bg-slate-100 dark:bg-slate-800',
      text: 'text-slate-700 dark:text-slate-200',
      border: 'border-slate-200 dark:border-slate-700',
      icon: Clock,
    },
    'Belum Dimulai': {
      label: 'Dalam Antrean',
      bg: 'bg-slate-100 dark:bg-slate-800',
      text: 'text-slate-700 dark:text-slate-200',
      border: 'border-slate-200 dark:border-slate-700',
      icon: Clock,
    },
    'Sedang Dikerjakan': {
      label: 'Sedang Dikerjakan',
      bg: 'bg-blue-50 dark:bg-blue-950/80',
      text: 'text-blue-700 dark:text-blue-300',
      border: 'border-blue-200 dark:border-blue-800',
      icon: PlayCircle,
    },
    'Menunggu Review': {
      label: 'Menunggu Review',
      bg: 'bg-purple-50 dark:bg-purple-950/80',
      text: 'text-purple-700 dark:text-purple-300',
      border: 'border-purple-200 dark:border-purple-800',
      icon: Eye,
    },
    'Revisi': {
      label: 'Perlu Revisi',
      bg: 'bg-amber-50 dark:bg-amber-950/80',
      text: 'text-amber-800 dark:text-amber-300',
      border: 'border-amber-200 dark:border-amber-800',
      icon: AlertCircle,
    },
    'Selesai': {
      label: 'Selesai',
      bg: 'bg-emerald-50 dark:bg-emerald-950/80',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-200 dark:border-emerald-800',
      icon: CheckCircle2,
    },
  };

  const item = config[status] || config['Belum Dimulai'];
  const Icon = item.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors shadow-2xs',
        item.bg,
        item.text,
        item.border,
        className
      )}
      {...props}
    >
      {showIcon && <Icon className="h-3.5 w-3.5 shrink-0" />}
      <span>{item.label}</span>
    </span>
  );
}
