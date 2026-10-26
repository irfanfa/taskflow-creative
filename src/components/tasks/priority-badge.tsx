import React from 'react';
import { cn } from '@/lib/utils';
import type { TaskPriority } from '@/types/database';
import { Flame, ArrowUp, Minus, ArrowDown } from 'lucide-react';

export interface PriorityBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  prioritas?: TaskPriority;
  priority?: TaskPriority;
  showIcon?: boolean;
}

export function PriorityBadge({
  prioritas,
  priority,
  showIcon = false,
  className,
  ...props
}: PriorityBadgeProps) {
  const value = prioritas || priority || 'Sedang';

  const config: Record<
    TaskPriority,
    { label: string; bg: string; text: string; border: string; icon: React.ElementType }
  > = {
    Rendah: {
      label: 'Rendah',
      bg: 'bg-slate-50 dark:bg-slate-800',
      text: 'text-slate-600 dark:text-slate-300',
      border: 'border-slate-200 dark:border-slate-700',
      icon: ArrowDown,
    },
    Sedang: {
      label: 'Sedang',
      bg: 'bg-blue-50 dark:bg-blue-950/80',
      text: 'text-blue-700 dark:text-blue-300',
      border: 'border-blue-200 dark:border-blue-800',
      icon: Minus,
    },
    Tinggi: {
      label: 'Tinggi',
      bg: 'bg-amber-50 dark:bg-amber-950/80',
      text: 'text-amber-800 dark:text-amber-300',
      border: 'border-amber-200 dark:border-amber-800',
      icon: ArrowUp,
    },
    Urgent: {
      label: 'Urgent',
      bg: 'bg-rose-50 dark:bg-rose-950/80',
      text: 'text-rose-700 dark:text-rose-300',
      border: 'border-rose-200 dark:border-rose-800',
      icon: Flame,
    },
  };

  const item = config[value] || config.Sedang;
  const Icon = item.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border shadow-2xs',
        item.bg,
        item.text,
        item.border,
        className
      )}
      {...props}
    >
      {showIcon && (
        <Icon
          className={cn(
            'h-3.5 w-3.5 shrink-0',
            value === 'Urgent' && 'animate-pulse text-rose-600'
          )}
        />
      )}
      <span>{item.label}</span>
    </span>
  );
}
