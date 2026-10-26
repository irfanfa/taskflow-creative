'use client';

import React from 'react';
import type { Profile, TaskWithAssignees } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Briefcase, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

interface WorkloadChartProps {
  employees: Profile[];
  tasks: TaskWithAssignees[];
}

export function WorkloadChart({ employees, tasks }: WorkloadChartProps) {
  // Hitung beban kerja setiap pegawai
  const workloads = employees.map((emp) => {
    // Tugas yang melibatkan pegawai ini
    const assignedTasks = tasks.filter((t) =>
      (t.assignees || []).some((a) => a.user_id === emp.id)
    );

    const activeTasks = assignedTasks.filter((t) => t.status !== 'Selesai');
    const inProgressTasks = assignedTasks.filter((t) => t.status === 'Sedang Dikerjakan');
    const reviewTasks = assignedTasks.filter((t) => t.status === 'Menunggu Review' || t.status === 'Revisi');
    const completedTasks = assignedTasks.filter((t) => t.status === 'Selesai');

    return {
      employee: emp,
      totalAssigned: assignedTasks.length,
      activeCount: activeTasks.length,
      inProgressCount: inProgressTasks.length,
      reviewCount: reviewTasks.length,
      completedCount: completedTasks.length,
    };
  });

  // Urutkan berdasarkan beban aktif terbanyak
  workloads.sort((a, b) => b.activeCount - a.activeCount);

  // Nilai maksimum untuk skala bar chart (minimal 5 agar bar proporsional)
  const maxActive = Math.max(5, ...workloads.map((w) => w.activeCount));

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
              Beban Kerja Pegawai Aktif
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Distribusi tugas aktif dan selesai per staf kreatif.
            </CardDescription>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="h-2.5 w-2.5 rounded-full bg-indigo-600 inline-block" />
              Aktif
            </span>
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />
              Selesai
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-4">
        {workloads.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">Belum ada pegawai terdaftar.</p>
        ) : (
          workloads.map((w) => {
            const activePercent = Math.min(100, Math.round((w.activeCount / maxActive) * 100));
            const isOverloaded = w.activeCount >= 4;

            return (
              <div key={w.employee.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar
                      src={w.employee.foto}
                      fallback={w.employee.nama}
                      alt={w.employee.nama}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-white truncate">
                        {w.employee.nama}
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-400 truncate">
                        {w.employee.spesialisasi || 'Staf Kreatif'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isOverloaded && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        <AlertTriangle className="h-3 w-3" />
                        Padat
                      </span>
                    )}
                    <span className="font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 rounded text-xs border border-indigo-100 dark:border-indigo-800">
                      {w.activeCount} Aktif
                    </span>
                    <span className="text-slate-400 dark:text-slate-400 text-[11px]">
                      &bull; {w.completedCount} Selesai
                    </span>
                  </div>
                </div>

                {/* Progress Bar Beban Kerja */}
                <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                  <div
                    className="bg-indigo-600 transition-all duration-500 rounded-l-full"
                    style={{ width: `${activePercent}%` }}
                    title={`${w.activeCount} tugas aktif`}
                  />
                  <div
                    className="bg-emerald-400/80 transition-all duration-500"
                    style={{
                      width: `${Math.min(100 - activePercent, Math.round((w.completedCount / maxActive) * 40))}%`,
                    }}
                    title={`${w.completedCount} tugas selesai`}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
