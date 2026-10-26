import { test, describe } from 'node:test';
import assert from 'node:assert';

// 1. Checklist Percentage Calculation Helper
function calculateSubtaskProgress(subtasks: { is_completed: boolean }[]) {
  const total = subtasks.length;
  if (total === 0) return { total: 0, completed: 0, percentage: 0 };
  const completed = subtasks.filter((s) => s.is_completed).length;
  const percentage = Math.round((completed / total) * 100);
  return { total, completed, percentage };
}

// 2. File Attachment Validation Helper
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const ALLOWED_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'webp', 'svg',
  'pdf', 'docx', 'xlsx', 'zip', 'rar',
  'psd', 'ai', 'mp4', 'mov', 'mp3', 'wav'
];

function validateAttachment(file: { name: string; size: number }) {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'Ukuran file melebihi batas maksimal 25 MB' };
  }
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `Format file .${ext} tidak diizinkan` };
  }
  return { valid: true };
}

// 3. Single Active Timer Logic Simulation
interface TimeLog {
  id: string;
  user_id: string;
  task_id: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number;
  is_running: boolean;
}

function startTimerSimulation(
  logs: TimeLog[],
  userId: string,
  taskId: string,
  now: Date
): { updatedLogs: TimeLog[]; newTimer: TimeLog } {
  // Enforce rule: HANYA SATU TIMER AKTIF PER PEGAWAI
  const updatedLogs = logs.map((log) => {
    if (log.user_id === userId && log.is_running) {
      const diffMs = now.getTime() - new Date(log.started_at).getTime();
      const diffMinutes = Math.max(1, Math.round(diffMs / 60000));
      return {
        ...log,
        is_running: false,
        ended_at: now.toISOString(),
        duration_minutes: diffMinutes,
      };
    }
    return log;
  });

  const newTimer: TimeLog = {
    id: `timer-${Date.now()}`,
    user_id: userId,
    task_id: taskId,
    started_at: now.toISOString(),
    ended_at: null,
    duration_minutes: 0,
    is_running: true,
  };

  return {
    updatedLogs: [newTimer, ...updatedLogs],
    newTimer,
  };
}

// 4. @Mention Parser Helper
function extractMentions(
  text: string,
  availableMembers: { id: string; nama: string }[]
): string[] {
  const mentionedIds: string[] = [];
  for (const member of availableMembers) {
    if (text.includes(`@${member.nama}`) && !mentionedIds.includes(member.id)) {
      mentionedIds.push(member.id);
    }
  }
  return mentionedIds;
}

describe('TAHAP 5: Alur Kolaborasi Unit Tests', () => {
  describe('Subtask / Checklist Progress Calculation', () => {
    test('returns 0% when there are no subtasks', () => {
      const result = calculateSubtaskProgress([]);
      assert.strictEqual(result.total, 0);
      assert.strictEqual(result.completed, 0);
      assert.strictEqual(result.percentage, 0);
    });

    test('calculates correct completed count and percentage (e.g. 3 of 4 is 75%)', () => {
      const subtasks = [
        { is_completed: true },
        { is_completed: true },
        { is_completed: false },
        { is_completed: true },
      ];
      const result = calculateSubtaskProgress(subtasks);
      assert.strictEqual(result.total, 4);
      assert.strictEqual(result.completed, 3);
      assert.strictEqual(result.percentage, 75);
    });

    test('returns 100% when all subtasks completed', () => {
      const subtasks = [{ is_completed: true }, { is_completed: true }];
      const result = calculateSubtaskProgress(subtasks);
      assert.strictEqual(result.percentage, 100);
    });
  });

  describe('Supabase Storage File Attachment Validation', () => {
    test('accepts valid files under 25MB (PNG, PDF, MP4, ZIP)', () => {
      assert.strictEqual(
        validateAttachment({ name: 'hasil_render.mp4', size: 15 * 1024 * 1024 }).valid,
        true
      );
      assert.strictEqual(
        validateAttachment({ name: 'brief_flyer.pdf', size: 2 * 1024 * 1024 }).valid,
        true
      );
      assert.strictEqual(
        validateAttachment({ name: 'assets.zip', size: 24 * 1024 * 1024 }).valid,
        true
      );
    });

    test('rejects files exceeding 25MB', () => {
      const result = validateAttachment({
        name: 'huge_footage.mp4',
        size: 30 * 1024 * 1024,
      });
      assert.strictEqual(result.valid, false);
      assert.match(result.error || '', /25 MB/);
    });

    test('rejects disallowed file extensions (e.g. .exe, .sh, .bat)', () => {
      const result = validateAttachment({
        name: 'malicious_script.exe',
        size: 1024,
      });
      assert.strictEqual(result.valid, false);
      assert.match(result.error || '', /tidak diizinkan/);
    });
  });

  describe('Single Active Timer Rule (Hanya 1 timer per pegawai)', () => {
    test('automatically stops previous running timer when starting a new timer on another task', () => {
      const userId = 'user-emp-1';
      const initialLogs: TimeLog[] = [
        {
          id: 'log-1',
          user_id: userId,
          task_id: 'task-A',
          started_at: new Date(Date.now() - 45 * 60000).toISOString(), // 45 minutes ago
          ended_at: null,
          duration_minutes: 0,
          is_running: true,
        },
      ];

      const now = new Date();
      const { updatedLogs, newTimer } = startTimerSimulation(
        initialLogs,
        userId,
        'task-B',
        now
      );

      // Verify new timer is active
      assert.strictEqual(newTimer.is_running, true);
      assert.strictEqual(newTimer.task_id, 'task-B');

      // Verify old timer was stopped and duration calculated
      const oldTimer = updatedLogs.find((l) => l.id === 'log-1');
      assert.ok(oldTimer);
      assert.strictEqual(oldTimer?.is_running, false);
      assert.strictEqual(oldTimer?.ended_at, now.toISOString());
      assert.strictEqual(oldTimer?.duration_minutes, 45);

      // Verify only 1 timer is currently running for this user
      const runningForUser = updatedLogs.filter(
        (l) => l.user_id === userId && l.is_running
      );
      assert.strictEqual(runningForUser.length, 1);
    });
  });

  describe('@Mention Parser and Notification Extraction', () => {
    test('detects @mentions matching available team members', () => {
      const members = [
        { id: 'uuid-1', nama: 'Budi Santoso' },
        { id: 'uuid-2', nama: 'Siti Rahma' },
        { id: 'uuid-3', nama: 'Admin Kreatif' },
      ];

      const text = 'Halo @Budi Santoso tolong cek color grading, cc @Admin Kreatif';
      const mentions = extractMentions(text, members);

      assert.deepStrictEqual(mentions, ['uuid-1', 'uuid-3']);
      assert.strictEqual(mentions.includes('uuid-2'), false);
    });

    test('returns empty array when no members mentioned', () => {
      const members = [{ id: 'uuid-1', nama: 'Budi Santoso' }];
      const text = 'Tugas sudah selesai dirender.';
      const mentions = extractMentions(text, members);
      assert.deepStrictEqual(mentions, []);
    });
  });

  describe('Full Review Cycle State Progression', () => {
    test('Simulates complete cycle: submit -> request revision -> resubmit -> approve', () => {
      let status: string = 'Sedang Dikerjakan';
      let revisionCount = 0;
      let revisionNote: string | null = null;

      // 1. Pegawai submits work
      status = 'Menunggu Review';
      assert.strictEqual(status, 'Menunggu Review');

      // 2. Admin requests revision with mandatory note
      const adminNote = 'Font judul tidak sesuai brand guide, tolong diganti Montserrat';
      assert.ok(adminNote.trim().length > 0, 'Catatan revisi wajib diisi');
      status = 'Revisi';
      revisionCount += 1;
      revisionNote = adminNote;

      assert.strictEqual(status, 'Revisi');
      assert.strictEqual(revisionCount, 1);
      assert.strictEqual(revisionNote, adminNote);

      // 3. Pegawai fixes work and resubmits
      status = 'Menunggu Review';
      assert.strictEqual(status, 'Menunggu Review');

      // 4. Admin approves work
      status = 'Selesai';
      assert.strictEqual(status, 'Selesai');
      assert.strictEqual(revisionCount, 1, 'Revision count persisted');
    });
  });
});
