/**
 * Batas maksimal hari ke depan untuk tugas yang ditampilkan kepada role pegawai.
 * Tugas dengan batas waktu (deadline) lebih dari 30 hari ke depan tidak akan ditampilkan dulu.
 */
export const PEGAWAI_MAX_DEADLINE_DAYS = 30;

/**
 * Menghitung batas akhir tanggal deadline untuk role pegawai (30 hari ke depan, 23:59:59.999).
 */
export function getPegawaiMaxDeadlineDate(fromDate: Date = new Date()): Date {
  const maxDate = new Date(fromDate);
  maxDate.setDate(maxDate.getDate() + PEGAWAI_MAX_DEADLINE_DAYS);
  maxDate.setHours(23, 59, 59, 999);
  return maxDate;
}

/**
 * Menyaring daftar tugas agar hanya menampilkan tugas yang deadlinenya <= 30 hari ke depan.
 * - Tugas overdue / hari ini / hingga 30 hari ke depan: TETAP TAMPIL.
 * - Tugas dengan deadline > 30 hari ke depan: TIDAK TAMPIL DULU.
 */
export function filterPegawaiUpcomingTasks<T extends { deadline: string }>(
  tasks: T[],
  fromDate: Date = new Date()
): T[] {
  const maxDeadline = getPegawaiMaxDeadlineDate(fromDate);
  return tasks.filter((task) => {
    if (!task.deadline) return true;
    const taskDeadline = new Date(task.deadline);
    return taskDeadline <= maxDeadline;
  });
}
