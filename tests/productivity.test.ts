import { test, describe } from 'node:test';
import assert from 'node:assert';

describe('Tahap 6: Laporan dan Fitur Produktivitas', () => {
  // =========================================================================
  // 1. Peringatan Beban Kerja (Workload Warning)
  // =========================================================================
  describe('Workload Warning Evaluation', () => {
    function evaluateWorkload(
      assignedTaskCounts: Record<string, number>,
      selectedEmployeeIds: string[],
      maxLimit: number
    ) {
      const overloaded = selectedEmployeeIds.filter(
        (empId) => (assignedTaskCounts[empId] || 0) >= maxLimit
      );
      return {
        isOverloaded: overloaded.length > 0,
        overloadedEmployeeIds: overloaded,
      };
    }

    test('Harus memicu peringatan jika tugas aktif pegawai >= maxLimit (default 4)', () => {
      const currentTasks = {
        emp_1: 4, // Pas batas (overloaded)
        emp_2: 2, // Aman
        emp_3: 5, // Melebihi batas (overloaded)
      };

      const result = evaluateWorkload(currentTasks, ['emp_1', 'emp_2'], 4);
      assert.strictEqual(result.isOverloaded, true);
      assert.deepStrictEqual(result.overloadedEmployeeIds, ['emp_1']);

      const resultSafe = evaluateWorkload(currentTasks, ['emp_2'], 4);
      assert.strictEqual(resultSafe.isOverloaded, false);
      assert.strictEqual(resultSafe.overloadedEmployeeIds.length, 0);

      const resultMulti = evaluateWorkload(currentTasks, ['emp_1', 'emp_3'], 4);
      assert.strictEqual(resultMulti.isOverloaded, true);
      assert.strictEqual(resultMulti.overloadedEmployeeIds.length, 2);
    });

    test('Batas batas beban kerja dinamis yang dapat diatur admin', () => {
      const currentTasks = { emp_1: 2 };

      // Jika admin menyetel batas ke 2
      const strictResult = evaluateWorkload(currentTasks, ['emp_1'], 2);
      assert.strictEqual(strictResult.isOverloaded, true);

      // Jika admin menyetel batas ke 5
      const relaxedResult = evaluateWorkload(currentTasks, ['emp_1'], 5);
      assert.strictEqual(relaxedResult.isOverloaded, false);
    });
  });

  // =========================================================================
  // 2. Evaluasi Tugas Berulang (Recurring Tasks Engine)
  // =========================================================================
  describe('Recurring Task Scheduler Engine', () => {
    interface RecurringSchedule {
      id: string;
      frekuensi: 'harian' | 'mingguan' | 'bulanan';
      hari_dalam_minggu?: number | null; // 0=Minggu, 1=Senin, ...
      tanggal_dalam_bulan?: number | null;
      tanggal_mulai: string;
      tanggal_berakhir?: string | null;
      terakhir_dibuat?: string | null;
      is_active: boolean;
    }

    function isRecurringTaskDue(schedule: RecurringSchedule, targetDateWIB: Date) {
      if (!schedule.is_active) return false;

      const dateStr = targetDateWIB.toISOString().slice(0, 10);
      if (schedule.tanggal_mulai > dateStr) return false;
      if (schedule.tanggal_berakhir && schedule.tanggal_berakhir < dateStr) return false;
      if (schedule.terakhir_dibuat === dateStr) return false; // Sudah dibuat hari ini

      const dayOfWeek = targetDateWIB.getDay(); // 0 = Minggu
      const dayOfMonth = targetDateWIB.getDate();

      if (schedule.frekuensi === 'harian') return true;
      if (schedule.frekuensi === 'mingguan') return schedule.hari_dalam_minggu === dayOfWeek;
      if (schedule.frekuensi === 'bulanan') return schedule.tanggal_dalam_bulan === dayOfMonth;
      return false;
    }

    test('Frekuensi Harian harus jatuh tempo setiap hari aktif', () => {
      const targetDate = new Date('2026-10-24T09:00:00+07:00');
      const schedule: RecurringSchedule = {
        id: 'rec_1',
        frekuensi: 'harian',
        tanggal_mulai: '2026-10-01',
        is_active: true,
      };

      assert.strictEqual(isRecurringTaskDue(schedule, targetDate), true);

      // Tapi jika sudah dibuat hari ini, harus dicegah duplikasi
      schedule.terakhir_dibuat = '2026-10-24';
      assert.strictEqual(isRecurringTaskDue(schedule, targetDate), false);
    });

    test('Frekuensi Mingguan harus hanya jatuh tempo pada hari yang cocok', () => {
      // 2026-10-24 adalah hari Sabtu (day 6)
      const saturday = new Date('2026-10-24T10:00:00+07:00');
      assert.strictEqual(saturday.getDay(), 6);

      const mondaySchedule: RecurringSchedule = {
        id: 'rec_senin',
        frekuensi: 'mingguan',
        hari_dalam_minggu: 1, // Senin
        tanggal_mulai: '2026-10-01',
        is_active: true,
      };
      assert.strictEqual(isRecurringTaskDue(mondaySchedule, saturday), false);

      const saturdaySchedule: RecurringSchedule = {
        id: 'rec_sabtu',
        frekuensi: 'mingguan',
        hari_dalam_minggu: 6, // Sabtu
        tanggal_mulai: '2026-10-01',
        is_active: true,
      };
      assert.strictEqual(isRecurringTaskDue(saturdaySchedule, saturday), true);
    });

    test('Frekuensi Bulanan harus hanya jatuh tempo pada tanggal yang cocok', () => {
      const date24th = new Date('2026-10-24T10:00:00+07:00');

      const monthly1st: RecurringSchedule = {
        id: 'rec_1st',
        frekuensi: 'bulanan',
        tanggal_dalam_bulan: 1,
        tanggal_mulai: '2026-10-01',
        is_active: true,
      };
      assert.strictEqual(isRecurringTaskDue(monthly1st, date24th), false);

      const monthly24th: RecurringSchedule = {
        id: 'rec_24th',
        frekuensi: 'bulanan',
        tanggal_dalam_bulan: 24,
        tanggal_mulai: '2026-10-01',
        is_active: true,
      };
      assert.strictEqual(isRecurringTaskDue(monthly24th, date24th), true);
    });

    test('Jadwal tidak boleh jatuh tempo jika tanggal_berakhir sudah lewat atau is_active false', () => {
      const targetDate = new Date('2026-10-24T10:00:00+07:00');
      const expiredSchedule: RecurringSchedule = {
        id: 'rec_exp',
        frekuensi: 'harian',
        tanggal_mulai: '2026-10-01',
        tanggal_berakhir: '2026-10-20', // Sudah lewat
        is_active: true,
      };
      assert.strictEqual(isRecurringTaskDue(expiredSchedule, targetDate), false);

      const inactiveSchedule: RecurringSchedule = {
        id: 'rec_inactive',
        frekuensi: 'harian',
        tanggal_mulai: '2026-10-01',
        is_active: false,
      };
      assert.strictEqual(isRecurringTaskDue(inactiveSchedule, targetDate), false);
    });
  });

  // =========================================================================
  // 3. Template Tugas (Task Templates)
  // =========================================================================
  describe('Task Template Autofill Logic', () => {
    interface Template {
      nama: string;
      deskripsi: string;
      jenis_pekerjaan: string;
      prioritas_default: string;
      estimasi_hari: number;
      spesifikasi_teknis: Record<string, string>;
      default_subtasks: string[];
    }

    const sampleTemplate: Template = {
      nama: 'Reels Instagram 30 Detik',
      deskripsi: 'Video vertikal promosi produk dengan hook 3 detik awal.',
      jenis_pekerjaan: 'Video Editing',
      prioritas_default: 'Sedang',
      estimasi_hari: 2,
      spesifikasi_teknis: {
        durasi: '30 detik',
        resolusi: '1080x1920 (Full HD Vertical)',
        rasio: '9:16',
      },
      default_subtasks: [
        'Review brief & bahan mentah',
        'Rough cut & pacing video',
        'Color grading & sound design',
        'Subtitle & export final 1080p',
      ],
    };

    test('Autofill template harus memetakan semua spesifikasi teknis dan subtasks dengan benar', () => {
      assert.strictEqual(sampleTemplate.jenis_pekerjaan, 'Video Editing');
      assert.strictEqual(sampleTemplate.spesifikasi_teknis.durasi, '30 detik');
      assert.strictEqual(sampleTemplate.spesifikasi_teknis.rasio, '9:16');
      assert.strictEqual(sampleTemplate.default_subtasks.length, 4);
      assert.strictEqual(sampleTemplate.default_subtasks[0], 'Review brief & bahan mentah');
    });

    test('Estimasi hari pengerjaan template harus menghasilkan deadline yang sesuai', () => {
      const baseTime = new Date('2026-10-24T10:00:00+07:00').getTime();
      const targetTime = baseTime + sampleTemplate.estimasi_hari * 24 * 60 * 60 * 1000;
      const targetDate = new Date(targetTime);

      assert.strictEqual(targetDate.getDate(), 26); // 24 + 2 = 26
    });
  });

  // =========================================================================
  // 4. Metrik Laporan Kinerja (Reports KPI Calculations)
  // =========================================================================
  describe('Performance Report Metrics Calculation', () => {
    function computeReportKPIs(tasks: {
      status: string;
      deadline: string;
      completed_at?: string;
      revision_count?: number;
      duration_minutes?: number;
    }[]) {
      const completedTasks = tasks.filter((t) => t.status === 'Selesai');
      const totalCompleted = completedTasks.length;

      let onTimeCount = 0;
      let totalDurationMinutes = 0;
      let totalRevisions = 0;

      tasks.forEach((t) => {
        totalRevisions += t.revision_count || 0;
        totalDurationMinutes += t.duration_minutes || 0;
      });

      completedTasks.forEach((t) => {
        if (t.completed_at && new Date(t.completed_at) <= new Date(t.deadline)) {
          onTimeCount++;
        }
      });

      const onTimeRate = totalCompleted > 0 ? Math.round((onTimeCount / totalCompleted) * 100) : 100;
      const totalWorkHours = Number((totalDurationMinutes / 60).toFixed(1));

      return {
        totalCompleted,
        onTimeRate,
        totalRevisions,
        totalWorkHours,
      };
    }

    test('Menghitung akurat persentase on-time, revisi, dan total jam kerja', () => {
      const mockTasks = [
        {
          status: 'Selesai',
          deadline: '2026-10-20T17:00:00Z',
          completed_at: '2026-10-20T15:00:00Z', // Tepat waktu
          revision_count: 0,
          duration_minutes: 120, // 2 jam
        },
        {
          status: 'Selesai',
          deadline: '2026-10-21T17:00:00Z',
          completed_at: '2026-10-22T10:00:00Z', // Terlambat
          revision_count: 2,
          duration_minutes: 180, // 3 jam
        },
        {
          status: 'Sedang Dikerjakan',
          deadline: '2026-10-25T17:00:00Z',
          revision_count: 1,
          duration_minutes: 60, // 1 jam
        },
      ];

      const kpis = computeReportKPIs(mockTasks);

      // Selesai: 2 tugas
      assert.strictEqual(kpis.totalCompleted, 2);
      // Tepat waktu: 1 dari 2 = 50%
      assert.strictEqual(kpis.onTimeRate, 50);
      // Total revisi: 0 + 2 + 1 = 3 revisi
      assert.strictEqual(kpis.totalRevisions, 3);
      // Total jam kerja: (120 + 180 + 60) / 60 = 360 / 60 = 6.0 jam
      assert.strictEqual(kpis.totalWorkHours, 6.0);
    });
  });

  // =========================================================================
  // 5. Otomatisasi Tugas Desain E-Flyer Hari Besar Nasional
  // =========================================================================
  describe('Automatic Indonesian Holiday E-Flyer Generator', () => {
    interface HolidayDef {
      nama: string;
      tanggal: string;
      kategoriHari: 'libur_nasional' | 'hari_peringatan';
    }

    function generateUpcomingHolidayTasks(
      holidays: HolidayDef[],
      currentDateStr: string,
      existingTaskTitles: string[]
    ) {
      const existingSet = new Set(existingTaskTitles.map((t) => t.toLowerCase().trim()));
      const upcoming = holidays.filter((h) => h.tanggal >= currentDateStr);

      const generated = [];
      let skippedCount = 0;

      for (const h of upcoming) {
        const title = `Desain E-Flyer ${h.nama}`;
        if (existingSet.has(title.toLowerCase().trim())) {
          skippedCount++;
          continue;
        }

        generated.push({
          judul: title,
          jenis_pekerjaan: 'Desain E-Flyer',
          klien_proyek: 'Internal Instansi',
          prioritas: h.kategoriHari === 'libur_nasional' ? 'Tinggi' : 'Sedang',
          status: 'Belum Dimulai',
          deadline: `${h.tanggal}T09:00:00+07:00`,
          perlu_upload_sosmed: true,
        });
      }

      return { generated, skippedCount };
    }

    test('Menyaring hari besar mendatang dan memetakan prioritas dengan tepat', () => {
      const mockHolidays: HolidayDef[] = [
        { nama: 'Hari Kemerdekaan RI 2026', tanggal: '2026-08-17', kategoriHari: 'libur_nasional' }, // Lewat
        { nama: 'Hari Sumpah Pemuda 2026', tanggal: '2026-10-28', kategoriHari: 'hari_peringatan' }, // Mendatang
        { nama: 'Hari Raya Natal 2026', tanggal: '2026-12-25', kategoriHari: 'libur_nasional' }, // Mendatang
      ];

      const res = generateUpcomingHolidayTasks(mockHolidays, '2026-10-24', []);
      assert.strictEqual(res.generated.length, 2);
      assert.strictEqual(res.skippedCount, 0);

      // Prioritas Libur Nasional = Tinggi
      const natal = res.generated.find((t) => t.judul.includes('Natal'));
      assert.strictEqual(natal?.prioritas, 'Tinggi');

      // Prioritas Hari Peringatan = Sedang
      const pemuda = res.generated.find((t) => t.judul.includes('Sumpah Pemuda'));
      assert.strictEqual(pemuda?.prioritas, 'Sedang');
      assert.strictEqual(pemuda?.jenis_pekerjaan, 'Desain E-Flyer');
      assert.strictEqual(pemuda?.klien_proyek, 'Internal Instansi');
      assert.strictEqual(pemuda?.perlu_upload_sosmed, true);
    });

    test('Mencegah duplikasi tugas jika tugas e-flyer hari besar tersebut sudah ada di database', () => {
      const mockHolidays: HolidayDef[] = [
        { nama: 'Hari Sumpah Pemuda 2026', tanggal: '2026-10-28', kategoriHari: 'hari_peringatan' },
        { nama: 'Hari Pahlawan Nasional 2026', tanggal: '2026-11-10', kategoriHari: 'hari_peringatan' },
      ];

      // Hari Sumpah Pemuda sudah pernah dibuat sebelumnya
      const existing = ['Desain E-Flyer Hari Sumpah Pemuda 2026'];

      const res = generateUpcomingHolidayTasks(mockHolidays, '2026-10-24', existing);
      assert.strictEqual(res.generated.length, 1);
      assert.strictEqual(res.skippedCount, 1);
      assert.strictEqual(res.generated[0].judul, 'Desain E-Flyer Hari Pahlawan Nasional 2026');
      assert.strictEqual(res.generated[0].perlu_upload_sosmed, true);
    });
  });

  describe('Alur Tugas Posting Pengelola Sosmed', () => {
    interface PostingTask {
      id: string;
      judul: string;
      status: string;
      perlu_upload_sosmed: boolean;
      status_posting?: 'menunggu_posting' | 'sudah_diposting';
      link_posting?: string | null;
    }

    test('Hanya tugas dengan status Selesai DAN perlu_upload_sosmed = true yang masuk antrean Tugas Posting', () => {
      const tasks: PostingTask[] = [
        { id: '1', judul: 'Tugas Belum Selesai', status: 'Sedang Dikerjakan', perlu_upload_sosmed: true },
        { id: '2', judul: 'Tugas Selesai Non-Sosmed', status: 'Selesai', perlu_upload_sosmed: false },
        { id: '3', judul: 'Tugas Selesai Masuk Sosmed', status: 'Selesai', perlu_upload_sosmed: true },
      ];

      const antreanPosting = tasks.filter(
        (t) => t.status === 'Selesai' && t.perlu_upload_sosmed === true
      );

      assert.strictEqual(antreanPosting.length, 1);
      assert.strictEqual(antreanPosting[0].id, '3');
    });

    test('Transisi status posting dari menunggu_posting ke sudah_diposting', () => {
      let task: PostingTask = {
        id: '10',
        judul: 'Flyer Hari Sumpah Pemuda',
        status: 'Selesai',
        perlu_upload_sosmed: true,
        status_posting: 'menunggu_posting',
      };

      assert.strictEqual(task.status_posting, 'menunggu_posting');

      // Simulasi markTaskAsPosted
      task = {
        ...task,
        status_posting: 'sudah_diposting',
        link_posting: 'https://instagram.com/p/sumpahpemuda2026',
      };

      assert.strictEqual(task.status_posting, 'sudah_diposting');
      assert.ok(task.link_posting);
    });
  });
});

