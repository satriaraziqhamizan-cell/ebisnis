import React, { useMemo } from 'react';
import {
  ShoppingBag,
  Receipt,
  ArrowDownCircle,
  ArrowUpCircle,
  AlertTriangle,
  PlusCircle,
  TrendingUp,
  PackagePlus,
  HardDriveDownload,
  ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { AppData, HalamanAktif, PeranPengguna } from '../types/pos';
import { formatRupiah, formatTanggalIndo, geserTanggal, getTanggalWIB, isoKeTanggalWIB } from '../utils/format';
import { hitungRingkasanPeriode } from '../services/posEngine';

interface DashboardPageProps {
  data: AppData;
  peranAktif: PeranPengguna;
  onPindahHalaman: (halaman: HalamanAktif) => void;
  onBukaPengeluaranBaru: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  data,
  peranAktif,
  onPindahHalaman,
  onBukaPengeluaranBaru,
}) => {
  const hariIni = getTanggalWIB();
  const tujuhHariLalu = geserTanggal(hariIni, -6);

  const ringkasanHariIni = useMemo(
    () => hitungRingkasanPeriode(data, hariIni, hariIni),
    [data, hariIni]
  );

  // Barang dengan stok menipis atau habis
  const stokMenipis = useMemo(() => {
    return data.barang
      .filter((b) => b.aktif && b.lacak_stok && b.stok <= b.stok_minimum)
      .sort((a, b) => a.stok - b.stok);
  }, [data.barang]);

  // 5 barang terlaris minggu ini (7 hari terakhir)
  const terlarisMingguIni = useMemo(() => {
    const peta = new Map<string, { nama: string; satuan: string; jumlah: number; omzet: number }>();
    for (const trx of data.transaksi) {
      if (trx.status !== 'SELESAI') continue;
      const tgl = isoKeTanggalWIB(trx.tanggal_waktu);
      if (tgl < tujuhHariLalu || tgl > hariIni) continue;
      for (const it of trx.item) {
        const prev = peta.get(it.barang_id);
        if (prev) {
          prev.jumlah += it.jumlah;
          prev.omzet += it.subtotal;
        } else {
          peta.set(it.barang_id, {
            nama: it.nama,
            satuan: it.satuan,
            jumlah: it.jumlah,
            omzet: it.subtotal,
          });
        }
      }
    }
    return Array.from(peta.values())
      .sort((a, b) => b.jumlah - a.jumlah)
      .slice(0, 5);
  }, [data.transaksi, tujuhHariLalu, hariIni]);

  // Grafik batang pemasukan 7 hari terakhir
  const dataGrafik7Hari = useMemo(() => {
    const hasil: Array<{ label: string; tanggal: string; pemasukan: number }> = [];
    for (let i = -6; i <= 0; i++) {
      const tgl = geserTanggal(hariIni, i);
      const totalHari = data.pemasukan
        .filter((p) => p.status === 'AKTIF' && p.tanggal === tgl)
        .reduce((acc, p) => acc + p.jumlah, 0);
      const parts = tgl.split('-');
      hasil.push({
        label: `${parts[2]}/${parts[1]}`,
        tanggal: formatTanggalIndo(tgl),
        pemasukan: totalHari,
      });
    }
    return hasil;
  }, [data.pemasukan, hariIni]);

  // Pengingat backup > 7 hari
  const butuhBackup = useMemo(() => {
    if (!data.pengaturan.tanggal_backup_terakhir) return true;
    const terakhir = new Date(data.pengaturan.tanggal_backup_terakhir).getTime();
    const selisihHari = (Date.now() - terakhir) / (1000 * 60 * 60 * 24);
    return selisihHari >= 7;
  }, [data.pengaturan.tanggal_backup_terakhir]);

  return (
    <div className="space-y-6">
      {/* Header Selamat Datang */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Dashboard Hari Ini
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-400 mt-0.5">
            {formatTanggalIndo(hariIni)} · Zona WIB
          </p>
        </div>

        {data.pengaturan.adalah_data_contoh && (
          <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 px-3.5 py-2 text-sm text-amber-900 dark:text-amber-200">
            Menampilkan <strong>Data Contoh Demo</strong> · Bisa dihapus di Pengaturan
          </div>
        )}
      </div>

      {/* Pengingat Backup untuk Pemilik */}
      {peranAktif === 'pemilik' && butuhBackup && (
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <HardDriveDownload className="w-6 h-6 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                Cadangkan Data Toko Secara Rutin
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">
                Data tersimpan di perangkat ini.{' '}
                {data.pengaturan.tanggal_backup_terakhir
                  ? `Backup terakhir: ${formatTanggalIndo(data.pengaturan.tanggal_backup_terakhir)}.`
                  : 'Anda belum pernah mencadangkan data.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onPindahHalaman('pengaturan')}
            className="min-h-[48px] px-4 py-2.5 rounded-xl bg-emerald-700 text-white text-base font-semibold hover:bg-emerald-800 shrink-0 whitespace-nowrap"
          >
            Cadangkan Sekarang
          </button>
        </div>
      )}

      {/* Tombol Pintas Besar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {peranAktif !== 'pengadaan' && (
          <button
            type="button"
            onClick={() => onPindahHalaman('kasir')}
            className="min-h-[56px] flex items-center justify-center gap-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-3.5 text-base font-bold shadow-sm active:scale-[0.99] transition"
          >
            <ShoppingBag className="w-5 h-5 shrink-0" />
            <span>Transaksi Baru</span>
          </button>
        )}
        <button
          type="button"
          onClick={onBukaPengeluaranBaru}
          className="min-h-[56px] flex items-center justify-center gap-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 px-5 py-3.5 text-base font-bold active:scale-[0.99] transition"
        >
          <PlusCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>Catat Pengeluaran</span>
        </button>
        <button
          type="button"
          onClick={() => onPindahHalaman('stok')}
          className="min-h-[56px] flex items-center justify-center gap-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 px-5 py-3.5 text-base font-bold active:scale-[0.99] transition"
        >
          <PackagePlus className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0" />
          <span>Tambah Stok</span>
        </button>
      </div>

      {/* Ringkasan Keuangan Hari Ini */}
      {peranAktif !== 'pengadaan' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-sm font-medium">
              <span>Penjualan Hari Ini</span>
              <Receipt className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            </div>
            <p className="mt-2 text-2xl font-bold font-mono-num text-slate-900 dark:text-slate-100">
              {formatRupiah(ringkasanHariIni.totalPenjualan)}
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 tabular-nums">
              {ringkasanHariIni.jumlahTransaksi} transaksi selesai
            </p>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-sm font-medium">
              <span>Total Pemasukan</span>
              <ArrowDownCircle className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            </div>
            <p className="mt-2 text-2xl font-bold font-mono-num text-emerald-700 dark:text-emerald-400">
              {formatRupiah(ringkasanHariIni.totalPemasukan)}
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 font-mono-num">
              Tunai {formatRupiah(ringkasanHariIni.pemasukanTunai)} · QRIS{' '}
              {formatRupiah(ringkasanHariIni.pemasukanQris)}
            </p>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-sm font-medium">
              <span>Pengeluaran Hari Ini</span>
              <ArrowUpCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            </div>
            <p className="mt-2 text-2xl font-bold font-mono-num text-rose-700 dark:text-rose-400">
              {formatRupiah(ringkasanHariIni.totalPengeluaran)}
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 tabular-nums">
              {ringkasanHariIni.pengeluaranPeriode.length} catatan pengeluaran
            </p>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-sm font-medium">
              <span>Laba Kasar Sederhana</span>
              <TrendingUp className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            </div>
            <p
              className={`mt-2 text-2xl font-bold font-mono-num ${
                ringkasanHariIni.labaKasar >= 0
                  ? 'text-slate-900 dark:text-slate-100'
                  : 'text-rose-700 dark:text-rose-400'
              }`}
            >
              {formatRupiah(ringkasanHariIni.labaKasar)}
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Pemasukan dikurangi pengeluaran
            </p>
          </div>
        </div>
      ) : (
        /* Ringkasan Khusus Pengadaan (Satri) */
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Barang Perlu Belanja
            </p>
            <p className="mt-2 text-2xl font-bold font-mono-num text-amber-700 dark:text-amber-400">
              {stokMenipis.length} barang
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Stok di bawah batas minimum
            </p>
          </div>
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Total Barang Aktif
            </p>
            <p className="mt-2 text-2xl font-bold font-mono-num text-slate-900 dark:text-slate-100">
              {data.barang.filter((b) => b.aktif).length} jenis
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Terdaftar di katalog toko
            </p>
          </div>
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Belanja Hari Ini
            </p>
            <p className="mt-2 text-2xl font-bold font-mono-num text-slate-900 dark:text-slate-100">
              {formatRupiah(ringkasanHariIni.totalPengeluaran)}
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Total pengeluaran tercatat
            </p>
          </div>
        </div>
      )}

      {/* Grafik 7 Hari & Peringatan Stok Menipis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {peranAktif !== 'pengadaan' && (
          <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Pemasukan 7 Hari Terakhir
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Gabungan penjualan Tunai, QRIS, dan pemasukan manual
                </p>
              </div>
            </div>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataGrafik7Hari} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => `${Math.round(Number(v) / 1000)}rb`}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    width={46}
                  />
                  <Tooltip
                    formatter={(val) => [formatRupiah(Number(val)), 'Pemasukan']}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.tanggal || ''}
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                    }}
                  />
                  <Bar dataKey="pemasukan" fill="#15803d" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Daftar Peringatan Stok Menipis */}
        <div
          className={`${
            peranAktif !== 'pengadaan' ? 'lg:col-span-5' : 'lg:col-span-7'
          } rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex flex-col`}
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Stok Menipis ({stokMenipis.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onPindahHalaman('stok')}
              className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 min-h-[44px] px-2"
            >
              <span>Kelola Stok</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {stokMenipis.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8 text-center text-slate-500 dark:text-slate-400">
              <p className="text-base font-medium">Semua stok barang masih aman.</p>
              <p className="text-sm mt-1">Tidak ada barang di bawah batas minimum.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {stokMenipis.slice(0, 6).map((b) => (
                <div
                  key={b.id}
                  className="py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {b.nama}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {b.kategori} · Batas min: <span className="font-mono-num">{b.stok_minimum}</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={`text-base font-bold font-mono-num ${
                        b.stok === 0
                          ? 'text-rose-700 dark:text-rose-400'
                          : 'text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {b.stok === 0 ? 'Habis (0)' : `${b.stok} ${b.satuan}`}
                    </p>
                  </div>
                </div>
              ))}
              {stokMenipis.length > 6 && (
                <p className="pt-3 text-sm text-slate-500 dark:text-slate-400">
                  Dan {stokMenipis.length - 6} barang lainnya di halaman Stok Barang.
                </p>
              )}
            </div>
          )}
        </div>

        {/* 5 Barang Terlaris Minggu Ini */}
        <div
          className={`${
            peranAktif !== 'pengadaan' ? 'lg:col-span-12' : 'lg:col-span-5'
          } rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5`}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              5 Barang Terlaris Minggu Ini
            </h2>
            {peranAktif === 'pemilik' && (
              <button
                type="button"
                onClick={() => onPindahHalaman('laporan')}
                className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:underline min-h-[44px] px-2"
              >
                Lihat Laporan Lengkap
              </button>
            )}
          </div>

          {terlarisMingguIni.length === 0 ? (
            <p className="py-6 text-center text-base text-slate-500 dark:text-slate-400">
              Belum ada transaksi penjualan minggu ini.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {terlarisMingguIni.map((item, idx) => (
                <div
                  key={item.nama}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5"
                >
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Peringkat {idx + 1}
                  </p>
                  <p className="mt-1 text-base font-bold text-slate-900 dark:text-slate-100 line-clamp-2">
                    {item.nama}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400 font-mono-num">
                    Terjual {item.jumlah} {item.satuan}
                  </p>
                  {peranAktif !== 'pengadaan' && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 font-mono-num">
                      Omzet {formatRupiah(item.omzet)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
