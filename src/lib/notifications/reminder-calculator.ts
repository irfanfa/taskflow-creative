export type ReminderStage = 'h3' | 'h1' | '3h' | 'overdue';

export interface StageCalculationResult {
  stage: ReminderStage;
  stageKey: string;
  diffHours: number;
  badgeLabel: string;
  badgeColor: string;
}

/**
 * Logika murni penentuan tahap pengingat berdasarkan waktu deadline dan waktu saat ini (WIB).
 * Fungsi ini murni dan dapat diuji dengan unit test independen.
 */
export function determineReminderStage(
  deadline: Date | string,
  now: Date = new Date()
): StageCalculationResult | null {
  const deadlineDate = typeof deadline === 'string' ? new Date(deadline) : deadline;
  const diffMs = deadlineDate.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  // 1. Kasus Terlambat (Overdue): Deadline telah terlewati
  if (diffHours < 0) {
    // Kunci unik per hari: overdue_YYYY-MM-DD
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;

    return {
      stage: 'overdue',
      stageKey: `overdue_${dateKey}`,
      diffHours,
      badgeLabel: 'TERLAMBAT (OVERDUE)',
      badgeColor: '#e11d48', // rose-600
    };
  }

  // 2. Kasus Mendesak: 0 < diffHours <= 3 jam
  if (diffHours <= 3) {
    return {
      stage: '3h',
      stageKey: '3h',
      diffHours,
      badgeLabel: 'MENDESAK (3 JAM)',
      badgeColor: '#ea580c', // orange-600
    };
  }

  // 3. Kasus Peringatan: 3 < diffHours <= 24 jam (H-1)
  if (diffHours <= 24) {
    return {
      stage: 'h1',
      stageKey: 'h1',
      diffHours,
      badgeLabel: 'PERINGATAN (H-1)',
      badgeColor: '#d97706', // amber-600
    };
  }

  // 4. Kasus Informasi: 24 < diffHours <= 72 jam (H-3)
  if (diffHours <= 72) {
    return {
      stage: 'h3',
      stageKey: 'h3',
      diffHours,
      badgeLabel: 'INFORMASI (H-3)',
      badgeColor: '#4f46e5', // indigo-600
    };
  }

  // Masih di atas 72 jam, belum saatnya pengingat dikirim
  return null;
}
