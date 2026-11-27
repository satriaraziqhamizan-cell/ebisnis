import {
  AppData,
  Barang,
  ItemBelanjaStok,
  ItemTransaksi,
  KategoriPengeluaran,
  MetodeBayar,
  Pemasukan,
  Pengeluaran,
  PergerakanStok,
  Transaksi,
} from '../types/pos';
import {
  buatId,
  getTanggalKompakWIB,
  getTanggalWIB,
  isoKeTanggalWIB,
} from '../utils/format';

export interface InputSelesaikanPenjualan {
  item: ItemTransaksi[];
  diskon: number;
  metode: MetodeBayar;
  uang_diterima: number;
  catatan: string;
  kasir: string;
}

export interface HasilOperasi<T = void> {
  dataBaru: AppData;
  hasil: T;
}

/**
 * Menghasilkan nomor transaksi berurutan per hari WIB: TRX-YYYYMMDD-0001
 */
export function buatNomorTransaksi(transaksiList: Transaksi[], tanggalReferensi = new Date()): string {
  const kompak = getTanggalKompakWIB(tanggalReferensi);
  const awalan = `TRX-${kompak}-`;
  let maxUrut = 0;

  for (const t of transaksiList) {
    if (t.nomor.startsWith(awalan)) {
      const angka = parseInt(t.nomor.slice(awalan.length), 10);
      if (Number.isFinite(angka) && angka > maxUrut) {
        maxUrut = angka;
      }
    }
  }

  const berikutnya = String(maxUrut + 1).padStart(4, '0');
  return `${awalan}${berikutnya}`;
}

/**
 * Menyelesaikan satu transaksi penjualan secara atomik:
 * 1. Validasi stok & uang diterima (hitung total dan kembalian)
 * 2. Kurangi stok barang (untuk barang yang melacak stok)
 * 3. Catat pergerakan stok (KELUAR)
 * 4. Simpan transaksi (SELESAI)
 * 5. Catat pemasukan otomatis (PENJUALAN)
 */
export function prosesPenjualanAtomik(
  data: AppData,
  input: InputSelesaikanPenjualan
): HasilOperasi<Transaksi> {
  if (!input.item || input.item.length === 0) {
    throw new Error('Keranjang belanja masih kosong.');
  }

  // Hitung subtotal dan validasi stok setiap barang
  const petaBarang = new Map(data.barang.map((b) => [b.id, b]));
  const itemTervalidasi: ItemTransaksi[] = [];

  for (const item of input.item) {
    const barang = petaBarang.get(item.barang_id);
    if (!barang) {
      throw new Error(`Barang "${item.nama}" tidak ditemukan.`);
    }
    if (item.jumlah <= 0) {
      throw new Error(`Jumlah "${barang.nama}" harus minimal 1.`);
    }
    // Cegah penjualan melebihi stok untuk barang yang melacak stok
    if (barang.lacak_stok && item.jumlah > barang.stok) {
      throw new Error(
        `Stok "${barang.nama}" tidak cukup (tersisa ${barang.stok} ${barang.satuan}).`
      );
    }
    itemTervalidasi.push({
      barang_id: barang.id,
      nama: barang.nama,
      harga: barang.harga_jual,
      satuan: barang.satuan,
      jumlah: item.jumlah,
      subtotal: barang.harga_jual * item.jumlah,
    });
  }

  // Hitung total akhir setelah diskon nominal
  const subtotal = itemTervalidasi.reduce((acc, it) => acc + it.subtotal, 0);
  const diskon = Math.max(0, Math.min(subtotal, Math.round(input.diskon || 0)));
  const total = Math.max(0, subtotal - diskon);

  // Hitung uang diterima dan kembalian sesuai metode bayar
  let uangDiterima = total;
  let kembalian = 0;

  if (input.metode === 'TUNAI') {
    uangDiterima = Math.round(input.uang_diterima || 0);
    if (uangDiterima < total) {
      throw new Error('Uang yang diterima masih kurang dari total belanja.');
    }
    kembalian = uangDiterima - total;
  }

  const sekarang = new Date();
  const waktuIso = sekarang.toISOString();
  const tanggalWib = getTanggalWIB(sekarang);
  const nomor = buatNomorTransaksi(data.transaksi, sekarang);
  const trxId = buatId('trx');

  // 1. Kurangi stok barang & catat riwayat pergerakan stok
  const pergerakanBaru: PergerakanStok[] = [];
  const barangBaru = data.barang.map((b) => {
    const terjual = itemTervalidasi.find((it) => it.barang_id === b.id);
    if (!terjual || !b.lacak_stok) return b;

    const stokSebelum = b.stok;
    const stokSesudah = Math.max(0, stokSebelum - terjual.jumlah);

    pergerakanBaru.push({
      id: buatId('stk'),
      barang_id: b.id,
      nama_barang: b.nama,
      tanggal_waktu: waktuIso,
      jenis: 'KELUAR',
      jumlah: -terjual.jumlah,
      stok_sebelum: stokSebelum,
      stok_sesudah: stokSesudah,
      keterangan: `Penjualan ${nomor}`,
      oleh: input.kasir,
    });

    return {
      ...b,
      stok: stokSesudah,
    };
  });

  // 2. Buat catatan transaksi
  const transaksiBaru: Transaksi = {
    id: trxId,
    nomor,
    tanggal_waktu: waktuIso,
    item: itemTervalidasi,
    subtotal,
    diskon,
    total,
    metode: input.metode,
    uang_diterima: uangDiterima,
    kembalian,
    catatan: input.catatan.trim(),
    status: 'SELESAI',
    kasir: input.kasir,
  };

  // 3. Catat pemasukan otomatis dari penjualan
  const pemasukanBaru: Pemasukan = {
    id: buatId('msk'),
    tanggal: tanggalWib,
    waktu: waktuIso,
    jumlah: total,
    sumber: 'PENJUALAN',
    keterangan: `Penjualan ${nomor}${input.catatan.trim() ? ` (${input.catatan.trim()})` : ''}`,
    metode: input.metode,
    status: 'AKTIF',
    transaksi_id: trxId,
    dicatat_oleh: input.kasir,
  };

  const dataBaru: AppData = {
    ...data,
    barang: barangBaru,
    transaksi: [transaksiBaru, ...data.transaksi],
    pemasukan: [pemasukanBaru, ...data.pemasukan],
    pergerakan_stok: [...pergerakanBaru, ...data.pergerakan_stok],
  };

  return { dataBaru, hasil: transaksiBaru };
}

/**
 * Membatalkan (void) transaksi oleh Pemilik secara atomik:
 * 1. Tandai transaksi sebagai DIBATALKAN beserta alasan wajib
 * 2. Kembalikan stok barang yang melacak stok + catat pergerakan stok (PEMBATALAN)
 * 3. Tandai pemasukan terkait sebagai DIBATALKAN (koreksi pemasukan)
 */
export function batalkanTransaksiAtomik(
  data: AppData,
  transaksiId: string,
  alasan: string,
  oleh: string
): HasilOperasi<Transaksi> {
  const alasanBersih = alasan.trim();
  if (!alasanBersih) {
    throw new Error('Alasan pembatalan wajib diisi.');
  }

  const target = data.transaksi.find((t) => t.id === transaksiId);
  if (!target) {
    throw new Error('Transaksi tidak ditemukan.');
  }
  if (target.status === 'DIBATALKAN') {
    throw new Error('Transaksi ini sudah dibatalkan sebelumnya.');
  }

  const waktuIso = new Date().toISOString();
  const pergerakanKembali: PergerakanStok[] = [];

  // Kembalikan stok untuk setiap item yang melacak stok
  const barangBaru = data.barang.map((b) => {
    const itemBatal = target.item.find((it) => it.barang_id === b.id);
    if (!itemBatal || !b.lacak_stok) return b;

    const stokSebelum = b.stok;
    const stokSesudah = stokSebelum + itemBatal.jumlah;

    pergerakanKembali.push({
      id: buatId('stk'),
      barang_id: b.id,
      nama_barang: b.nama,
      tanggal_waktu: waktuIso,
      jenis: 'PEMBATALAN',
      jumlah: itemBatal.jumlah,
      stok_sebelum: stokSebelum,
      stok_sesudah: stokSesudah,
      keterangan: `Pembatalan ${target.nomor}: ${alasanBersih}`,
      oleh,
    });

    return {
      ...b,
      stok: stokSesudah,
    };
  });

  const transaksiDiperbarui: Transaksi = {
    ...target,
    status: 'DIBATALKAN',
    alasan_batal: alasanBersih,
    dibatalkan_oleh: oleh,
    dibatalkan_pada: waktuIso,
  };

  const transaksiBaru = data.transaksi.map((t) =>
    t.id === transaksiId ? transaksiDiperbarui : t
  );

  // Koreksi pemasukan yang terhubung dengan transaksi ini
  const pemasukanBaru = data.pemasukan.map((p) =>
    p.transaksi_id === transaksiId
      ? {
          ...p,
          status: 'DIBATALKAN' as const,
          keterangan: `${p.keterangan} [DIBATALKAN: ${alasanBersih}]`,
        }
      : p
  );

  return {
    dataBaru: {
      ...data,
      barang: barangBaru,
      transaksi: transaksiBaru,
      pemasukan: pemasukanBaru,
      pergerakan_stok: [...pergerakanKembali, ...data.pergerakan_stok],
    },
    hasil: transaksiDiperbarui,
  };
}

export interface InputCatatPengeluaran {
  tanggal: string;
  jumlah: number;
  kategori: KategoriPengeluaran;
  keterangan: string;
  dicatat_oleh: string;
  foto_nota?: string;
  terkait_stok?: ItemBelanjaStok[];
}

/**
 * Mencatat pengeluaran dan (bila kategori Belanja Barang/Stok) menambah stok sekaligus memperbarui harga beli barang.
 */
export function catatPengeluaranAtomik(
  data: AppData,
  input: InputCatatPengeluaran
): HasilOperasi<Pengeluaran> {
  if (!Number.isFinite(input.jumlah) || input.jumlah <= 0) {
    throw new Error('Jumlah pengeluaran harus lebih dari Rp 0.');
  }
  if (!input.keterangan.trim()) {
    throw new Error('Keterangan pengeluaran wajib diisi.');
  }

  const waktuIso = new Date().toISOString();
  const pergerakanBaru: PergerakanStok[] = [];
  let barangBaru = [...data.barang];

  if (input.terkait_stok && input.terkait_stok.length > 0) {
    for (const itemStok of input.terkait_stok) {
      if (itemStok.jumlah_masuk <= 0) continue;

      barangBaru = barangBaru.map((b) => {
        if (b.id !== itemStok.barang_id) return b;
        const stokSebelum = b.stok;
        const stokSesudah = stokSebelum + itemStok.jumlah_masuk;

        pergerakanBaru.push({
          id: buatId('stk'),
          barang_id: b.id,
          nama_barang: b.nama,
          tanggal_waktu: waktuIso,
          jenis: 'MASUK',
          jumlah: itemStok.jumlah_masuk,
          stok_sebelum: stokSebelum,
          stok_sesudah: stokSesudah,
          keterangan: `Belanja stok: ${input.keterangan.trim()}`,
          oleh: input.dicatat_oleh,
        });

        return {
          ...b,
          stok: stokSesudah,
          harga_beli:
            itemStok.harga_beli_satuan >= 0 ? itemStok.harga_beli_satuan : b.harga_beli,
        };
      });
    }
  }

  const pengeluaranBaru: Pengeluaran = {
    id: buatId('klr'),
    tanggal: input.tanggal || getTanggalWIB(),
    waktu: waktuIso,
    jumlah: Math.round(input.jumlah),
    kategori: input.kategori,
    keterangan: input.keterangan.trim(),
    foto_nota: input.foto_nota,
    dicatat_oleh: input.dicatat_oleh,
    terkait_stok: input.terkait_stok && input.terkait_stok.length > 0 ? input.terkait_stok : undefined,
  };

  return {
    dataBaru: {
      ...data,
      barang: barangBaru,
      pengeluaran: [pengeluaranBaru, ...data.pengeluaran],
      pergerakan_stok: [...pergerakanBaru, ...data.pergerakan_stok],
    },
    hasil: pengeluaranBaru,
  };
}

/**
 * Menghapus pengeluaran (dan bila terkait stok, mengembalikan stok secara konsisten)
 */
export function hapusPengeluaranAtomik(
  data: AppData,
  pengeluaranId: string,
  oleh: string
): AppData {
  const target = data.pengeluaran.find((p) => p.id === pengeluaranId);
  if (!target) return data;

  const waktuIso = new Date().toISOString();
  const pergerakanKoreksi: PergerakanStok[] = [];
  let barangBaru = [...data.barang];

  if (target.terkait_stok && target.terkait_stok.length > 0) {
    for (const itemStok of target.terkait_stok) {
      barangBaru = barangBaru.map((b) => {
        if (b.id !== itemStok.barang_id) return b;
        const stokSebelum = b.stok;
        const stokSesudah = Math.max(0, stokSebelum - itemStok.jumlah_masuk);
        pergerakanKoreksi.push({
          id: buatId('stk'),
          barang_id: b.id,
          nama_barang: b.nama,
          tanggal_waktu: waktuIso,
          jenis: 'PENYESUAIAN',
          jumlah: stokSesudah - stokSebelum,
          stok_sebelum: stokSebelum,
          stok_sesudah: stokSesudah,
          keterangan: `Hapus catatan belanja: ${target.keterangan}`,
          oleh,
        });
        return { ...b, stok: stokSesudah };
      });
    }
  }

  return {
    ...data,
    barang: barangBaru,
    pengeluaran: data.pengeluaran.filter((p) => p.id !== pengeluaranId),
    pergerakan_stok: [...pergerakanKoreksi, ...data.pergerakan_stok],
  };
}

/**
 * Tambah stok masuk langsung atau penyesuaian stok (stok opname)
 */
export function ubahStokAtomik(
  data: AppData,
  params: {
    barang_id: string;
    mode: 'MASUK' | 'OPNAME';
    nilai: number; // jumlah masuk untuk MASUK, atau jumlah stok fisik baru untuk OPNAME
    harga_beli_baru?: number;
    keterangan: string;
    oleh: string;
  }
): HasilOperasi<Barang> {
  const barang = data.barang.find((b) => b.id === params.barang_id);
  if (!barang) {
    throw new Error('Barang tidak ditemukan.');
  }
  if (!barang.lacak_stok) {
    throw new Error(`Barang "${barang.nama}" menggunakan mode Tidak Lacak Stok.`);
  }

  const nilai = Math.round(params.nilai);
  if (params.mode === 'MASUK' && nilai <= 0) {
    throw new Error('Jumlah stok masuk harus lebih dari 0.');
  }
  if (params.mode === 'OPNAME' && nilai < 0) {
    throw new Error('Stok fisik tidak boleh kurang dari 0.');
  }
  if (!params.keterangan.trim()) {
    throw new Error('Keterangan / alasan wajib diisi.');
  }

  const stokSebelum = barang.stok;
  const stokSesudah = params.mode === 'MASUK' ? stokSebelum + nilai : nilai;
  const selisih = stokSesudah - stokSebelum;
  const waktuIso = new Date().toISOString();

  const barangDiperbarui: Barang = {
    ...barang,
    stok: stokSesudah,
    harga_beli:
      params.mode === 'MASUK' &&
      params.harga_beli_baru !== undefined &&
      params.harga_beli_baru >= 0
        ? params.harga_beli_baru
        : barang.harga_beli,
  };

  const pergerakan: PergerakanStok = {
    id: buatId('stk'),
    barang_id: barang.id,
    nama_barang: barang.nama,
    tanggal_waktu: waktuIso,
    jenis: params.mode === 'MASUK' ? 'MASUK' : 'PENYESUAIAN',
    jumlah: selisih,
    stok_sebelum: stokSebelum,
    stok_sesudah: stokSesudah,
    keterangan: params.keterangan.trim(),
    oleh: params.oleh,
  };

  return {
    dataBaru: {
      ...data,
      barang: data.barang.map((b) => (b.id === barang.id ? barangDiperbarui : b)),
      pergerakan_stok: [pergerakan, ...data.pergerakan_stok],
    },
    hasil: barangDiperbarui,
  };
}

/**
 * Menghitung ringkasan keuangan untuk rentang tanggal YYYY-MM-DD (inklusif)
 */
export function hitungRingkasanPeriode(data: AppData, tglMulai: string, tglSelesai: string) {
  const transaksiPeriode = data.transaksi.filter((t) => {
    const tgl = isoKeTanggalWIB(t.tanggal_waktu);
    return tgl >= tglMulai && tgl <= tglSelesai;
  });

  const transaksiSelesai = transaksiPeriode.filter((t) => t.status === 'SELESAI');
  const transaksiBatal = transaksiPeriode.filter((t) => t.status === 'DIBATALKAN');

  const pemasukanAktif = data.pemasukan.filter(
    (p) => p.status === 'AKTIF' && p.tanggal >= tglMulai && p.tanggal <= tglSelesai
  );

  const pengeluaranPeriode = data.pengeluaran.filter(
    (k) => k.tanggal >= tglMulai && k.tanggal <= tglSelesai
  );

  const totalPenjualan = transaksiSelesai.reduce((acc, t) => acc + t.total, 0);
  const jumlahTransaksi = transaksiSelesai.length;
  const rataTransaksi = jumlahTransaksi > 0 ? Math.round(totalPenjualan / jumlahTransaksi) : 0;

  const totalPemasukan = pemasukanAktif.reduce((acc, p) => acc + p.jumlah, 0);
  const pemasukanTunai = pemasukanAktif
    .filter((p) => p.metode === 'TUNAI')
    .reduce((acc, p) => acc + p.jumlah, 0);
  const pemasukanQris = pemasukanAktif
    .filter((p) => p.metode === 'QRIS')
    .reduce((acc, p) => acc + p.jumlah, 0);

  const totalPengeluaran = pengeluaranPeriode.reduce((acc, k) => acc + k.jumlah, 0);
  const labaKasar = totalPemasukan - totalPengeluaran;

  return {
    transaksiPeriode,
    transaksiSelesai,
    transaksiBatal,
    pemasukanAktif,
    pengeluaranPeriode,
    totalPenjualan,
    jumlahTransaksi,
    rataTransaksi,
    totalPemasukan,
    pemasukanTunai,
    pemasukanQris,
    totalPengeluaran,
    labaKasar,
  };
}
