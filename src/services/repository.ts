import { buatDataContoh, buatPengaturanDefault } from '../data/seedData';
import { AppData } from '../types/pos';

const DB_NAME = 'kasir_nek_upik_db';
const DB_VERSION = 1;
const STORE_NAME = 'aplikasi_state';
const RECORD_KEY = 'data_utama';
const LS_KEY = 'kasir_nek_upik_backup_mirror_v1';

/**
 * Antarmuka Lapisan Data (Repository) agar mudah diganti ke Firebase / Supabase di masa depan
 * tanpa mengubah komponen tampilan (UI).
 */
export interface PosRepository {
  muatData(): Promise<AppData>;
  simpanData(data: AppData): Promise<void>;
  resetKeDataContoh(): Promise<AppData>;
  kosongkanSemuaData(): Promise<AppData>;
}

function bukaIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB tidak tersedia di peramban ini.'));
      return;
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Gagal membuka penyimpanan IndexedDB.'));
  });
}

async function bacaDariIndexedDB(): Promise<AppData | null> {
  const db = await bukaIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(RECORD_KEY);
    req.onsuccess = () => {
      db.close();
      resolve((req.result as AppData | undefined) ?? null);
    };
    req.onerror = () => {
      db.close();
      reject(req.error ?? new Error('Gagal membaca data dari IndexedDB.'));
    };
  });
}

async function tulisKeIndexedDB(data: AppData): Promise<void> {
  const db = await bukaIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(data, RECORD_KEY);
    req.onsuccess = () => {
      db.close();
      resolve();
    };
    req.onerror = () => {
      db.close();
      reject(req.error ?? new Error('Gagal menyimpan data ke IndexedDB.'));
    };
  });
}

function normalkanData(raw: Partial<AppData>): AppData {
  const defaultSet = buatPengaturanDefault();
  return {
    barang: Array.isArray(raw.barang) ? raw.barang : [],
    transaksi: Array.isArray(raw.transaksi) ? raw.transaksi : [],
    pemasukan: Array.isArray(raw.pemasukan) ? raw.pemasukan : [],
    pengeluaran: Array.isArray(raw.pengeluaran) ? raw.pengeluaran : [],
    pergerakan_stok: Array.isArray(raw.pergerakan_stok) ? raw.pergerakan_stok : [],
    keranjang_tersimpan: Array.isArray(raw.keranjang_tersimpan) ? raw.keranjang_tersimpan : [],
    pengaturan: {
      ...defaultSet,
      ...(raw.pengaturan ?? {}),
      profil_usaha: {
        ...defaultSet.profil_usaha,
        ...(raw.pengaturan?.profil_usaha ?? {}),
      },
      pin_pengguna: {
        ...defaultSet.pin_pengguna,
        ...(raw.pengaturan?.pin_pengguna ?? {}),
      },
    },
  };
}

export class LocalPosRepository implements PosRepository {
  async muatData(): Promise<AppData> {
    try {
      const dariIdb = await bacaDariIndexedDB();
      if (dariIdb) {
        return normalkanData(dariIdb);
      }
    } catch {
      // Lanjut cek localStorage jika IndexedDB gagal
    }

    try {
      const dariLs = window.localStorage.getItem(LS_KEY);
      if (dariLs) {
        const parsed = JSON.parse(dariLs) as Partial<AppData>;
        const normal = normalkanData(parsed);
        await this.simpanData(normal);
        return normal;
      }
    } catch {
      // Abaikan jika localStorage rusak
    }

    // Pertama kali dibuka: buat data contoh demo
    const seed = buatDataContoh();
    await this.simpanData(seed);
    return seed;
  }

  async simpanData(data: AppData): Promise<void> {
    const bersih = normalkanData(data);
    let tersimpanIdb = false;

    try {
      await tulisKeIndexedDB(bersih);
      tersimpanIdb = true;
    } catch {
      tersimpanIdb = false;
    }

    try {
      window.localStorage.setItem(LS_KEY, JSON.stringify(bersih));
    } catch {
      // Jika kuota localStorage penuh karena gambar, pastikan minimal IndexedDB berhasil
      if (!tersimpanIdb) {
        throw new Error('Penyimpanan perangkat penuh atau tidak dapat diakses.');
      }
    }
  }

  async resetKeDataContoh(): Promise<AppData> {
    const seed = buatDataContoh();
    await this.simpanData(seed);
    return seed;
  }

  async kosongkanSemuaData(): Promise<AppData> {
    const kosong: AppData = {
      barang: [],
      transaksi: [],
      pemasukan: [],
      pengeluaran: [],
      pergerakan_stok: [],
      keranjang_tersimpan: [],
      pengaturan: {
        ...buatPengaturanDefault(),
        adalah_data_contoh: false,
      },
    };
    await this.simpanData(kosong);
    return kosong;
  }
}

export const posRepository: PosRepository = new LocalPosRepository();

/**
 * Validasi struktur file JSON hasil backup sebelum dipulihkan (Restore)
 */
export function validasiJsonBackup(rawText: string): AppData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error('File bukan format JSON yang valid.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Isi file cadangan tidak sesuai format.');
  }

  const obj = parsed as Record<string, unknown>;
  const kandidat = (obj.data && typeof obj.data === 'object' ? obj.data : obj) as Partial<AppData>;

  if (
    !Array.isArray(kandidat.barang) ||
    !Array.isArray(kandidat.transaksi) ||
    !Array.isArray(kandidat.pemasukan) ||
    !Array.isArray(kandidat.pengeluaran)
  ) {
    throw new Error('File cadangan tidak memiliki daftar barang, transaksi, pemasukan, atau pengeluaran yang lengkap.');
  }

  return normalkanData(kandidat);
}
