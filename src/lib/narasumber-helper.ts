export interface NarasumberItem {
  id: number;
  nama: string;
  fotoUrl: string;
}

/**
 * Mengurai string link_referensi dari database.
 * Jika berupa JSON array narasumber, parse menjadi 3 item.
 * Jika berupa URL tunggal legacy, bungkus sebagai Narasumber 1.
 * Jika kosong/null, kembalikan 3 item kosong.
 */
export function parseNarasumberData(raw: string | null | undefined): NarasumberItem[] {
  const defaultItems: NarasumberItem[] = [
    { id: 1, nama: '', fotoUrl: '' },
    { id: 2, nama: '', fotoUrl: '' },
    { id: 3, nama: '', fotoUrl: '' },
  ];

  if (!raw || typeof raw !== 'string' || !raw.trim()) {
    return defaultItems;
  }

  const trimmed = raw.trim();

  // Jika diawali dengan kurung siku, coba parse sebagai JSON array
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return [1, 2, 3].map((num) => {
          const found =
            parsed.find((p) => p && (p.id === num || p.id === String(num))) ||
            parsed[num - 1];

          return {
            id: num,
            nama: typeof found?.nama === 'string' ? found.nama : '',
            fotoUrl:
              typeof found?.fotoUrl === 'string'
                ? found.fotoUrl
                : typeof found?.url === 'string'
                ? found.url
                : '',
          };
        });
      }
    } catch {
      // Fallback ke string biasa jika parse gagal
    }
  }

  // Format legacy: URL tunggal tanpa JSON
  return [
    { id: 1, nama: 'Lampiran / Referensi', fotoUrl: trimmed },
    { id: 2, nama: '', fotoUrl: '' },
    { id: 3, nama: '', fotoUrl: '' },
  ];
}

/**
 * Menyimpan data 3 narasumber ke bentuk string untuk kolom link_referensi.
 * Jika ketiga frame kosong, mengembalikan string kosong (akan disimpan sebagai null di DB).
 */
export function serializeNarasumberData(items: NarasumberItem[]): string {
  const hasData = items.some(
    (item) =>
      (item.nama && item.nama.trim().length > 0) ||
      (item.fotoUrl && item.fotoUrl.trim().length > 0)
  );

  if (!hasData) {
    return '';
  }

  const cleaned = items.slice(0, 3).map((item, index) => ({
    id: index + 1,
    nama: item.nama ? item.nama.trim() : '',
    fotoUrl: item.fotoUrl ? item.fotoUrl.trim() : '',
  }));

  return JSON.stringify(cleaned);
}

/**
 * Menyaring narasumber yang memiliki data (nama atau foto).
 */
export function getActiveNarasumber(items: NarasumberItem[]): NarasumberItem[] {
  return items.filter(
    (item) =>
      (item.nama && item.nama.trim().length > 0) ||
      (item.fotoUrl && item.fotoUrl.trim().length > 0)
  );
}
