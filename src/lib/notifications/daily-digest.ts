export interface DailyDigestResult {
  totalEmployees: number;
  sentCount: number;
  skippedOptOut: number;
  skippedAlreadySent: number;
  logs: string[];
}

/**
 * Engine Rekap Harian:
 * Fitur Rekap Harian Tugas telah dinonaktifkan untuk semua role.
 */
export async function processDailyDigestEngine(_targetDateStr?: string): Promise<DailyDigestResult> {
  return {
    totalEmployees: 0,
    sentCount: 0,
    skippedOptOut: 0,
    skippedAlreadySent: 0,
    logs: ['[Daily Digest] Fitur Rekap Harian telah dinonaktifkan untuk semua role.'],
  };
}
