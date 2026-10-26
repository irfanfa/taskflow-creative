'use client';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ReportData } from '@/app/actions/reports';

/**
 * Ekspor data laporan lengkap ke file Excel (.xlsx)
 */
export function exportReportToExcel(reportData: ReportData, periodLabel: string) {
  const wb = XLSX.utils.book_new();
  const dateStr = new Date().toISOString().split('T')[0];

  // Sheet 1: Rincian Daftar Tugas (Utama)
  const taskRows = [
    [
      'ID Tugas',
      'Judul Tugas',
      'Jenis Pekerjaan',
      'Prioritas',
      'Status',
      'Deadline',
      'Jumlah Revisi',
      'Tim Penugasan',
    ],
    ...reportData.tasksList.map((t) => [
      t.id,
      t.judul,
      t.jenis_pekerjaan,
      t.prioritas,
      t.status,
      new Date(t.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      t.revision_count,
      t.assignees,
    ]),
  ];

  const wsTasks = XLSX.utils.aoa_to_sheet(taskRows);
  XLSX.utils.book_append_sheet(wb, wsTasks, 'Daftar Tugas');

  // Sheet 2: Informasi Filter & Periode
  const summaryRows = [
    ['LAPORAN DAFTAR TUGAS KINERJA - KMB TEAM CREATIVE'],
    [`Filter & Periode: ${periodLabel}`],
    [`Tanggal Unduh: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })} WIB`],
    [],
    ['INFORMASI LAPORAN', 'NILAI'],
    ['Total Tugas Sesuai Filter', reportData.tasksList.length],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Informasi Laporan');

  // Unduh file
  XLSX.writeFile(wb, `Laporan_Kinerja_KMB_Team_Creative_${dateStr}.xlsx`);
}

/**
 * Ekspor data laporan lengkap ke format dokumen PDF profesional
 */
export function exportReportToPDF(reportData: ReportData, periodLabel: string) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const dateStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // 1. Header Banner
  doc.setFillColor(30, 41, 59); // Slate 800
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('KMB TEAM CREATIVE - LAPORAN KINERJA', 14, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Filter & Periode: ${periodLabel}  |  Tanggal Cetak: ${dateStr} WIB`, 14, 20);

  // 2. Judul Tabel & Info Jumlah Tugas
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Daftar Seluruh Tugas (${reportData.tasksList.length} Tugas)`, 14, 36);

  // 3. Tabel Seluruh Daftar Tugas (Tanpa Kolom Ketepatan)
  const taskHeaders = [['Judul Tugas', 'Jenis', 'Status', 'Deadline', 'Revisi', 'Tim PJ']];
  const taskRows = reportData.tasksList.map((t) => [
    t.judul.length > 35 ? t.judul.substring(0, 33) + '...' : t.judul,
    t.jenis_pekerjaan,
    t.status,
    new Date(t.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
    `${t.revision_count}`,
    t.assignees.length > 25 ? t.assignees.substring(0, 23) + '...' : t.assignees,
  ]);

  autoTable(doc, {
    startY: 40,
    head: taskHeaders,
    body: taskRows,
    theme: 'grid',
    headStyles: { fillColor: [51, 65, 85], textColor: 255, fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2.2 },
  });

  // Simpan / Unduh PDF
  doc.save(`Laporan_Kinerja_KMB_Team_Creative_${new Date().toISOString().split('T')[0]}.pdf`);
}
