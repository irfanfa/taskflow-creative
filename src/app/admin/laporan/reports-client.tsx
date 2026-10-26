'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Profile } from '@/types/database';
import { getPerformanceReport, type ReportData } from '@/app/actions/reports';
import { exportReportToExcel, exportReportToPDF } from '@/lib/reports/export';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/tasks/status-badge';
import {
  BarChart3,
  FileSpreadsheet,
  FileText,
  Filter,
  Loader2,
  Printer,
  Layers,
} from 'lucide-react';

interface ReportsClientProps {
  initialReport: ReportData;
  employees: Profile[];
  initialStartDate?: string;
  initialEndDate?: string;
  initialEmployeeId?: string;
  initialStatus?: string;
}

export function ReportsClient({
  initialReport,
  employees,
  initialStartDate = '',
  initialEndDate = '',
  initialEmployeeId = 'Semua',
  initialStatus = 'Semua',
}: ReportsClientProps) {
  const router = useRouter();
  const [report, setReport] = useState<ReportData>(initialReport);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [employeeId, setEmployeeId] = useState(initialEmployeeId);
  const [status, setStatus] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();

  // Preset Filters
  const handlePresetFilter = (preset: '7d' | '30d' | 'this_month' | 'all') => {
    const today = new Date();
    const endStr = today.toISOString().split('T')[0];
    let startStr = '';

    if (preset === '7d') {
      const past = new Date(today);
      past.setDate(past.getDate() - 7);
      startStr = past.toISOString().split('T')[0];
    } else if (preset === '30d') {
      const past = new Date(today);
      past.setDate(past.getDate() - 30);
      startStr = past.toISOString().split('T')[0];
    } else if (preset === 'this_month') {
      const past = new Date(today.getFullYear(), today.getMonth(), 1);
      startStr = past.toISOString().split('T')[0];
    } else if (preset === 'all') {
      startStr = '';
    }

    setStartDate(startStr);
    setEndDate(startStr ? endStr : '');
    applyFilter(startStr, startStr ? endStr : '', employeeId, status);
  };

  const applyFilter = (start: string, end: string, emp: string, st: string) => {
    startTransition(async () => {
      const data = await getPerformanceReport({
        startDate: start || undefined,
        endDate: end || undefined,
        employeeId: emp || undefined,
        status: st || undefined,
      });
      setReport(data);
    });
  };

  const getFilterSummaryLabel = () => {
    const parts: string[] = [];
    if (!startDate && !endDate) parts.push('Seluruh Waktu');
    else if (startDate && !endDate) parts.push(`Sejak ${startDate}`);
    else parts.push(`${startDate} s/d ${endDate}`);

    if (status && status !== 'Semua') {
      parts.push(`Status: ${status}`);
    }
    if (employeeId && employeeId !== 'Semua') {
      const emp = employees.find((e) => e.id === employeeId);
      if (emp) parts.push(`Pegawai: ${emp.nama}`);
    }
    return parts.join(' | ');
  };

  const { tasksList } = report;

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Laporan Kinerja &amp; Produktivitas
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Daftar penugasan tim kreatif dengan filter status, periode, dan pegawai
          </p>
        </div>

        {/* Action Export Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => exportReportToExcel(report, getFilterSummaryLabel())}
            className="gap-1.5 text-xs text-emerald-700 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100 hover:text-emerald-800 font-semibold shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Ekspor Excel (.xlsx)
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => exportReportToPDF(report, getFilterSummaryLabel())}
            className="gap-1.5 text-xs text-rose-700 border-rose-200 bg-rose-50/50 hover:bg-rose-100 hover:text-rose-800 font-semibold shadow-2xs"
          >
            <FileText className="w-4 h-4 text-rose-600" />
            Ekspor PDF
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="gap-1.5 text-xs text-slate-700 border-slate-200 hover:bg-slate-50"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            Cetak
          </Button>
        </div>
      </div>

      {/* Filter Card */}
      <Card className="border-slate-200 shadow-xs">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Preset Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                Periode Cepat:
              </span>
              {[
                { label: '7 Hari', key: '7d' as const },
                { label: '30 Hari Terakhir', key: '30d' as const },
                { label: 'Bulan Ini', key: 'this_month' as const },
                { label: 'Semua Waktu', key: 'all' as const },
              ].map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => handlePresetFilter(p.key)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 transition-colors border border-slate-200"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom Date & Employee Selector */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-8 px-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-100 bg-white dark:bg-slate-950 hover:border-slate-400 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                  title="Tanggal Mulai"
                />
                <span className="text-slate-400">s/d</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-8 px-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-100 bg-white dark:bg-slate-950 hover:border-slate-400 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                  title="Tanggal Akhir"
                />
              </div>

              {/* Employee Filter */}
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                aria-label="Filter Pegawai"
                className="h-8 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              >
                <option value="Semua">Semua Pegawai</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nama} ({emp.spesialisasi || 'Pegawai'})
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                aria-label="Filter Status"
                className="h-8 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              >
                <option value="Semua">Semua Status</option>
                <option value="Dalam Antrean">Dalam Antrean</option>
                <option value="Sedang Dikerjakan">Sedang Dikerjakan</option>
                <option value="Menunggu Review">Menunggu Review</option>
                <option value="Selesai">Selesai</option>
                <option value="Revisi">Revisi</option>
              </select>

              <Button
                type="button"
                size="sm"
                onClick={() => applyFilter(startDate, endDate, employeeId, status)}
                disabled={isPending}
                className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1 font-semibold shadow-2xs"
              >
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Filter className="w-3.5 h-3.5" />}
                Terapkan Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TABEL: DAFTAR SELURUH TUGAS */}
      <Card className="border-slate-200 shadow-xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold text-slate-900">
              Daftar Seluruh Tugas ({tasksList.length})
            </CardTitle>
            <span className="text-xs text-slate-500">
              Filter aktif: {getFilterSummaryLabel()}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {tasksList.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Tidak ada data tugas yang sesuai dengan filter yang dipilih.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-4">Judul Tugas</th>
                  <th className="py-2.5 px-4">Jenis</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Batas Waktu</th>
                  <th className="py-2.5 px-4 text-center">Revisi</th>
                  <th className="py-2.5 px-4">Tim Penugasan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasksList.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {t.judul}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      {t.jenis_pekerjaan}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={t.status as any} />
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Intl.DateTimeFormat('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        timeZone: 'Asia/Jakarta',
                      }).format(new Date(t.deadline))}
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-slate-700">
                      {t.revision_count > 0 ? (
                        <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-bold">
                          {t.revision_count}x
                        </span>
                      ) : (
                        '0'
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 truncate max-w-[150px]">
                      {t.assignees}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
