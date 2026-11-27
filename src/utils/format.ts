// Utilitas format Rupiah, tanggal zona waktu WIB (Asia/Jakarta), CSV, dan kompresi gambar

const ZONA_WAKTU = 'Asia/Jakarta';

/**
 * Format angka menjadi Rupiah Indonesia dengan pemisah titik, contoh: Rp 12.500
 */
export function formatRupiah(nominal: number): string {
  const nilai = Math.round(Number.isFinite(nominal) ? nominal : 0);
  const negatif = nilai < 0;
  const absolut = Math.abs(nilai);
  const formatted = absolut.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return negatif ? `-Rp ${formatted}` : `Rp ${formatted}`;
}

/**
 * Mengambil tanggal hari ini format YYYY-MM-DD dalam zona waktu WIB (Asia/Jakarta)
 */
export function getTanggalWIB(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_WAKTU,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

/**
 * Mengambil bagian tanggal YYYYMMDD dalam zona waktu WIB untuk nomor transaksi
 */
export function getTanggalKompakWIB(date: Date = new Date()): string {
  return getTanggalWIB(date).replace(/-/g, '');
}

/**
 * Format tanggal panjang Indonesia, contoh: 27 November 2026
 */
export function formatTanggalIndo(input: string | Date): string {
  const date = typeof input === 'string'
    ? (input.length === 10 ? new Date(`${input}T12:00:00+07:00`) : new Date(input))
    : input;

  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    timeZone: ZONA_WAKTU,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Format tanggal dan jam WIB, contoh: 27 Nov 2026, 14.30 WIB
 */
export function formatTanggalJamWIB(input: string | Date): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return '-';

  const tgl = new Intl.DateTimeFormat('id-ID', {
    timeZone: ZONA_WAKTU,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);

  const jam = new Intl.DateTimeFormat('id-ID', {
    timeZone: ZONA_WAKTU,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);

  return `${tgl}, ${jam} WIB`;
}

/**
 * Format jam ringkas WIB, contoh: 14.30
 */
export function formatJamWIB(input: string | Date): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: ZONA_WAKTU,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

/**
 * Menggeser tanggal YYYY-MM-DD sebanyak deltaHari (positif/negatif)
 */
export function geserTanggal(tanggalYYYYMMDD: string, deltaHari: number): string {
  const base = new Date(`${tanggalYYYYMMDD}T12:00:00+07:00`);
  base.setDate(base.getDate() + deltaHari);
  return getTanggalWIB(base);
}

/**
 * Mengambil tanggal YYYY-MM-DD dari ISO string dalam zona WIB
 */
export function isoKeTanggalWIB(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return getTanggalWIB();
  return getTanggalWIB(d);
}

/**
 * Membuat ID unik sederhana tanpa dependensi eksternal
 */
export function buatId(prefix = 'id'): string {
  const rand = Math.random().toString(36).slice(2, 7);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

/**
 * Parsing CSV sederhana (mendukung koma atau titik koma serta tanda kutip)
 */
export function parseCSV(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, '').trim();
  if (!clean) return [];

  const firstLine = clean.split(/\r?\n/)[0] || '';
  const delimiter = firstLine.includes(';') && !firstLine.includes(',') ? ';' : ',';

  const rows: string[][] = [];
  let row: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const next = clean[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      row.push(current.trim());
      current = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i++;
      row.push(current.trim());
      if (row.some((cell) => cell !== '')) rows.push(row);
      row = [];
      current = '';
    } else {
      current += char;
    }
  }

  row.push(current.trim());
  if (row.some((cell) => cell !== '')) rows.push(row);
  return rows;
}

/**
 * Mengubah array baris menjadi string CSV dengan BOM UTF-8 agar rapi dibuka di Excel Indonesia
 */
export function buatCSV(headers: string[], rows: (string | number | boolean)[][]): string {
  const escapeCell = (val: string | number | boolean): string => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const lines = [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))];
  return '\uFEFF' + lines.join('\r\n');
}

/**
 * Unduh file teks/JSON/CSV ke perangkat pengguna
 */
export function unduhFile(namaFile: string, konten: string, tipeMime = 'text/plain;charset=utf-8'): void {
  const blob = new Blob([konten], { type: tipeMime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = namaFile;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Mengompres file gambar upload menjadi Data URL berukuran ringan agar penyimpanan lokal tetap cepat
 */
export function kompresGambarFile(file: File, maxLebar = 600, kualitas = 0.78): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Format file gambar tidak valid.'));
      img.onload = () => {
        const skala = Math.min(1, maxLebar / Math.max(img.width, img.height));
        const lebar = Math.max(1, Math.round(img.width * skala));
        const tinggi = Math.max(1, Math.round(img.height * skala));
        const canvas = document.createElement('canvas');
        canvas.width = lebar;
        canvas.height = tinggi;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, lebar, tinggi);
        ctx.drawImage(img, 0, 0, lebar, tinggi);
        resolve(canvas.toDataURL('image/jpeg', kualitas));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
