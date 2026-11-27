import React, { useMemo, useState } from 'react';
import {
  Printer,
  Download,
  Search,
  FileText,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { AppData, Transaksi } from '../types/pos';
import {
  buatCSV,
  formatRupiah,
  formatTanggalIndo,
  formatTanggalJamWIB,
  geserTanggal,
  getTanggalWIB,
  isoKeTanggalWIB,
  unduhFile,
} from '../utils/format';
import { hitungRingkasanPeriode } from '../services/posEngine';

interface LaporanPageProps {
  data: AppData;
  onBukaDetailTransaksi: (trx: Transaksi) => void;
  onToast: (jenis: 'sukses' | 'error' | 'info', pesan: string) => void;
}

type PeriodePreset = 'hari_ini' | 'kemarin' | '7_hari' | 'bulan_ini' | 'bulan_lalu' | 'kustom';

const WARNA_PIE = ['#15803d', '#0284c7'];

export const LaporanPage: React.FC<LaporanPageProps> = ({
  data,
  onBukaDetailTransaksi,
  onToast,
}) => {
  const hariIni = getTanggalWIB();
  const [preset, setPreset] = useState<PeriodePreset>('7_hari');
  const [kustomMulai, setKustomMulai] = useState(geserTanggal(hariIni, -6));
  const [kustomSelesai, setKustomSelesai] = useState(hariIni);
  const [cariTrx, setCariTrx] = useState('');
  const [filterStatusTrx, setFilterStatusTrx] = useState<'Semua' | 'SELESAI' | 'DIBATALKAN'>('Semua');

  const { tglMulai, tglSelesai, labelPeriode } = useMemo(() => {
    const [tahunStr, bulanStr] = hariIni.split('-');
    const tahun = Number(tahunStr);
    const bulan = Number(bulanStr);

    switch (preset) {
      case 'hari_ini':
        return { tglMulai: hariIni, tglSelesai: hariIni, labelPeriode: 'Hari Ini' };
      case 'kemarin': {
        const kmr = geserTanggal(hariIni, -1);
        return { tglMulai: kmr, tglSelesai: kmr, labelPeriode: 'Kemarin' };
      }
      case '7_hari':
        return {
          tglMulai: geserTanggal(hariIni, -6),
          tglSelesai: hariIni,
          labelPeriode: '7 Hari Terakhir',
        };
      case 'bulan_ini': {
        const awal = `${tahunStr}-${bulanStr}-01`;
        return { tglMulai: awal, tglSelesai: hariIni, labelPeriode: 'Bulan Ini' };
      }
      case 'bulan_lalu': {
        const dAwal = new Date(Date.UTC(tahun, bulan - 2, 1));
        const dAkhir = new Date(Date.UTC(tahun, bulan - 1, 0));
        return {
          tglMulai: dAwal.toISOString().slice(0, 10),
          tglSelesai: dAkhir.toISOString().slice(0, 10),
          labelPeriode: 'Bulan Lalu',
        };
      }
      case 'kustom':
        return {
          tglMulai: kustomMulai <= kustomSelesai ? kustomMulai : kustomSelesai,
          tglSelesai: kustomSelesai >= kustomMulai ? kustomSelesai : kustomMulai,
          labelPeriode: 'Periode Kustom',
        };
    }
  }, [preset, hariIni, kustomMulai, kustomSelesai]);

  const ringkasan = useMemo(
    () => hitungRingkasanPeriode(data, tglMulai, tglSelesai),
    [data, tglMulai, tglSelesai]
  );

  // Rincian pengeluaran per kategori
  const pengeluaranPerKategori = useMemo(() => {
    const peta = new Map<string, number>();
    for (const k of ringkasan.pengeluaranPeriode) {
      peta.set(k.kategori, (peta.get(k.kategori) ?? 0) + k.jumlah);
    }
    return Array.from(peta.entries())
      .map(([kategori, total]) => ({ kategori, total }))
      .sort((a, b) => b.total - a.total);
  }, [ringkasan.pengeluaranPeriode]);

  // Tren penjualan harian
  const trenHarian = useMemo(() => {
    const peta = new Map<string, number>();
    for (const trx of ringkasan.transaksiSelesai) {
      const tgl = isoKeTanggalWIB(trx.tanggal_waktu);
      peta.set(tgl, (peta.get(tgl) ?? 0) + trx.total);
    }
    const hasil: Array<{ label: string; tanggal: string; penjualan: number }> = [];
    let kursor = tglMulai;
    let batas = 0;
    while (kursor <= tglSelesai && batas < 45) {
      const parts = kursor.split('-');
      hasil.push({
        label: `${parts[2]}/${parts[1]}`,
        tanggal: formatTanggalIndo(kursor),
        penjualan: peta.get(kursor) ?? 0,
      });
      kursor = geserTanggal(kursor, 1);
      batas++;
    }
    return hasil;
  }, [ringkasan.transaksiSelesai, tglMulai, tglSelesai]);

  // Data Pie Tunai vs QRIS
  const dataMetode = useMemo(
    () =>
      [
        { name: 'Tunai', value: ringkasan.pemasukanTunai },
        { name: 'QRIS', value: ringkasan.pemasukanQris },
      ].filter((d) => d.value > 0),
    [ringkasan.pemasukanTunai, ringkasan.pemasukanQris]
  );

  // Barang Terlaris & Kurang Laku
  const { terlaris, kurangLaku } = useMemo(() => {
    const peta = new Map<string, { id: string; nama: string; satuan: string; terjual: number; omzet: number }>();
    for (const b of data.barang) {
      if (b.aktif) {
        peta.set(b.id, { id: b.id, nama: b.nama, satuan: b.satuan, terjual: 0, omzet: 0 });
      }
    }
    for (const trx of ringkasan.transaksiSelesai) {
      for (const it of trx.item) {
        const cur = peta.get(it.barang_id) ?? {
          id: it.barang_id,
          nama: it.nama,
          satuan: it.satuan,
          terjual: 0,
          omzet: 0,
        };
        cur.terjual += it.jumlah;
        cur.omzet += it.subtotal;
        peta.set(it.barang_id, cur);
      }
    }
    const semua = Array.from(peta.values());
    return {
      terlaris: [...semua]
        .filter((x) => x.terjual > 0)
        .sort((a, b) => b.terjual - a.terjual)
        .slice(0, 10),
      kurangLaku: [...semua]
        .sort((a, b) => a.terjual - b.terjual)
        .slice(0, 5),
    };
  }, [data.barang, ringkasan.transaksiSelesai]);

  // Daftar Riwayat Transaksi terfilter
  const transaksiTampil = useMemo(() => {
    const q = cariTrx.trim().toLowerCase();
    return ringkasan.transaksiPeriode.filter((t) => {
      if (filterStatusTrx !== 'Semua' && t.status !== filterStatusTrx) return false;
      if (
        q &&
        !t.nomor.toLowerCase().includes(q) &&
        !t.catatan.toLowerCase().includes(q) &&
        !t.kasir.toLowerCase().includes(q) &&
        !t.item.some((it) => it.nama.toLowerCase().includes(q))
      ) {
        return false;
      }
      return true;
    });
  }, [ringkasan.transaksiPeriode, cariTrx, filterStatusTrx]);

  const tanganiEksporCSV = () => {
    const headers = [
      'Nomor Transaksi',
      'Waktu WIB',
      'Kasir',
      'Metode',
      'Subtotal',
      'Diskon',
      'Total',
      'Status',
      'Catatan',
      'Alasan Batal',
    ];
    const rows = ringkasan.transaksiPeriode.map((t) => [
      t.nomor,
      formatTanggalJamWIB(t.tanggal_waktu),
      t.kasir,
      t.metode,
      t.subtotal,
      t.diskon,
      t.total,
      t.status,
      t.catatan,
      t.alasan_batal || '',
    ]);
    const csv = buatCSV(headers, rows);
    unduhFile(`laporan-nek-upik-${tglMulai}-sd-${tglSelesai}.csv`, csv, 'text/csv;charset=utf-8');
    onToast('sukses', 'Laporan transaksi berhasil diekspor ke CSV.');
  };

  return (
    <div className="space-y-6">
      {/* Kop Laporan Khusus Cetak PDF */}
      <div className="hidden print-only border-b-2 border-slate-900 pb-3 mb-4">
        <h1 className="text-xl font-bold">{data.pengaturan.profil_usaha.nama_toko}</h1>
        <p className="text-sm">{data.pengaturan.profil_usaha.alamat}</p>
        <p className="text-sm font-semibold mt-1">
          Laporan Keuangan ({labelPeriode}: {formatTanggalIndo(tglMulai)} s.d.{' '}
          {formatTanggalIndo(tglSelesai)})
        </p>
      </div>

      {/* Header & Tombol Ekspor */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Laporan
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-400">
            {formatTanggalIndo(tglMulai)} – {formatTanggalIndo(tglSelesai)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={tanganiEksporCSV}
            className="min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-base font-semibold flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            <span>Ekspor CSV</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-[48px] px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-base font-bold flex items-center gap-2"
          >
            <Printer className="w-5 h-5" />
            <span>Cetak / PDF</span>
          </button>
        </div>
      </div>

      {/* Pilihan Periode */}
      <div className="space-y-3 no-print">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {(
            [
              ['hari_ini', 'Hari ini'],
              ['kemarin', 'Kemarin'],
              ['7_hari', '7 hari'],
              ['bulan_ini', 'Bulan ini'],
              ['bulan_lalu', 'Bulan lalu'],
              ['kustom', 'Pilih Tanggal'],
            ] as Array<[PeriodePreset, string]>
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setPreset(id)}
              className={`min-h-[44px] px-4 rounded-xl text-sm font-bold whitespace-nowrap shrink-0 ${
                preset === id
                  ? 'bg-emerald-700 text-white'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {preset === 'kustom' && (
          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Dari Tanggal</label>
              <input
                type="date"
                value={kustomMulai}
                onChange={(e) => setKustomMulai(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-base"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Sampai Tanggal</label>
              <input
                type="date"
                value={kustomSelesai}
                onChange={(e) => setKustomSelesai(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-base"
              />
            </div>
          </div>
        )}
      </div>

      {/* Kartu Ringkasan Angka */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Penjualan</p>
          <p className="mt-1.5 text-2xl font-bold font-mono-num text-slate-900 dark:text-slate-100">
            {formatRupiah(ringkasan.totalPenjualan)}
          </p>
          <p className="mt-1 text-sm text-slate-500 font-mono-num">
            {ringkasan.jumlahTransaksi} transaksi · Rata-rata {formatRupiah(ringkasan.rataTransaksi)}
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Pemasukan & Metode Bayar
          </p>
          <p className="mt-1.5 text-2xl font-bold font-mono-num text-emerald-700 dark:text-emerald-400">
            {formatRupiah(ringkasan.totalPemasukan)}
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 font-mono-num">
            Tunai {formatRupiah(ringkasan.pemasukanTunai)} · QRIS {formatRupiah(ringkasan.pemasukanQris)}
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Pengeluaran & Selisih (Laba Kasar)
          </p>
          <p className="mt-1.5 text-2xl font-bold font-mono-num text-slate-900 dark:text-slate-100">
            {formatRupiah(ringkasan.labaKasar)}
          </p>
          <p className="mt-1 text-sm text-rose-700 dark:text-rose-400 font-mono-num">
            Pengeluaran: {formatRupiah(ringkasan.totalPengeluaran)}
          </p>
        </div>
      </div>

      {/* Grafik Tren & Tunai vs QRIS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 no-print">
        <div className="lg:col-span-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
          <h2 className="text-lg font-bold mb-3">Tren Penjualan Harian</h2>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trenHarian} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={(v) => `${Math.round(Number(v) / 1000)}rb`}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  width={46}
                />
                <Tooltip
                  formatter={(val) => [formatRupiah(Number(val)), 'Penjualan']}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.tanggal || ''}
                />
                <Bar dataKey="penjualan" fill="#15803d" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
          <h2 className="text-lg font-bold mb-3">Perbandingan Tunai vs QRIS</h2>
          {dataMetode.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-slate-500 text-base">
              Belum ada pemasukan pada periode ini.
            </div>
          ) : (
            <div className="h-56 w-full flex flex-col items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dataMetode}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={4}
                  >
                    {dataMetode.map((_, idx) => (
                      <Cell key={idx} fill={WARNA_PIE[idx % WARNA_PIE.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => formatRupiah(Number(val))} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 text-sm font-semibold">
                <span className="text-emerald-700 dark:text-emerald-400">
                  Tunai: {formatRupiah(ringkasan.pemasukanTunai)}
                </span>
                <span className="text-sky-700 dark:text-sky-400">
                  QRIS: {formatRupiah(ringkasan.pemasukanQris)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pengeluaran per Kategori & Barang Terlaris / Kurang Laku */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
          <h2 className="text-lg font-bold mb-3">Rincian Pengeluaran per Kategori</h2>
          {pengeluaranPerKategori.length === 0 ? (
            <p className="text-base text-slate-500 py-4">Tidak ada pengeluaran pada periode ini.</p>
          ) : (
            <div className="space-y-3">
              {pengeluaranPerKategori.map((item) => {
                const persen =
                  ringkasan.totalPengeluaran > 0
                    ? Math.round((item.total / ringkasan.totalPengeluaran) * 100)
                    : 0;
                return (
                  <div key={item.kategori} className="space-y-1">
                    <div className="flex justify-between text-base">
                      <span className="font-medium">{item.kategori}</span>
                      <span className="font-mono-num font-bold">
                        {formatRupiah(item.total)} ({persen}%)
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-rose-600 rounded-full"
                        style={{ width: `${persen}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-5">
          <div>
            <h2 className="text-lg font-bold mb-2">10 Barang Terlaris</h2>
            {terlaris.length === 0 ? (
              <p className="text-base text-slate-500">Belum ada penjualan pada periode ini.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {terlaris.map((it, idx) => (
                  <div key={it.id} className="py-2 flex justify-between gap-3 text-sm sm:text-base">
                    <span className="truncate">
                      <strong className="font-mono-num">{idx + 1}.</strong> {it.nama}
                    </span>
                    <span className="font-mono-num font-semibold shrink-0">
                      {it.terjual} {it.satuan} · {formatRupiah(it.omzet)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-2">
              Barang Kurang Laku (Terendah)
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {kurangLaku.map((it) => (
                <div key={it.id} className="py-1.5 flex justify-between gap-3 text-sm text-slate-600 dark:text-slate-400">
                  <span className="truncate">{it.nama}</span>
                  <span className="font-mono-num shrink-0">
                    Terjual {it.terjual} {it.satuan}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Riwayat Transaksi */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-lg font-bold">
            Riwayat Transaksi ({transaksiTampil.length})
          </h2>
          <div className="flex flex-col sm:flex-row gap-2 no-print">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={cariTrx}
                onChange={(e) => setCariTrx(e.target.value)}
                placeholder="Cari nomor / barang / kasir..."
                className="min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-9 pr-3 text-sm w-full sm:w-64"
              />
            </div>
            <select
              value={filterStatusTrx}
              onChange={(e) =>
                setFilterStatusTrx(e.target.value as 'Semua' | 'SELESAI' | 'DIBATALKAN')
              }
              aria-label="Filter status transaksi"
              className="min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-sm"
            >
              <option value="Semua">Semua Status</option>
              <option value="SELESAI">Selesai</option>
              <option value="DIBATALKAN">Dibatalkan</option>
            </select>
          </div>
        </div>

        {transaksiTampil.length === 0 ? (
          <div className="py-10 text-center text-slate-500">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-base font-semibold">Tidak ada transaksi pada filter ini</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {transaksiTampil.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onBukaDetailTransaksi(t)}
                className="w-full text-left py-3.5 px-2 -mx-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center justify-between gap-3 transition"
              >
                <div className="min-w-0">
                  <p className="text-base font-bold font-mono-num text-slate-900 dark:text-slate-100">
                    {t.nomor}{' '}
                    {t.status === 'DIBATALKAN' && (
                      <span className="text-rose-600 font-sans text-sm font-bold">
                        · DIBATALKAN
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 truncate mt-0.5">
                    {formatTanggalJamWIB(t.tanggal_waktu)} · {t.metode} · {t.kasir}
                    {t.catatan ? ` · ${t.catatan}` : ''}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={`text-base font-bold font-mono-num ${
                      t.status === 'DIBATALKAN'
                        ? 'text-rose-600 line-through'
                        : 'text-emerald-700 dark:text-emerald-400'
                    }`}
                  >
                    {formatRupiah(t.total)}
                  </p>
                  <p className="text-xs text-slate-500">{t.item.length} jenis</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
