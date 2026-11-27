import React from 'react';
import {
  LayoutDashboard,
  Boxes,
  QrCode,
  Settings,
  BookOpen,
  Info,
  UserCog,
  ChevronRight,
} from 'lucide-react';
import { DAFTAR_PROFIL, HalamanAktif, PeranPengguna } from '../types/pos';
import { PWAInstallButton } from '../components/PWAControls';

interface LainnyaPageProps {
  peranAktif: PeranPengguna;
  onPindahHalaman: (halaman: HalamanAktif) => void;
  onGantiProfil: () => void;
}

export const LainnyaPage: React.FC<LainnyaPageProps> = ({
  peranAktif,
  onPindahHalaman,
  onGantiProfil,
}) => {
  const profil = DAFTAR_PROFIL.find((p) => p.id === peranAktif);

  const daftarMenu: Array<{
    id: HalamanAktif;
    judul: string;
    ket: string;
    ikon: React.FC<{ className?: string }>;
    tampil: boolean;
  }> = [
    {
      id: 'dashboard',
      judul: 'Dashboard Hari Ini',
      ket: 'Ringkasan penjualan, stok menipis, dan pintasan cepat',
      ikon: LayoutDashboard,
      tampil: true,
    },
    {
      id: 'stok',
      judul: 'Stok Barang & Perlu Belanja',
      ket: 'Tambah stok masuk, opname, dan kirim daftar belanja WA',
      ikon: Boxes,
      tampil: true,
    },
    {
      id: 'qris',
      judul: 'QRIS Toko',
      ket: 'Tampilkan QRIS layar penuh dan lihat total transaksi QRIS',
      ikon: QrCode,
      tampil: peranAktif !== 'pengadaan',
    },
    {
      id: 'pengaturan',
      judul: 'Pengaturan & Cadangkan Data',
      ket: 'Ukuran huruf, mode gelap, backup JSON, profil toko & PIN',
      ikon: Settings,
      tampil: true,
    },
    {
      id: 'panduan',
      judul: 'Panduan Singkat (5 Langkah)',
      ket: 'Cara mudah memakai aplikasi kasir untuk sehari-hari',
      ikon: BookOpen,
      tampil: true,
    },
    {
      id: 'tentang',
      judul: 'Tentang Aplikasi',
      ket: 'Daftar fitur dan informasi penyimpanan perangkat',
      ikon: Info,
      tampil: true,
    },
  ];

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Menu Lainnya
        </h1>
        <p className="text-base text-slate-600 dark:text-slate-400">
          Akses stok, QRIS, pengaturan, panduan, dan ganti pengguna
        </p>
      </div>

      {/* Kartu Pengguna Aktif */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Sedang bertugas:</p>
          <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {profil?.nama} · <span className="text-emerald-700 dark:text-emerald-400">{profil?.jabatan}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onGantiProfil}
          className="min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-base font-semibold flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0"
        >
          <UserCog className="w-5 h-5" />
          <span>Ganti</span>
        </button>
      </div>

      <PWAInstallButton penuh />

      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
        {daftarMenu
          .filter((m) => m.tampil)
          .map((m) => {
            const Ikon = m.ikon;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onPindahHalaman(m.id)}
                className="w-full text-left p-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition min-h-[68px]"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Ikon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {m.judul}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                      {m.ket}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
              </button>
            );
          })}
      </div>
    </div>
  );
};

export const PanduanPage: React.FC = () => {
  const langkah = [
    {
      nomor: '1',
      judul: 'Catat Penjualan di Menu Kasir',
      isi: 'Buka menu Kasir, ketuk barang yang dibeli pelanggan, lalu pilih Tunai atau QRIS. Untuk Tunai, ketuk "Uang Pas" atau nominal uang, lalu tekan Selesaikan Transaksi.',
    },
    {
      nomor: '2',
      judul: 'Periksa Pembayaran QRIS',
      isi: 'Jika pelanggan membayar lewat QRIS, tunjukkan gambar QRIS di layar. Pastikan notifikasi uang masuk sudah muncul di HP pengelola sebelum menekan "Pembayaran Sudah Diterima".',
    },
    {
      nomor: '3',
      judul: 'Catat Pengeluaran & Belanja Stok',
      isi: 'Buka menu Keuangan lalu tab Pengeluaran. Jika belanja kulakan barang untuk toko, pilih kategori "Belanja Barang/Stok" agar stok barang ikut bertambah otomatis.',
    },
    {
      nomor: '4',
      judul: 'Pantau Barang Hampir Habis',
      isi: 'Di Dashboard atau menu Stok Barang, lihat daftar "Stok Menipis". Gunakan tombol "Kirim ke WhatsApp" di tab Perlu Belanja untuk mengirim daftar belanja ke Satria.',
    },
    {
      nomor: '5',
      judul: 'Cadangkan Data Setiap Minggu',
      isi: 'Karena semua catatan tersimpan di HP ini agar bisa dipakai tanpa internet, buka menu Pengaturan seminggu sekali dan tekan "Cadangkan Data (JSON)" untuk menyimpan salinan file.',
    },
  ];

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Panduan Singkat
        </h1>
        <p className="text-base text-slate-600 dark:text-slate-400">
          5 langkah mudah memakai Aplikasi Kasir Nek Upik
        </p>
      </div>

      <div className="space-y-3">
        {langkah.map((l) => (
          <div
            key={l.nomor}
            className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex items-start gap-4"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white font-bold text-lg flex items-center justify-center shrink-0 font-mono-num">
              {l.nomor}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {l.judul}
              </h2>
              <p className="mt-1.5 text-base text-slate-700 dark:text-slate-300 leading-relaxed">
                {l.isi}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const TentangPage: React.FC = () => {
  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Tentang Aplikasi
        </h1>
        <p className="text-base text-slate-600 dark:text-slate-400">
          Kasir Digital Toko Kelontong Nek Upik · Versi 1.0
        </p>
      </div>

      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4 text-base text-slate-700 dark:text-slate-300 leading-relaxed">
        <p>
          Aplikasi ini dirancang khusus untuk membantu pencatatan usaha{' '}
          <strong>Toko Kelontong Nek Upik</strong> di Jl. H. Ali Hamzah No. 2, Payo Lebar, Kec.
          Jelutung, Kota Jambi agar lebih rapi, cepat, dan aman dibanding buku tulis manual.
        </p>
        <div>
          <p className="font-bold text-slate-900 dark:text-slate-100 mb-2">
            Fitur Utama yang Tersedia:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Dashboard ringkasan harian, peringatan stok menipis, dan grafik 7 hari.</li>
            <li>Kasir cepat dengan metode Tunai (uang pas & hitung kembalian) dan QRIS.</li>
            <li>Struk digital yang bisa dicetak/disimpan ke PDF maupun dibagikan ke WhatsApp.</li>
            <li>Pencatatan Pemasukan otomatis & manual serta Pengeluaran dengan tambah stok.</li>
            <li>Stok Barang lengkap dengan opname, riwayat pergerakan, dan daftar belanja WA.</li>
            <li>Laporan periode harian, mingguan, bulanan, hingga ekspor CSV & cetak PDF.</li>
            <li>Berjalan offline di HP dan mendukung Backup/Restore file JSON.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
