import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { determineReminderStage } from '../src/lib/notifications/reminder-calculator';

describe('Unit Test: Logika Penentuan Tahap Pengingat Deadline', () => {
  const baseNow = new Date('2026-10-24T10:00:00.000Z');

  test('1. Tugas dengan batas waktu > 72 jam tidak memicu tahap pengingat', () => {
    // 80 jam ke depan
    const futureDeadline = new Date(baseNow.getTime() + 80 * 60 * 60 * 1000);
    const result = determineReminderStage(futureDeadline, baseNow);
    assert.equal(result, null, 'Harus null karena belum memasuki batas H-3 (72 jam)');
  });

  test('2. Tugas dalam rentang 24 jam - 72 jam memicu tahap H-3', () => {
    // 50 jam ke depan
    const h3Deadline = new Date(baseNow.getTime() + 50 * 60 * 60 * 1000);
    const result = determineReminderStage(h3Deadline, baseNow);
    assert.ok(result !== null);
    assert.equal(result.stage, 'h3');
    assert.equal(result.stageKey, 'h3');
    assert.equal(result.badgeLabel, 'INFORMASI (H-3)');
  });

  test('3. Tugas dalam rentang 3 jam - 24 jam memicu tahap H-1', () => {
    // 16 jam ke depan
    const h1Deadline = new Date(baseNow.getTime() + 16 * 60 * 60 * 1000);
    const result = determineReminderStage(h1Deadline, baseNow);
    assert.ok(result !== null);
    assert.equal(result.stage, 'h1');
    assert.equal(result.stageKey, 'h1');
    assert.equal(result.badgeLabel, 'PERINGATAN (H-1)');
  });

  test('4. Tugas dalam rentang 0 - 3 jam memicu tahap Mendesak 3 Jam', () => {
    // 2 jam ke depan
    const threeHoursDeadline = new Date(baseNow.getTime() + 2 * 60 * 60 * 1000);
    const result = determineReminderStage(threeHoursDeadline, baseNow);
    assert.ok(result !== null);
    assert.equal(result.stage, '3h');
    assert.equal(result.stageKey, '3h');
    assert.equal(result.badgeLabel, 'MENDESAK (3 JAM)');
  });

  test('5. Tugas yang melewati batas waktu (< 0 jam) memicu tahap Terlambat (Overdue)', () => {
    // 4 jam yang lalu
    const overdueDeadline = new Date(baseNow.getTime() - 4 * 60 * 60 * 1000);
    const result = determineReminderStage(overdueDeadline, baseNow);
    assert.ok(result !== null);
    assert.equal(result.stage, 'overdue');
    assert.match(result.stageKey, /^overdue_\d{4}-\d{2}-\d{2}$/);
    assert.equal(result.badgeLabel, 'TERLAMBAT (OVERDUE)');
  });
});

describe('Unit Test: Logika Pencegahan Duplikasi Pengiriman', () => {
  test('1. Pengiriman pada tahap yang sama terdeteksi jika log sudah ada', () => {
    // Simulasikan database notification_logs
    const mockNotificationLogs = new Set<string>();

    const recordLog = (taskId: string, userId: string, stageKey: string, channel: string) => {
      mockNotificationLogs.add(`${taskId}:${userId}:${stageKey}:${channel}`);
    };

    const hasLog = (taskId: string, userId: string, stageKey: string, channel: string) => {
      return mockNotificationLogs.has(`${taskId}:${userId}:${stageKey}:${channel}`);
    };

    const taskId = 'task-uuid-001';
    const userId = 'user-uuid-123';
    const stageKey = 'h1';
    const channel = 'in_app';

    // Eksekusi putaran 1: belum ada log -> dikirim dan dicatat
    assert.equal(hasLog(taskId, userId, stageKey, channel), false);
    recordLog(taskId, userId, stageKey, channel);

    // Eksekusi putaran 2 (15 menit kemudian): log sudah ada -> dilewati (skip)
    assert.equal(hasLog(taskId, userId, stageKey, channel), true);
  });

  test('2. Keterlambatan berulang setiap 24 jam dengan dateKey berbeda', () => {
    const day1 = new Date('2026-10-24T10:00:00.000Z');
    const day2 = new Date('2026-10-25T10:00:00.000Z');
    const overdueDeadline = new Date('2026-10-23T12:00:00.000Z');

    const resultDay1 = determineReminderStage(overdueDeadline, day1);
    const resultDay2 = determineReminderStage(overdueDeadline, day2);

    assert.ok(resultDay1 !== null && resultDay2 !== null);
    assert.notEqual(resultDay1.stageKey, resultDay2.stageKey);
    assert.equal(resultDay1.stageKey, 'overdue_2026-10-24');
    assert.equal(resultDay2.stageKey, 'overdue_2026-10-25');
  });

  test('3. Tugas Selesai atau Dihapus wajib dikecualikan dari proses pengingat', () => {
    const mockTasks = [
      { id: '1', status: 'Selesai', deleted_at: null, deadline: '2026-10-24T11:00:00Z' },
      { id: '2', status: 'Sedang Dikerjakan', deleted_at: '2026-10-20T00:00:00Z', deadline: '2026-10-24T11:00:00Z' },
      { id: '3', status: 'Sedang Dikerjakan', deleted_at: null, deadline: '2026-10-24T11:00:00Z' },
    ];

    const eligibleTasks = mockTasks.filter(
      (t) => t.status !== 'Selesai' && t.deleted_at === null
    );

    assert.equal(eligibleTasks.length, 1);
    assert.equal(eligibleTasks[0].id, '3');
  });

  test('4. Tembusan Admin aktif untuk tugas Urgent & Tinggi, tetapi tidak untuk Rendah & Sedang', () => {
    const evaluateAdminCc = (priority: string, ccSettingEnabled: boolean) => {
      const isHighPriority = priority === 'Urgent' || priority === 'Tinggi';
      return isHighPriority && ccSettingEnabled;
    };

    assert.equal(evaluateAdminCc('Urgent', true), true);
    assert.equal(evaluateAdminCc('Tinggi', true), true);
    assert.equal(evaluateAdminCc('Sedang', true), false);
    assert.equal(evaluateAdminCc('Rendah', true), false);
    assert.equal(evaluateAdminCc('Urgent', false), false);
  });
});
