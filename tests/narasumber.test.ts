import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseNarasumberData,
  serializeNarasumberData,
  getActiveNarasumber,
  NarasumberItem,
} from '../src/lib/narasumber-helper';

test('Narasumber Helper Functions', async (t) => {
  await t.test('parseNarasumberData returns 3 empty items when input is empty or null', () => {
    const resNull = parseNarasumberData(null);
    assert.equal(resNull.length, 3);
    assert.deepEqual(resNull[0], { id: 1, nama: '', fotoUrl: '' });
    assert.deepEqual(resNull[1], { id: 2, nama: '', fotoUrl: '' });
    assert.deepEqual(resNull[2], { id: 3, nama: '', fotoUrl: '' });

    const resEmpty = parseNarasumberData('');
    assert.equal(resEmpty.length, 3);
  });

  await t.test('parseNarasumberData parses structured JSON array correctly', () => {
    const rawJson = JSON.stringify([
      { id: 1, nama: 'Dr. Budi Santoso', fotoUrl: 'https://res.cloudinary.com/demo/image/upload/budi.jpg' },
      { id: 2, nama: 'Siti Rahmawati', fotoUrl: 'https://res.cloudinary.com/demo/image/upload/siti.png' },
    ]);

    const result = parseNarasumberData(rawJson);
    assert.equal(result.length, 3);
    assert.equal(result[0].nama, 'Dr. Budi Santoso');
    assert.equal(result[0].fotoUrl, 'https://res.cloudinary.com/demo/image/upload/budi.jpg');
    assert.equal(result[1].nama, 'Siti Rahmawati');
    assert.equal(result[2].nama, '');
    assert.equal(result[2].fotoUrl, '');
  });

  await t.test('parseNarasumberData handles legacy single URL gracefully', () => {
    const legacyUrl = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
    const result = parseNarasumberData(legacyUrl);

    assert.equal(result.length, 3);
    assert.equal(result[0].nama, 'Lampiran / Referensi');
    assert.equal(result[0].fotoUrl, legacyUrl);
    assert.equal(result[1].nama, '');
    assert.equal(result[2].nama, '');
  });

  await t.test('serializeNarasumberData returns empty string when all items are empty', () => {
    const emptyItems: NarasumberItem[] = [
      { id: 1, nama: '', fotoUrl: '' },
      { id: 2, nama: '   ', fotoUrl: '' },
      { id: 3, nama: '', fotoUrl: '   ' },
    ];

    const serialized = serializeNarasumberData(emptyItems);
    assert.equal(serialized, '');
  });

  await t.test('serializeNarasumberData serializes items with names and photos', () => {
    const items: NarasumberItem[] = [
      { id: 1, nama: '  Prof. Ahmad  ', fotoUrl: 'https://res.cloudinary.com/demo/ahmad.jpg' },
      { id: 2, nama: '', fotoUrl: '' },
      { id: 3, nama: '', fotoUrl: '' },
    ];

    const serialized = serializeNarasumberData(items);
    assert.ok(serialized.startsWith('['));
    const parsed = JSON.parse(serialized);
    assert.equal(parsed.length, 3);
    assert.equal(parsed[0].nama, 'Prof. Ahmad');
    assert.equal(parsed[0].fotoUrl, 'https://res.cloudinary.com/demo/ahmad.jpg');
  });

  await t.test('getActiveNarasumber filters items with data', () => {
    const items: NarasumberItem[] = [
      { id: 1, nama: 'Narasumber 1', fotoUrl: 'https://img.com/1.jpg' },
      { id: 2, nama: 'Narasumber 2 tanpa foto', fotoUrl: '' },
      { id: 3, nama: '', fotoUrl: '' },
    ];

    const active = getActiveNarasumber(items);
    assert.equal(active.length, 2);
    assert.equal(active[0].id, 1);
    assert.equal(active[1].id, 2);
  });
});
