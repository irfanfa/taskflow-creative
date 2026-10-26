'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { TaskWithAssignees, Profile } from '@/types/database';

export interface ReportMetrics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  revisionTasks: number;
  waitingReviewTasks: number;
  avgCompletionDays: number;
  onTimePercentage: number;
  onTimeCount: number;
  lateCount: number;
  totalRevisions: number;
  avgRevisionsPerTask: number;
  totalWorkingMinutes: number;
  totalWorkingHours: number;
}

export interface EmployeePerformance {
  employeeId: string;
  nama: string;
  spesialisasi: string | null;
  foto: string | null;
  assignedCount: number;
  completedCount: number;
  onTimePercentage: number;
  totalRevisions: number;
  totalWorkingMinutes: number;
  totalWorkingHours: number;
}

export interface ReportTaskItem {
  id: string;
  judul: string;
  jenis_pekerjaan: string;
  klien_proyek: string;
  prioritas: string;
  status: string;
  tanggal_mulai: string;
  deadline: string;
  completed_at: string | null;
  isOnTime: boolean;
  revision_count: number;
  assignees: string;
  duration_minutes: number;
}

export interface ReportData {
  metrics: ReportMetrics;
  employeeStats: EmployeePerformance[];
  tasksList: ReportTaskItem[];
  trendData: {
    label: string;
    completed: number;
    onTime: number;
    late: number;
  }[];
  categoryDistribution: {
    category: string;
    count: number;
  }[];
}

export async function getPerformanceReport({
  startDate,
  endDate,
  employeeId,
  status,
}: {
  startDate?: string;
  endDate?: string;
  employeeId?: string;
  status?: string;
}): Promise<ReportData> {
  try {
    const supabase = createAdminClient() as any;

    // 1. Ambil data tugas
    let taskQuery = supabase
      .from('tasks')
      .select(`
        *,
        task_assignees (
          user_id,
          profiles (
            id,
            nama,
            email,
            role,
            spesialisasi,
            foto
          )
        )
      `)
      .is('deleted_at', null)
      .order('deadline', { ascending: true });

    if (startDate) {
      taskQuery = taskQuery.gte('created_at', `${startDate}T00:00:00Z`);
    }
    if (endDate) {
      taskQuery = taskQuery.lte('created_at', `${endDate}T23:59:59Z`);
    }

    const { data: rawTasks, error: taskError } = await taskQuery;
    if (taskError) {
      console.error('Error fetching report tasks:', taskError);
      return getEmptyReportData();
    }

    // 2. Filter berdasarkan pegawai jika dipilih
    let tasks = rawTasks || [];
    if (employeeId && employeeId !== 'Semua') {
      tasks = tasks.filter((t: any) =>
        (t.task_assignees || []).some((ta: any) => ta.user_id === employeeId)
      );
    }

    // 2b. Filter berdasarkan status jika dipilih
    if (status && status !== 'Semua') {
      if (status === 'Dalam Antrean' || status === 'Belum Dimulai') {
        tasks = tasks.filter((t: any) => t.status === 'Dalam Antrean' || t.status === 'Belum Dimulai');
      } else {
        tasks = tasks.filter((t: any) => t.status === status);
      }
    }

    // 3. Ambil data time logs dalam periode
    let timeQuery = supabase
      .from('task_time_logs')
      .select('*, user:profiles(id, nama, email, spesialisasi, foto)');

    if (startDate) {
      timeQuery = timeQuery.gte('created_at', `${startDate}T00:00:00Z`);
    }
    if (endDate) {
      timeQuery = timeQuery.lte('created_at', `${endDate}T23:59:59Z`);
    }
    if (employeeId && employeeId !== 'Semua') {
      timeQuery = timeQuery.eq('user_id', employeeId);
    }

    const { data: timeLogs } = await timeQuery;
    const allLogs = timeLogs || [];

    // Map total durasi kerja per task
    const taskDurationMap: Record<string, number> = {};
    const employeeDurationMap: Record<string, number> = {};

    allLogs.forEach((log: any) => {
      taskDurationMap[log.task_id] = (taskDurationMap[log.task_id] || 0) + (log.duration_minutes || 0);
      employeeDurationMap[log.user_id] = (employeeDurationMap[log.user_id] || 0) + (log.duration_minutes || 0);
    });

    // 4. Hitung Metrik Keseluruhan
    const totalTasks = tasks.length;
    let completedTasks = 0;
    let inProgressTasks = 0;
    let revisionTasks = 0;
    let waitingReviewTasks = 0;
    let onTimeCount = 0;
    let lateCount = 0;
    let totalRevisions = 0;
    let totalCompletionDaysSum = 0;

    const tasksList: ReportTaskItem[] = [];

    tasks.forEach((t: any) => {
      const isCompleted = t.status === 'Selesai';
      if (isCompleted) completedTasks++;
      if (t.status === 'Sedang Dikerjakan') inProgressTasks++;
      if (t.status === 'Revisi') revisionTasks++;
      if (t.status === 'Menunggu Review') waitingReviewTasks++;

      const revCount = t.revision_count || 0;
      totalRevisions += revCount;

      // Cek on time vs late
      // Jika selesai, cek updated_at vs deadline
      const deadlineDate = new Date(t.deadline).getTime();
      const finishDate = isCompleted ? new Date(t.updated_at).getTime() : Date.now();
      const isOnTime = finishDate <= deadlineDate;

      if (isCompleted) {
        if (isOnTime) onTimeCount++;
        else lateCount++;

        // Hitung durasi penyelesaian dalam hari
        const startTimestamp = new Date(t.tanggal_mulai || t.created_at).getTime();
        const diffDays = Math.max(0.1, (finishDate - startTimestamp) / (1000 * 60 * 60 * 24));
        totalCompletionDaysSum += diffDays;
      }

      const assigneeNames = (t.task_assignees || [])
        .map((ta: any) => ta.profiles?.nama)
        .filter(Boolean)
        .join(', ');

      tasksList.push({
        id: t.id,
        judul: t.judul,
        jenis_pekerjaan: t.jenis_pekerjaan,
        klien_proyek: t.klien_proyek,
        prioritas: t.prioritas,
        status: t.status,
        tanggal_mulai: t.tanggal_mulai,
        deadline: t.deadline,
        completed_at: isCompleted ? t.updated_at : null,
        isOnTime,
        revision_count: revCount,
        assignees: assigneeNames || 'Belum ada',
        duration_minutes: taskDurationMap[t.id] || 0,
      });
    });

    const onTimePercentage = completedTasks > 0 ? Math.round((onTimeCount / completedTasks) * 100) : 100;
    const avgCompletionDays = completedTasks > 0 ? Number((totalCompletionDaysSum / completedTasks).toFixed(1)) : 0;
    const avgRevisionsPerTask = totalTasks > 0 ? Number((totalRevisions / totalTasks).toFixed(1)) : 0;

    const totalWorkingMinutes = Object.values(taskDurationMap).reduce((a, b) => a + b, 0);
    const totalWorkingHours = Number((totalWorkingMinutes / 60).toFixed(1));

    const metrics: ReportMetrics = {
      totalTasks,
      completedTasks,
      inProgressTasks,
      revisionTasks,
      waitingReviewTasks,
      avgCompletionDays,
      onTimePercentage,
      onTimeCount,
      lateCount,
      totalRevisions,
      avgRevisionsPerTask,
      totalWorkingMinutes,
      totalWorkingHours,
    };

    // 5. Hitung Performa per Pegawai
    const { data: employeesData } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'pegawai')
      .is('deleted_at', null)
      .order('nama', { ascending: true });

    const allEmployees = (employeesData || []) as Profile[];
    const employeeStats: EmployeePerformance[] = allEmployees.map((emp) => {
      const empTasks = tasks.filter((t: any) =>
        (t.task_assignees || []).some((ta: any) => ta.user_id === emp.id)
      );

      const empCompleted = empTasks.filter((t: any) => t.status === 'Selesai');
      const empOnTime = empCompleted.filter((t: any) => {
        const deadline = new Date(t.deadline).getTime();
        const finish = new Date(t.updated_at).getTime();
        return finish <= deadline;
      }).length;

      const empRevisions = empTasks.reduce((acc: number, t: any) => acc + (t.revision_count || 0), 0);
      const empWorkingMins = employeeDurationMap[emp.id] || 0;

      return {
        employeeId: emp.id,
        nama: emp.nama,
        spesialisasi: emp.spesialisasi,
        foto: emp.foto,
        assignedCount: empTasks.length,
        completedCount: empCompleted.length,
        onTimePercentage: empCompleted.length > 0 ? Math.round((empOnTime / empCompleted.length) * 100) : 100,
        totalRevisions: empRevisions,
        totalWorkingMinutes: empWorkingMins,
        totalWorkingHours: Number((empWorkingMins / 60).toFixed(1)),
      };
    });

    // 6. Distribusi Kategori
    const categoryCountMap: Record<string, number> = {};
    tasks.forEach((t: any) => {
      const cat = t.jenis_pekerjaan || 'Lainnya';
      categoryCountMap[cat] = (categoryCountMap[cat] || 0) + 1;
    });

    const categoryDistribution = Object.entries(categoryCountMap).map(([category, count]) => ({
      category,
      count,
    }));

    // 7. Trend Data (Bulan ke Bulan)
    const trendMap: Record<string, { completed: number; onTime: number; late: number }> = {};
    tasks.forEach((t: any) => {
      if (t.status === 'Selesai') {
        const d = new Date(t.updated_at);
        const monthKey = new Intl.DateTimeFormat('id-ID', { month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(d);
        if (!trendMap[monthKey]) {
          trendMap[monthKey] = { completed: 0, onTime: 0, late: 0 };
        }
        trendMap[monthKey].completed++;
        const dl = new Date(t.deadline).getTime();
        if (d.getTime() <= dl) {
          trendMap[monthKey].onTime++;
        } else {
          trendMap[monthKey].late++;
        }
      }
    });

    const trendData = Object.entries(trendMap).map(([label, val]) => ({
      label,
      completed: val.completed,
      onTime: val.onTime,
      late: val.late,
    }));

    return {
      metrics,
      employeeStats,
      tasksList,
      trendData,
      categoryDistribution,
    };
  } catch (err) {
    console.error('Error generating performance report:', err);
    return getEmptyReportData();
  }
}

function getEmptyReportData(): ReportData {
  return {
    metrics: {
      totalTasks: 0,
      completedTasks: 0,
      inProgressTasks: 0,
      revisionTasks: 0,
      waitingReviewTasks: 0,
      avgCompletionDays: 0,
      onTimePercentage: 100,
      onTimeCount: 0,
      lateCount: 0,
      totalRevisions: 0,
      avgRevisionsPerTask: 0,
      totalWorkingMinutes: 0,
      totalWorkingHours: 0,
    },
    employeeStats: [],
    tasksList: [],
    trendData: [],
    categoryDistribution: [],
  };
}
