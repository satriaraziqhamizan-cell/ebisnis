export type PeranPengguna = 'pemilik' | 'kasir' | 'pengadaan';

export interface ProfilPengguna {
  id: PeranPengguna;
  nama: string;
  jabatan: string;
  deskripsi: string;
}

export const DAFTAR_PROFIL: ProfilPengguna[] = [
  {
    id: 'pemilik',
    nama: 'Nek Upik',
    jabatan: 'Pemilik Toko',
    deskripsi: 'Akses penuh: dashboard, laporan, pembatalan transaksi, dan pengaturan.',
  },
  {
    id: 'kasir',
    nama: 'Tante Meli',
    jabatan: 'Kasir & Operasional',
    deskripsi: 'Melayani penjualan, cek barang/stok, QRIS, dan catat pengeluaran harian.',
  },
  {
    id: 'pengadaan',
    nama: 'Satria',
    jabatan: 'Pengadaan & Stok',
    deskripsi: 'Kelola data barang, tambah stok masuk, stok opname, dan belanja pemasok.',
  },
];

export const KATEGORI_BARANG = [
  'Makanan Berat',
  'Jajanan & Makanan Ringan',
  'Minuman Kemasan',
  'Sayur & Bahan Makanan',
  'Kebutuhan Rumah Tangga',
  'Kebutuhan Harian Lain',
] as const;

export type KategoriBarang = (typeof KATEGORI_BARANG)[number] | string;

export const SATUAN_BARANG = [
  'pcs',
  'bungkus',
  'botol',
  'porsi',
  'galon',
  'kg',
  'ikat',
  'ons',
  'butir',
  'sachet',
  'liter',
] as const;

export const KATEGORI_PENGELUARAN = [
  'Belanja Barang/Stok',
  'Gas/Listrik/Air',
  'Bahan Gado-gado',
  'Kemasan',
  'Transportasi',
  'Gaji/Bantuan',
  'Lainnya',
] as const;

export type KategoriPengeluaran = (typeof KATEGORI_PENGELUARAN)[number];

export type MetodeBayar = 'TUNAI' | 'QRIS';
export type StatusTransaksi = 'SELESAI' | 'DIBATALKAN';
export type SumberPemasukan = 'PENJUALAN' | 'MANUAL';
export type JenisPergerakanStok = 'MASUK' | 'KELUAR' | 'PENYESUAIAN' | 'PEMBATALAN';

export interface Barang {
  id: string;
  nama: string;
  kategori: string;
  harga_jual: number;
  harga_beli: number;
  stok: number;
  satuan: string;
  stok_minimum: number;
  lacak_stok: boolean;
  aktif: boolean;
  foto?: string;
  dibuat_pada: string;
}

export interface ItemTransaksi {
  barang_id: string;
  nama: string;
  harga: number;
  satuan: string;
  jumlah: number;
  subtotal: number;
}

export interface Transaksi {
  id: string;
  nomor: string;
  tanggal_waktu: string; // ISO string
  item: ItemTransaksi[];
  subtotal: number;
  diskon: number;
  total: number;
  metode: MetodeBayar;
  uang_diterima: number;
  kembalian: number;
  catatan: string;
  status: StatusTransaksi;
  alasan_batal?: string;
  dibatalkan_oleh?: string;
  dibatalkan_pada?: string;
  kasir: string;
}

export interface Pemasukan {
  id: string;
  tanggal: string; // YYYY-MM-DD (WIB)
  waktu: string; // ISO string
  jumlah: number;
  sumber: SumberPemasukan;
  keterangan: string;
  metode: MetodeBayar;
  status: 'AKTIF' | 'DIBATALKAN';
  transaksi_id?: string;
  dicatat_oleh: string;
}

export interface ItemBelanjaStok {
  barang_id: string;
  nama_barang: string;
  jumlah_masuk: number;
  harga_beli_satuan: number;
  satuan: string;
}

export interface Pengeluaran {
  id: string;
  tanggal: string; // YYYY-MM-DD (WIB)
  waktu: string; // ISO string
  jumlah: number;
  kategori: KategoriPengeluaran;
  keterangan: string;
  foto_nota?: string;
  dicatat_oleh: string;
  terkait_stok?: ItemBelanjaStok[];
  riwayat_ubah?: string[];
}

export interface PergerakanStok {
  id: string;
  barang_id: string;
  nama_barang: string;
  tanggal_waktu: string; // ISO string
  jenis: JenisPergerakanStok;
  jumlah: number; // positif untuk masuk/batal, negatif untuk keluar, atau selisih opname
  stok_sebelum: number;
  stok_sesudah: number;
  keterangan: string;
  oleh: string;
}

export interface KeranjangTersimpan {
  id: string;
  label: string;
  waktu_simpan: string;
  item: ItemTransaksi[];
  diskon: number;
  catatan: string;
}

export interface Pengaturan {
  profil_usaha: {
    nama_toko: string;
    alamat: string;
    telepon: string;
    pesan_struk: string;
  };
  gambar_qris: string;
  nama_merchant_qris: string;
  pin_pengguna: Record<PeranPengguna, string>;
  ukuran_huruf: 'normal' | 'besar';
  mode_gelap: boolean;
  tanggal_backup_terakhir?: string;
  adalah_data_contoh: boolean;
}

export interface AppData {
  barang: Barang[];
  transaksi: Transaksi[];
  pemasukan: Pemasukan[];
  pengeluaran: Pengeluaran[];
  pergerakan_stok: PergerakanStok[];
  keranjang_tersimpan: KeranjangTersimpan[];
  pengaturan: Pengaturan;
}

export type HalamanAktif =
  | 'dashboard'
  | 'kasir'
  | 'barang'
  | 'stok'
  | 'keuangan'
  | 'laporan'
  | 'qris'
  | 'pengaturan'
  | 'panduan'
  | 'tentang'
  | 'lainnya';
