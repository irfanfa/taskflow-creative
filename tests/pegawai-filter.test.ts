import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterPegawaiUpcomingTasks,
  getPegawaiMaxDeadlineDate,
  PEGAWAI_MAX_DEADLINE_DAYS,
} from '../src/lib/tasks/pegawai-filter';

test('Pegawai 30-Day Deadline Filter Logic', async (t) => {
  const baseTime = new Date('2026-10-24T10:00:00.000Z');

  await t.test('PEGAWAI_MAX_DEADLINE_DAYS is exactly 30', () => {
    assert.equal(PEGAWAI_MAX_DEADLINE_DAYS, 30);
  });

  await t.test('getPegawaiMaxDeadlineDate adds 30 days and sets end of day', () => {
    const maxDate = getPegawaiMaxDeadlineDate(baseTime);
    const diffMs = maxDate.getTime() - baseTime.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    assert.ok(diffDays >= 30 && diffDays <= 31);
    assert.equal(maxDate.getHours(), 23);
    assert.equal(maxDate.getMinutes(), 59);
  });

  await t.test('filterPegawaiUpcomingTasks includes overdue, today, and tasks up to 30 days ahead', () => {
    const sampleTasks = [
      { id: '1', judul: 'Overdue Task (Kemarin)', deadline: '2026-10-23T12:00:00.000Z' },
      { id: '2', judul: 'Today Task (Hari ini)', deadline: '2026-10-24T17:00:00.000Z' },
      { id: '3', judul: 'Next Week Task (7 hari)', deadline: '2026-10-31T17:00:00.000Z' },
      { id: '4', judul: 'Day 25 Task', deadline: '2026-11-18T17:00:00.000Z' },
      { id: '5', judul: 'Day 30 Task (Batas Maksimal)', deadline: '2026-11-23T15:00:00.000Z' },
      { id: '6', judul: 'Day 31 Task (> 30 hari)', deadline: '2026-11-25T10:00:00.000Z' },
      { id: '7', judul: 'Day 60 Task (> 30 hari)', deadline: '2026-12-24T10:00:00.000Z' },
    ];

    const visibleTasks = filterPegawaiUpcomingTasks(sampleTasks, baseTime);

    // Tasks 1, 2, 3, 4, 5 should be visible (5 tasks)
    // Tasks 6, 7 should NOT be visible
    assert.equal(visibleTasks.length, 5);
    const visibleIds = visibleTasks.map((t) => t.id);
    assert.deepEqual(visibleIds, ['1', '2', '3', '4', '5']);
    assert.ok(!visibleIds.includes('6'), 'Task with deadline > 30 days must not appear');
    assert.ok(!visibleIds.includes('7'), 'Task with deadline > 30 days must not appear');
  });
});
