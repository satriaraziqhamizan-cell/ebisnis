import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  ArrowDownCircle,
  ArrowUpCircle,
  Trash2,
  Edit3,
  X,
  ImagePlus,
  PackagePlus,
} from 'lucide-react';
import {
  AppData,
  ItemBelanjaStok,
  KATEGORI_PENGELUARAN,
  KategoriPengeluaran,
  MetodeBayar,
  Pemasukan,
  Pengeluaran,
  PeranPengguna,
} from '../types/pos';
import {
  formatRupiah,
  formatTanggalIndo,
  formatTanggalJamWIB,
  getTanggalWIB,
  kompresGambarFile,
} from '../utils/format';
import { ConfirmModal } from '../components/ConfirmModal';

interface KeuanganPageProps {
  data: AppData;
  peranAktif: PeranPengguna;
  namaPenggunaAktif: string;
  tabAwal?: 'pemasukan' | 'pengeluaran';
  bukaModalPengeluaranAwal?: boolean;
  onResetTriggerModal?: () => void;
  onTambahPemasukanManual: (input: {
    tanggal: string;
    jumlah: number;
    keterangan: string;
    metode: MetodeBayar;
  }) => void;
  onCatatPengeluaran: (input: {
    tanggal: string;
    jumlah: number;
    kategori: KategoriPengeluaran;
    keterangan: string;
    dicatat_oleh: string;
    foto_nota?: string;
    terkait_stok?: ItemBelanjaStok[];
  }) => void;
  onEditPengeluaran: (pengeluaran: Pengeluaran) => void;
  onHapusPengeluaran: (id: string) => void;
  onToast: (jenis: 'sukses' | 'error' | 'info', pesan: string) => void;
}

export const KeuanganPage: React.FC<KeuanganPageProps> = ({
  data,
  peranAktif,
  namaPenggunaAktif,
  tabAwal = 'pemasukan',
  bukaModalPengeluaranAwal = false,
  onResetTriggerModal,
  onTambahPemasukanManual,
  onCatatPengeluaran,
  onEditPengeluaran,
  onHapusPengeluaran,
  onToast,
}) => {
  const [tab, setTab] = useState<'pemasukan' | 'pengeluaran'>(
    peranAktif === 'pengadaan' ? 'pengeluaran' : tabAwal
  );

  // Filter Pemasukan
  const [filterTglMasuk, setFilterTglMasuk] = useState('');
  const [filterMetodeMasuk, setFilterMetodeMasuk] = useState<'Semua' | MetodeBayar>('Semua');
  const [filterSumberMasuk, setFilterSumberMasuk] = useState<'Semua' | 'PENJUALAN' | 'MANUAL'>('Semua');

  // Filter Pengeluaran
  const [filterTglKeluar, setFilterTglKeluar] = useState('');
  const [filterKatKeluar, setFilterKatKeluar] = useState<'Semua' | KategoriPengeluaran>('Semua');

  // Modal Pemasukan Manual
  const [modalMasuk, setModalMasuk] = useState(false);
  const [tglMasuk, setTglMasuk] = useState(getTanggalWIB());
  const [jmlMasuk, setJmlMasuk] = useState('');
  const [ketMasuk, setKetMasuk] = useState('');
  const [metodeMasuk, setMetodeMasuk] = useState<MetodeBayar>('TUNAI');

  // Modal Pengeluaran (Tambah / Edit)
  const [modalKeluar, setModalKeluar] = useState(false);
  const [editIdKeluar, setEditIdKeluar] = useState<string | null>(null);
  const [tglKeluar, setTglKeluar] = useState(getTanggalWIB());
  const [katKeluar, setKatKeluar] = useState<KategoriPengeluaran>(
    peranAktif === 'pengadaan' ? 'Belanja Barang/Stok' : 'Bahan Gado-gado'
  );
  const [jmlKeluar, setJmlKeluar] = useState('');
  const [ketKeluar, setKetKeluar] = useState('');
  const [olehKeluar, setOlehKeluar] = useState(namaPenggunaAktif);
  const [fotoNota, setFotoNota] = useState<string | undefined>(undefined);
  const [itemStokBelanja, setItemStokBelanja] = useState<ItemBelanjaStok[]>([]);
  const [pilihBarangId, setPilihBarangId] = useState('');
  const [qtyStokMasuk, setQtyStokMasuk] = useState('');
  const [hargaBeliStok, setHargaBeliStok] = useState('');

  const [hapusTarget, setHapusTarget] = useState<Pengeluaran | null>(null);

  useEffect(() => {
    if (bukaModalPengeluaranAwal) {
      setTab('pengeluaran');
      bukaFormPengeluaranBaru();
      onResetTriggerModal?.();
    }
  }, [bukaModalPengeluaranAwal]);

  const pemasukanTampil = useMemo(() => {
    return data.pemasukan.filter((p) => {
      if (filterTglMasuk && p.tanggal !== filterTglMasuk) return false;
      if (filterMetodeMasuk !== 'Semua' && p.metode !== filterMetodeMasuk) return false;
      if (filterSumberMasuk !== 'Semua' && p.sumber !== filterSumberMasuk) return false;
      return true;
    });
  }, [data.pemasukan, filterTglMasuk, filterMetodeMasuk, filterSumberMasuk]);

  const totalPemasukanTampil = useMemo(
    () =>
      pemasukanTampil
        .filter((p) => p.status === 'AKTIF')
        .reduce((acc, p) => acc + p.jumlah, 0),
    [pemasukanTampil]
  );

  const pengeluaranTampil = useMemo(() => {
    return data.pengeluaran.filter((k) => {
      if (filterTglKeluar && k.tanggal !== filterTglKeluar) return false;
      if (filterKatKeluar !== 'Semua' && k.kategori !== filterKatKeluar) return false;
      return true;
    });
  }, [data.pengeluaran, filterTglKeluar, filterKatKeluar]);

  const totalPengeluaranTampil = useMemo(
    () => pengeluaranTampil.reduce((acc, k) => acc + k.jumlah, 0),
    [pengeluaranTampil]
  );

  const barangBisaStok = useMemo(
    () =>
      data.barang
        .filter((b) => b.aktif && b.lacak_stok)
        .sort((a, b) => a.nama.localeCompare(b.nama, 'id')),
    [data.barang]
  );

  const bukaFormPengeluaranBaru = () => {
    setEditIdKeluar(null);
    setTglKeluar(getTanggalWIB());
    setKatKeluar(peranAktif === 'pengadaan' ? 'Belanja Barang/Stok' : 'Bahan Gado-gado');
    setJmlKeluar('');
    setKetKeluar('');
    setOlehKeluar(namaPenggunaAktif);
    setFotoNota(undefined);
    setItemStokBelanja([]);
    setPilihBarangId(barangBisaStok[0]?.id ?? '');
    setQtyStokMasuk('');
    setHargaBeliStok(String(barangBisaStok[0]?.harga_beli ?? ''));
    setModalKeluar(true);
  };

  const bukaEditPengeluaran = (k: Pengeluaran) => {
    setEditIdKeluar(k.id);
    setTglKeluar(k.tanggal);
    setKatKeluar(k.kategori);
    setJmlKeluar(String(k.jumlah));
    setKetKeluar(k.keterangan);
    setOlehKeluar(k.dicatat_oleh);
    setFotoNota(k.foto_nota);
    setItemStokBelanja(k.terkait_stok ?? []);
    setModalKeluar(true);
  };

  const tambahBarisBelanjaStok = () => {
    const b = barangBisaStok.find((x) => x.id === pilihBarangId);
    if (!b) return;
    const qty = Math.round(Number(qtyStokMasuk));
    const harga = Math.round(Number(hargaBeliStok || b.harga_beli));
    if (!Number.isFinite(qty) || qty <= 0) {
      onToast('error', 'Jumlah barang masuk harus lebih dari 0.');
      return;
    }

    const daftarBaru = [
      ...itemStokBelanja.filter((it) => it.barang_id !== b.id),
      {
        barang_id: b.id,
        nama_barang: b.nama,
        jumlah_masuk: qty,
        harga_beli_satuan: Math.max(0, harga),
        satuan: b.satuan,
      },
    ];
    setItemStokBelanja(daftarBaru);

    // Hitung otomatis total belanja dan keterangan bila masih kosong
    const totalBelanja = daftarBaru.reduce(
      (acc, it) => acc + it.jumlah_masuk * it.harga_beli_satuan,
      0
    );
    if (totalBelanja > 0) {
      setJmlKeluar(String(totalBelanja));
    }
    if (!ketKeluar.trim()) {
      setKetKeluar(
        `Belanja stok: ${daftarBaru.map((it) => `${it.nama_barang} (${it.jumlah_masuk})`).join(', ')}`
      );
    }
    setQtyStokMasuk('');
  };

  const tanganiUploadNota = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await kompresGambarFile(file, 600, 0.72);
      setFotoNota(url);
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Gagal membaca foto nota.');
    }
  };

  const simpanPemasukanManual = (e: React.FormEvent) => {
    e.preventDefault();
    const jumlah = Math.round(Number(jmlMasuk));
    if (!Number.isFinite(jumlah) || jumlah <= 0) {
      onToast('error', 'Jumlah pemasukan harus lebih dari Rp 0.');
      return;
    }
    if (!ketMasuk.trim()) {
      onToast('error', 'Sumber / keterangan pemasukan wajib diisi.');
      return;
    }
    onTambahPemasukanManual({
      tanggal: tglMasuk || getTanggalWIB(),
      jumlah,
      keterangan: ketMasuk.trim(),
      metode: metodeMasuk,
    });
    setModalMasuk(false);
    setJmlMasuk('');
    setKetKeluar('');
    setKetMasuk('');
  };

  const simpanPengeluaran = (e: React.FormEvent) => {
    e.preventDefault();
    const jumlah = Math.round(Number(jmlKeluar));
    if (!Number.isFinite(jumlah) || jumlah <= 0) {
      onToast('error', 'Jumlah pengeluaran harus lebih dari Rp 0.');
      return;
    }
    if (!ketKeluar.trim()) {
      onToast('error', 'Keterangan pengeluaran wajib diisi.');
      return;
    }

    if (editIdKeluar) {
      const lama = data.pengeluaran.find((p) => p.id === editIdKeluar);
      if (!lama) return;
      const riwayat = [
        ...(lama.riwayat_ubah ?? []),
        `Diubah oleh ${namaPenggunaAktif} pada ${formatTanggalJamWIB(new Date())}`,
      ];
      onEditPengeluaran({
        ...lama,
        tanggal: tglKeluar,
        jumlah,
        kategori: katKeluar,
        keterangan: ketKeluar.trim(),
        dicatat_oleh: olehKeluar.trim() || namaPenggunaAktif,
        foto_nota: fotoNota,
        riwayat_ubah: riwayat,
      });
    } else {
      onCatatPengeluaran({
        tanggal: tglKeluar,
        jumlah,
        kategori: katKeluar,
        keterangan: ketKeluar.trim(),
        dicatat_oleh: olehKeluar.trim() || namaPenggunaAktif,
        foto_nota: fotoNota,
        terkait_stok: katKeluar === 'Belanja Barang/Stok' ? itemStokBelanja : undefined,
      });
    }
    setModalKeluar(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {tab === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'}
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-400">
            Catat uang masuk dan uang keluar toko dengan rapi
          </p>
        </div>

        <div className="flex items-center gap-2">
          {tab === 'pemasukan' && peranAktif !== 'pengadaan' ? (
            <button
              type="button"
              onClick={() => {
                setTglMasuk(getTanggalWIB());
                setModalMasuk(true);
              }}
              className="min-h-[48px] px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-base font-bold flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span>Pemasukan Manual</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={bukaFormPengeluaranBaru}
              className="min-h-[48px] px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-base font-bold flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span>Catat Pengeluaran</span>
            </button>
          )}
        </div>
      </div>

      {/* Switcher Pemasukan / Pengeluaran */}
      {peranAktif !== 'pengadaan' && (
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-2xl">
          <button
            type="button"
            onClick={() => setTab('pemasukan')}
            className={`min-h-[48px] rounded-xl text-base font-bold flex items-center justify-center gap-2 transition ${
              tab === 'pemasukan'
                ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <ArrowDownCircle className="w-5 h-5" />
            <span>Pemasukan</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('pengeluaran')}
            className={`min-h-[48px] rounded-xl text-base font-bold flex items-center justify-center gap-2 transition ${
              tab === 'pengeluaran'
                ? 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <ArrowUpCircle className="w-5 h-5" />
            <span>Pengeluaran</span>
          </button>
        </div>
      )}

      {/* TAB PEMASUKAN */}
      {tab === 'pemasukan' && peranAktif !== 'pengadaan' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="date"
              value={filterTglMasuk}
              onChange={(e) => setFilterTglMasuk(e.target.value)}
              aria-label="Filter tanggal pemasukan"
              className="min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-base"
            />
            <select
              value={filterMetodeMasuk}
              onChange={(e) => setFilterMetodeMasuk(e.target.value as 'Semua' | MetodeBayar)}
              aria-label="Filter metode bayar"
              className="min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-base"
            >
              <option value="Semua">Semua Metode</option>
              <option value="TUNAI">Tunai</option>
              <option value="QRIS">QRIS</option>
            </select>
            <select
              value={filterSumberMasuk}
              onChange={(e) =>
                setFilterSumberMasuk(e.target.value as 'Semua' | 'PENJUALAN' | 'MANUAL')
              }
              aria-label="Filter sumber pemasukan"
              className="min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-base"
            >
              <option value="Semua">Semua Sumber</option>
              <option value="PENJUALAN">Otomatis Penjualan</option>
              <option value="MANUAL">Pemasukan Manual</option>
            </select>
          </div>

          <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 flex items-center justify-between">
            <span className="text-base font-semibold text-slate-800 dark:text-slate-200">
              Total Pemasukan Aktif (sesuai filter)
            </span>
            <span className="text-xl font-bold font-mono-num text-emerald-800 dark:text-emerald-300">
              {formatRupiah(totalPemasukanTampil)}
            </span>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
            {pemasukanTampil.length === 0 ? (
              <div className="p-10 text-center text-slate-500">
                <p className="text-base font-semibold">Belum ada catatan pemasukan</p>
                <p className="text-sm mt-1">
                  Pemasukan tercatat otomatis setiap ada penjualan di Kasir.
                </p>
              </div>
            ) : (
              pemasukanTampil.map((p: Pemasukan) => (
                <div
                  key={p.id}
                  className={`p-4 flex items-start justify-between gap-3 ${
                    p.status === 'DIBATALKAN' ? 'opacity-60' : ''
                  }`}
                >
                  <div className="min-w-0">
                    <p
                      className={`text-base font-bold text-slate-900 dark:text-slate-100 ${
                        p.status === 'DIBATALKAN' ? 'line-through' : ''
                      }`}
                    >
                      {p.keterangan}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                      {formatTanggalIndo(p.tanggal)} · {p.metode} ·{' '}
                      {p.sumber === 'PENJUALAN' ? 'Otomatis Penjualan' : 'Manual'} ·{' '}
                      {p.dicatat_oleh}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={`text-base font-bold font-mono-num ${
                        p.status === 'DIBATALKAN'
                          ? 'text-rose-600 line-through'
                          : 'text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      {formatRupiah(p.jumlah)}
                    </p>
                    {p.status === 'DIBATALKAN' && (
                      <p className="text-xs font-bold text-rose-600">DIBATALKAN</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB PENGELUARAN */}
      {tab === 'pengeluaran' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="date"
              value={filterTglKeluar}
              onChange={(e) => setFilterTglKeluar(e.target.value)}
              aria-label="Filter tanggal pengeluaran"
              className="min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-base"
            />
            <select
              value={filterKatKeluar}
              onChange={(e) =>
                setFilterKatKeluar(e.target.value as 'Semua' | KategoriPengeluaran)
              }
              aria-label="Filter kategori pengeluaran"
              className="min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-base"
            >
              <option value="Semua">Semua Kategori</option>
              {KATEGORI_PENGELUARAN.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-4 flex items-center justify-between">
            <span className="text-base font-semibold text-slate-800 dark:text-slate-200">
              Total Pengeluaran (sesuai filter)
            </span>
            <span className="text-xl font-bold font-mono-num text-rose-700 dark:text-rose-400">
              {formatRupiah(totalPengeluaranTampil)}
            </span>
          </div>

          <div className="space-y-3">
            {pengeluaranTampil.length === 0 ? (
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 text-center text-slate-500">
                <p className="text-base font-semibold">Belum ada catatan pengeluaran</p>
                <p className="text-sm mt-1">
                  Tekan tombol "Catat Pengeluaran" untuk mencatat belanja atau biaya toko.
                </p>
              </div>
            ) : (
              pengeluaranTampil.map((k) => (
                <div
                  key={k.id}
                  className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {k.foto_nota && (
                      <img
                        src={k.foto_nota}
                        alt="Foto nota"
                        className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {k.keterangan}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                        {k.kategori} · {formatTanggalIndo(k.tanggal)} · Oleh {k.dicatat_oleh}
                      </p>
                      {k.terkait_stok && k.terkait_stok.length > 0 && (
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mt-1">
                          Menambah stok:{' '}
                          {k.terkait_stok
                            .map((s) => `${s.nama_barang} (+${s.jumlah_masuk} ${s.satuan})`)
                            .join(', ')}
                        </p>
                      )}
                      {k.riwayat_ubah && k.riwayat_ubah.length > 0 && (
                        <p className="text-xs text-slate-400 mt-1">
                          {k.riwayat_ubah[k.riwayat_ubah.length - 1]}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <p className="text-lg font-bold font-mono-num text-rose-700 dark:text-rose-400">
                      {formatRupiah(k.jumlah)}
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => bukaEditPengeluaran(k)}
                        aria-label="Ubah pengeluaran"
                        className="min-h-[44px] min-w-[44px] rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setHapusTarget(k)}
                        aria-label="Hapus pengeluaran"
                        className="min-h-[44px] min-w-[44px] rounded-xl border border-rose-200 dark:border-rose-900 flex items-center justify-center text-rose-600 dark:text-rose-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal Pemasukan Manual */}
      {modalMasuk && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold">Tambah Pemasukan Manual</h2>
              <button
                type="button"
                onClick={() => setModalMasuk(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={simpanPemasukanManual} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Tanggal</label>
                <input
                  type="date"
                  value={tglMasuk}
                  onChange={(e) => setTglMasuk(e.target.value)}
                  required
                  className="w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Jumlah (Rp) *</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  required
                  value={jmlMasuk}
                  onChange={(e) => setJmlMasuk(e.target.value)}
                  placeholder="Contoh: 50000"
                  className="w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 text-lg font-bold font-mono-num"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Sumber / Keterangan *</label>
                <input
                  type="text"
                  required
                  value={ketMasuk}
                  onChange={(e) => setKetMasuk(e.target.value)}
                  placeholder="Contoh: Setoran modal tambahan / bagi hasil"
                  className="w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Metode</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['TUNAI', 'QRIS'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMetodeMasuk(m)}
                      className={`min-h-[48px] rounded-xl border text-base font-bold ${
                        metodeMasuk === m
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalMasuk(false)}
                  className="flex-1 min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 text-base font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 min-h-[48px] rounded-xl bg-emerald-700 text-white text-base font-bold"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Pengeluaran (+ Belanja Stok Sekaligus) */}
      {modalKeluar && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 overflow-y-auto">
          <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold">
                {editIdKeluar ? 'Ubah Catatan Pengeluaran' : 'Catat Pengeluaran'}
              </h2>
              <button
                type="button"
                onClick={() => setModalKeluar(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={simpanPengeluaran} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={tglKeluar}
                    onChange={(e) => setTglKeluar(e.target.value)}
                    required
                    className="w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Kategori</label>
                  <select
                    value={katKeluar}
                    disabled={!!editIdKeluar}
                    onChange={(e) => setKatKeluar(e.target.value as KategoriPengeluaran)}
                    className="w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-base"
                  >
                    {KATEGORI_PENGELUARAN.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Fitur Tambah Stok Sekaligus jika Kategori = Belanja Barang/Stok */}
              {!editIdKeluar && katKeluar === 'Belanja Barang/Stok' && (
                <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                    <PackagePlus className="w-5 h-5 shrink-0" />
                    <p className="text-base font-bold">
                      Tambah Stok Barang Sekaligus (Opsional)
                    </p>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Pilih barang yang dibeli agar stok dan harga modal langsung bertambah otomatis.
                  </p>

                  <div className="space-y-2">
                    <select
                      value={pilihBarangId}
                      onChange={(e) => {
                        setPilihBarangId(e.target.value);
                        const b = barangBisaStok.find((x) => x.id === e.target.value);
                        if (b) setHargaBeliStok(String(b.harga_beli));
                      }}
                      className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-base"
                    >
                      {barangBisaStok.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.nama} (sisa {b.stok} {b.satuan})
                        </option>
                      ))}
                    </select>

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        value={qtyStokMasuk}
                        onChange={(e) => setQtyStokMasuk(e.target.value)}
                        placeholder="Jumlah masuk"
                        className="min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-base font-mono-num"
                      />
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={hargaBeliStok}
                        onChange={(e) => setHargaBeliStok(e.target.value)}
                        placeholder="Harga beli/satuan"
                        className="min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-base font-mono-num"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={tambahBarisBelanjaStok}
                      className="w-full min-h-[44px] rounded-xl bg-emerald-700 text-white text-sm font-bold hover:bg-emerald-800"
                    >
                      + Masukkan ke Daftar Belanja Stok
                    </button>
                  </div>

                  {itemStokBelanja.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-emerald-200 dark:border-emerald-800">
                      {itemStokBelanja.map((it) => (
                        <div
                          key={it.barang_id}
                          className="flex items-center justify-between text-sm bg-white dark:bg-slate-900 rounded-xl px-3 py-2 border border-slate-200 dark:border-slate-700"
                        >
                          <span className="font-medium truncate">
                            {it.nama_barang} (+{it.jumlah_masuk} {it.satuan} @{' '}
                            {formatRupiah(it.harga_beli_satuan)})
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setItemStokBelanja((prev) =>
                                prev.filter((x) => x.barang_id !== it.barang_id)
                              )
                            }
                            className="text-rose-600 font-bold ml-2 shrink-0"
                          >
                            Hapus
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-1">Total Pengeluaran (Rp) *</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  required
                  value={jmlKeluar}
                  onChange={(e) => setJmlKeluar(e.target.value)}
                  placeholder="Contoh: 120000"
                  className="w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 text-lg font-bold font-mono-num"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Keterangan *</label>
                <input
                  type="text"
                  required
                  value={ketKeluar}
                  onChange={(e) => setKetKeluar(e.target.value)}
                  placeholder="Contoh: Beli gas 3kg / Belanja agen"
                  className="w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 text-base"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Dicatat Oleh</label>
                <input
                  type="text"
                  value={olehKeluar}
                  onChange={(e) => setOlehKeluar(e.target.value)}
                  className="w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 text-base"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label className="min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 flex items-center gap-2 text-sm font-semibold cursor-pointer">
                  <ImagePlus className="w-4 h-4" />
                  <span>{fotoNota ? 'Ganti Foto Nota' : 'Foto Nota (Opsional)'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={tanganiUploadNota}
                    className="hidden"
                  />
                </label>
                {fotoNota && (
                  <button
                    type="button"
                    onClick={() => setFotoNota(undefined)}
                    className="text-sm font-semibold text-rose-600"
                  >
                    Hapus Foto Nota
                  </button>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalKeluar(false)}
                  className="flex-1 min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 text-base font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 min-h-[48px] rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-base font-bold"
                >
                  Simpan Pengeluaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        terbuka={!!hapusTarget}
        judul="Hapus Catatan Pengeluaran?"
        pesan={`Catatan "${hapusTarget?.keterangan}" senilai ${formatRupiah(hapusTarget?.jumlah ?? 0)} akan dihapus.${
          hapusTarget?.terkait_stok?.length
            ? ' Stok barang yang sempat ditambahkan dari belanja ini juga akan dikurangi kembali.'
            : ''
        }`}
        labelKonfirmasi="Hapus Catatan"
        bahaya
        onTutup={() => setHapusTarget(null)}
        onKonfirmasi={() => {
          if (hapusTarget) onHapusPengeluaran(hapusTarget.id);
          setHapusTarget(null);
        }}
      />
    </div>
  );
};
