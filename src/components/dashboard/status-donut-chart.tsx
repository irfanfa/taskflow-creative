'use client';

import React, { useState } from 'react';
import type { TaskWithAssignees, TaskStatus } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart as PieIcon } from 'lucide-react';

interface StatusDonutChartProps {
  tasks: TaskWithAssignees[];
}

interface StatusSegment {
  status: TaskStatus;
  label: string;
  count: number;
  color: string;
  bgBadge: string;
}

export function StatusDonutChart({ tasks }: StatusDonutChartProps) {
  const [hoveredStatus, setHoveredStatus] = useState<string | null>(null);

  const total = tasks.length;

  const segments: StatusSegment[] = [
    {
      status: 'Dalam Antrean',
      label: 'Dalam Antrean',
      count: tasks.filter((t) => t.status === 'Belum Dimulai' || t.status === 'Dalam Antrean').length,
      color: '#64748b', // slate-500
      bgBadge: 'bg-slate-100 text-slate-700',
    },
    {
      status: 'Sedang Dikerjakan',
      label: 'Sedang Dikerjakan',
      count: tasks.filter((t) => t.status === 'Sedang Dikerjakan').length,
      color: '#3b82f6', // blue-500
      bgBadge: 'bg-blue-100 text-blue-700',
    },
    {
      status: 'Menunggu Review',
      label: 'Menunggu Review',
      count: tasks.filter((t) => t.status === 'Menunggu Review').length,
      color: '#a855f7', // purple-500
      bgBadge: 'bg-purple-100 text-purple-700',
    },
    {
      status: 'Revisi',
      label: 'Revisi',
      count: tasks.filter((t) => t.status === 'Revisi').length,
      color: '#f97316', // orange-500
      bgBadge: 'bg-orange-100 text-orange-700',
    },
    {
      status: 'Selesai',
      label: 'Selesai',
      count: tasks.filter((t) => t.status === 'Selesai').length,
      color: '#10b981', // emerald-500
      bgBadge: 'bg-emerald-100 text-emerald-700',
    },
  ];

  // Hitung persentase dan parameter lingkaran SVG
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  const renderedSlices = segments.map((seg) => {
    const fraction = total > 0 ? seg.count / total : 0;
    const strokeDasharray = `${fraction * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedOffset;
    accumulatedOffset += fraction * circumference;

    return {
      ...seg,
      percentage: total > 0 ? Math.round(fraction * 100) : 0,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
        <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
          Komposisi Tugas per Status
        </CardTitle>
        <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Proporsi pengerjaan tugas kreatif seluruh tim.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Donut SVG */}
          <div className="relative flex items-center justify-center shrink-0">
            <svg width="180" height="180" viewBox="0 0 180 180" className="transform -rotate-90">
              {/* Background Ring */}
              <circle
                cx="90"
                cy="90"
                r={radius}
                className="stroke-slate-100 dark:stroke-slate-800"
                strokeWidth="20"
                fill="none"
              />

              {/* Segments */}
              {total > 0 &&
                renderedSlices.map((slice) => {
                  if (slice.count === 0) return null;
                  const isHovered = hoveredStatus === slice.status;

                  return (
                    <circle
                      key={slice.status}
                      cx="90"
                      cy="90"
                      r={radius}
                      stroke={slice.color}
                      strokeWidth={isHovered ? 24 : 20}
                      strokeDasharray={slice.strokeDasharray}
                      strokeDashoffset={slice.strokeDashoffset}
                      fill="none"
                      className="transition-all duration-300 cursor-pointer"
                      onMouseEnter={() => setHoveredStatus(slice.status)}
                      onMouseLeave={() => setHoveredStatus(null)}
                    />
                  );
                })}
            </svg>

            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white leading-none">
                {total}
              </span>
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 mt-1 uppercase tracking-wider">
                Total Tugas
              </span>
            </div>
          </div>

          {/* Status Breakdown Legend */}
          <div className="w-full space-y-2.5">
            {renderedSlices.map((slice) => (
              <div
                key={slice.status}
                onMouseEnter={() => setHoveredStatus(slice.status)}
                onMouseLeave={() => setHoveredStatus(null)}
                className={`flex items-center justify-between p-2 rounded-lg text-xs transition-colors cursor-pointer ${
                  hoveredStatus === slice.status
                    ? 'bg-slate-100 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-3 w-3 rounded-full shrink-0 shadow-xs"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="text-slate-800 dark:text-slate-200 font-medium">{slice.label}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400 dark:text-slate-400 font-mono text-[11px]">
                    {slice.percentage}%
                  </span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full min-w-[24px] text-center text-xs">
                    {slice.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
