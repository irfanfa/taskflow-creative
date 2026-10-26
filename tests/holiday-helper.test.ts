import test from 'node:test';
import assert from 'node:assert/strict';
import { isHolidayTask, INDONESIAN_HOLIDAY_KEYWORDS } from '../src/lib/tasks/holiday-helper';

test('Holiday Helper (isHolidayTask) Logic Tests', async (t) => {
  await t.test('returns false for null or undefined task', () => {
    assert.equal(isHolidayTask(null), false);
    assert.equal(isHolidayTask(undefined), false);
  });

  await t.test('returns false for general tasks even if jenis_pekerjaan is Desain E-Flyer', () => {
    // Exact user tasks reported:
    assert.equal(
      isHolidayTask({
        judul: 'Desain Drama Radio',
        jenis_pekerjaan: 'Desain E-Flyer',
        deskripsi: null,
        spesifikasi_teknis: {},
      }),
      false
    );

    assert.equal(
      isHolidayTask({
        judul: 'Coba',
        jenis_pekerjaan: 'Desain E-Flyer',
        deskripsi: null,
        spesifikasi_teknis: {},
      }),
      false
    );

    assert.equal(
      isHolidayTask({
        judul: 'Desain Flyer Brosur Promo Wisata',
        jenis_pekerjaan: 'Desain E-Flyer',
        deskripsi: 'Brosur promo akhir pekan',
        spesifikasi_teknis: {},
      }),
      false
    );

    assert.equal(
      isHolidayTask({
        judul: 'Laporan Kegiatan Kerja Sehari-hari',
        jenis_pekerjaan: 'Laporan',
        deskripsi: 'Rutinitas kantor',
        spesifikasi_teknis: {},
      }),
      false
    );
  });

  await t.test('returns true for tasks with explicit is_hari_besar metadata in spesifikasi_teknis', () => {
    assert.equal(
      isHolidayTask({
        judul: 'Custom Flyer Acara',
        spesifikasi_teknis: { is_hari_besar: true },
      }),
      true
    );

    assert.equal(
      isHolidayTask({
        judul: 'Custom Flyer Acara 2',
        spesifikasi_teknis: { kategori: 'hari_besar' },
      }),
      true
    );
  });

  await t.test('returns true for tasks with official automated holiday template in deskripsi', () => {
    assert.equal(
      isHolidayTask({
        judul: 'Desain Flyer Peringatan',
        deskripsi: `Instruksi Pengerjaan Desain E-Flyer Resmi:
Tema / Acara: Hari Sumpah Pemuda 2026
Ketentuan Teknis Publikasi Media Sosial:`,
      }),
      true
    );
  });

  await t.test('returns true for genuine national holiday titles', () => {
    const holidayTitles = [
      'Desain E-Flyer Hari Sumpah Pemuda 2026',
      'Desain E-Flyer Hari Pahlawan Nasional 2026',
      'Desain E-Flyer Hari Guru Nasional 2026',
      'Desain E-Flyer Hari Ibu Nasional 2026',
      'Desain E-Flyer Hari Raya Natal 2026',
      'Desain E-Flyer Tahun Baru Masehi 2027',
      'Desain E-Flyer Tahun Baru Imlek 2578 Kongzili',
      'Desain E-Flyer Isra Mi’raj Nabi Muhammad SAW 2027',
      'Desain E-Flyer Hari Suci Nyepi Tahun Baru Saka 1949',
      'Desain E-Flyer Hari Raya Idul Fitri 1448 H',
      'Desain E-Flyer Wafat Yesus Kristus (Jumat Agung) 2027',
      'Desain E-Flyer Hari Kartini 2027',
      'Desain E-Flyer Hari Buruh Internasional 2027',
      'Desain E-Flyer Hari Pendidikan Nasional (Hardiknas) 2027',
      'Desain E-Flyer Kenaikan Yesus Kristus 2027',
      'Desain E-Flyer Hari Raya Waisak 2571 BE',
      'Desain E-Flyer Hari Lahir Pancasila 2027',
      'Desain E-Flyer Hari Kemerdekaan Republik Indonesia ke-82',
      'Desain E-Flyer Maulid Nabi Muhammad SAW 2027',
      'Desain E-Flyer Hari Kesaktian Pancasila 2027',
      'Desain E-Flyer Hari Tentara Nasional Indonesia (TNI) 2027',
      'Peringatan Hari Santri 2026',
    ];

    for (const title of holidayTitles) {
      assert.equal(
        isHolidayTask({
          judul: title,
          jenis_pekerjaan: 'Desain E-Flyer',
        }),
        true,
        `Expected "${title}" to be detected as Hari Besar`
      );
    }
  });
});
