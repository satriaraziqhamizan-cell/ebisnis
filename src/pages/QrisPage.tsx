import React, { useMemo, useState } from 'react';
import { Maximize2, X, Settings, AlertCircle } from 'lucide-react';
import { AppData, HalamanAktif, PeranPengguna } from '../types/pos';
import { formatRupiah, geserTanggal, getTanggalWIB, isoKeTanggalWIB } from '../utils/format';

interface QrisPageProps {
  data: AppData;
  peranAktif: PeranPengguna;
  onPindahHalaman: (halaman: HalamanAktif) => void;
}

export const QrisPage: React.FC<QrisPageProps> = ({
  data,
  peranAktif,
  onPindahHalaman,
}) => {
  const [layarPenuh, setLayarPenuh] = useState(false);
  const [periode, setPeriode] = useState<'hari_ini' | '7_hari' | 'bulan_ini'>('hari_ini');

  const hariIni = getTanggalWIB();

  const statsQris = useMemo(() => {
    const mulai =
      periode === 'hari_ini'
        ? hariIni
        : periode === '7_hari'
          ? geserTanggal(hariIni, -6)
          : `${hariIni.slice(0, 7)}-01`;

    const trxQris = data.transaksi.filter((t) => {
      if (t.status !== 'SELESAI' || t.metode !== 'QRIS') return false;
      const tgl = isoKeTanggalWIB(t.tanggal_waktu);
      return tgl >= mulai && tgl <= hariIni;
    });

    return {
      jumlah: trxQris.length,
      total: trxQris.reduce((acc, t) => acc + t.total, 0),
    };
  }, [data.transaksi, periode, hariIni]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            QRIS Toko
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-400">
            Tunjukkan kode QRIS ini agar pelanggan mudah memindai
          </p>
        </div>

        {peranAktif === 'pemilik' && (
          <button
            type="button"
            onClick={() => onPindahHalaman('pengaturan')}
            className="min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-base font-semibold flex items-center gap-2"
          >
            <Settings className="w-5 h-5" />
            <span>Ganti Gambar QRIS</span>
          </button>
        )}
      </div>

      {/* Kartu QRIS Besar */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 text-center max-w-md mx-auto">
        <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
          {data.pengaturan.nama_merchant_qris || data.pengaturan.profil_usaha.nama_toko}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {data.pengaturan.profil_usaha.nama_toko}
        </p>

        <div className="my-5 flex justify-center">
          {data.pengaturan.gambar_qris ? (
            <img
              src={data.pengaturan.gambar_qris}
              alt="Kode QRIS Toko"
              className="w-64 h-64 sm:w-72 sm:h-72 object-contain rounded-2xl border border-slate-200 bg-white p-3"
            />
          ) : (
            <div className="w-64 h-64 rounded-2xl border border-dashed border-slate-300 flex items-center justify-center p-4 text-slate-500">
              Belum ada gambar QRIS. Unggah gambar QRIS di menu Pengaturan.
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setLayarPenuh(true)}
          className="w-full min-h-[52px] rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-base font-bold flex items-center justify-center gap-2"
        >
          <Maximize2 className="w-5 h-5" />
          <span>Layar Penuh untuk Pelanggan</span>
        </button>

        <div className="mt-4 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 p-3 text-left flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-900 dark:text-amber-200 leading-snug">
            Aplikasi ini tidak terhubung langsung ke bank. Pastikan notifikasi pembayaran masuk di HP pengelola sebelum menyerahkan barang.
          </p>
        </div>
      </div>

      {/* Statistik Transaksi QRIS */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 max-w-md mx-auto space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold">Statistik Pembayaran QRIS</h2>
        </div>

        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          {(
            [
              ['hari_ini', 'Hari Ini'],
              ['7_hari', '7 Hari'],
              ['bulan_ini', 'Bulan Ini'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setPeriode(id)}
              className={`min-h-[40px] rounded-lg text-sm font-bold ${
                periode === id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5">
            <p className="text-sm text-slate-500">Jumlah Transaksi</p>
            <p className="text-xl font-bold font-mono-num mt-1">{statsQris.jumlah}x</p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5">
            <p className="text-sm text-slate-500">Total Nominal</p>
            <p className="text-xl font-bold font-mono-num text-emerald-700 dark:text-emerald-400 mt-1">
              {formatRupiah(statsQris.total)}
            </p>
          </div>
        </div>
      </div>

      {/* Modal Layar Penuh */}
      {layarPenuh && (
        <div className="fixed inset-0 z-50 bg-white text-slate-900 flex flex-col items-center justify-center p-6">
          <button
            type="button"
            onClick={() => setLayarPenuh(false)}
            className="absolute top-4 right-4 min-h-[48px] px-4 rounded-xl bg-slate-100 text-slate-800 font-bold flex items-center gap-2"
          >
            <X className="w-5 h-5" />
            <span>Tutup</span>
          </button>

          <p className="text-xl font-bold text-center">
            {data.pengaturan.nama_merchant_qris}
          </p>
          <p className="text-base text-slate-600 mt-1 text-center">
            {data.pengaturan.profil_usaha.nama_toko}
          </p>

          {data.pengaturan.gambar_qris && (
            <img
              src={data.pengaturan.gambar_qris}
              alt="QRIS Layar Penuh"
              className="mt-6 w-80 h-80 max-w-[90vw] max-h-[60vh] object-contain border border-slate-200 rounded-2xl p-3"
            />
          )}

          <p className="mt-6 text-base font-medium text-slate-600 text-center">
            Silakan pindai menggunakan aplikasi pembayaran atau mobile banking Anda.
          </p>
        </div>
      )}
    </div>
  );
};
