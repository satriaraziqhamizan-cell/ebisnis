import React, { useMemo, useState } from 'react';
import {
  Search,
  Plus,
  Minus,
  ShoppingCart,
  Trash2,
  PauseCircle,
  PlayCircle,
  Banknote,
  QrCode,
  CheckCircle2,
  X,
  AlertCircle,
} from 'lucide-react';
import {
  AppData,
  Barang,
  ItemTransaksi,
  KATEGORI_BARANG,
  KeranjangTersimpan,
  MetodeBayar,
} from '../types/pos';
import { formatJamWIB, formatRupiah } from '../utils/format';

interface KasirPageProps {
  data: AppData;
  kasirAktif: string;
  onSelesaikanPenjualan: (params: {
    item: ItemTransaksi[];
    diskon: number;
    metode: MetodeBayar;
    uang_diterima: number;
    catatan: string;
  }) => void;
  onSimpanSementara: (keranjang: Omit<KeranjangTersimpan, 'id' | 'waktu_simpan'>) => void;
  onHapusKeranjangTersimpan: (id: string) => void;
  onToast: (jenis: 'sukses' | 'error' | 'info', pesan: string) => void;
}

const NOMINAL_CEPAT = [5000, 10000, 20000, 50000, 100000];

export const KasirPage: React.FC<KasirPageProps> = ({
  data,
  kasirAktif,
  onSelesaikanPenjualan,
  onSimpanSementara,
  onHapusKeranjangTersimpan,
  onToast,
}) => {
  const [cari, setCari] = useState('');
  const [kategoriAktif, setKategoriAktif] = useState<string>('Semua');
  const [keranjang, setKeranjang] = useState<ItemTransaksi[]>([]);
  const [diskonInput, setDiskonInput] = useState<string>('');
  const [catatan, setCatatan] = useState('');
  const [metode, setMetode] = useState<MetodeBayar>('TUNAI');
  const [uangDiterimaInput, setUangDiterimaInput] = useState<string>('');
  const [drawerBayarTerbuka, setDrawerBayarTerbuka] = useState(false);
  const [modalHoldTerbuka, setModalHoldTerbuka] = useState(false);

  // Hitung frekuensi pembelian agar barang terlaris muncul lebih atas saat tidak mengetik pencarian
  const frekuensiTerjual = useMemo(() => {
    const peta = new Map<string, number>();
    for (const trx of data.transaksi) {
      if (trx.status !== 'SELESAI') continue;
      for (const it of trx.item) {
        peta.set(it.barang_id, (peta.get(it.barang_id) ?? 0) + it.jumlah);
      }
    }
    return peta;
  }, [data.transaksi]);

  const daftarBarangTampil = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return data.barang
      .filter((b) => {
        if (!b.aktif) return false;
        if (kategoriAktif !== 'Semua' && b.kategori !== kategoriAktif) return false;
        if (q && !b.nama.toLowerCase().includes(q) && !b.kategori.toLowerCase().includes(q)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const freqB = frekuensiTerjual.get(b.id) ?? 0;
        const freqA = frekuensiTerjual.get(a.id) ?? 0;
        if (freqB !== freqA) return freqB - freqA;
        return a.nama.localeCompare(b.nama, 'id');
      });
  }, [data.barang, cari, kategoriAktif, frekuensiTerjual]);

  const petaJumlahKeranjang = useMemo(() => {
    return new Map(keranjang.map((it) => [it.barang_id, it.jumlah]));
  }, [keranjang]);

  const subtotal = useMemo(
    () => keranjang.reduce((acc, it) => acc + it.subtotal, 0),
    [keranjang]
  );
  const diskon = Math.max(0, Math.min(subtotal, parseInt(diskonInput || '0', 10) || 0));
  const totalAkhir = Math.max(0, subtotal - diskon);
  const totalItem = useMemo(
    () => keranjang.reduce((acc, it) => acc + it.jumlah, 0),
    [keranjang]
  );

  const uangDiterima = parseInt(uangDiterimaInput || '0', 10) || 0;
  const kembalian = uangDiterima - totalAkhir;

  const tambahKeKeranjang = (barang: Barang) => {
    const jumlahSaatIni = petaJumlahKeranjang.get(barang.id) ?? 0;
    if (barang.lacak_stok && jumlahSaatIni >= barang.stok) {
      onToast(
        'error',
        barang.stok === 0
          ? `Stok "${barang.nama}" sedang habis.`
          : `Stok "${barang.nama}" hanya tersisa ${barang.stok} ${barang.satuan}.`
      );
      return;
    }

    setKeranjang((prev) => {
      const ada = prev.find((it) => it.barang_id === barang.id);
      if (ada) {
        const jumlahBaru = ada.jumlah + 1;
        return prev.map((it) =>
          it.barang_id === barang.id
            ? { ...it, jumlah: jumlahBaru, subtotal: jumlahBaru * it.harga }
            : it
        );
      }
      return [
        ...prev,
        {
          barang_id: barang.id,
          nama: barang.nama,
          harga: barang.harga_jual,
          satuan: barang.satuan,
          jumlah: 1,
          subtotal: barang.harga_jual,
        },
      ];
    });
  };

  const ubahJumlahItem = (barangId: string, delta: number) => {
    const barang = data.barang.find((b) => b.id === barangId);
    setKeranjang((prev) =>
      prev
        .map((it) => {
          if (it.barang_id !== barangId) return it;
          const jumlahBaru = it.jumlah + delta;
          if (jumlahBaru <= 0) return null;
          if (delta > 0 && barang?.lacak_stok && jumlahBaru > barang.stok) {
            onToast(
              'error',
              `Stok "${barang.nama}" maksimal ${barang.stok} ${barang.satuan}.`
            );
            return it;
          }
          return { ...it, jumlah: jumlahBaru, subtotal: jumlahBaru * it.harga };
        })
        .filter((it): it is ItemTransaksi => it !== null)
    );
  };

  const bersihkanKeranjang = () => {
    setKeranjang([]);
    setDiskonInput('');
    setCatatan('');
    setUangDiterimaInput('');
    setMetode('TUNAI');
    setDrawerBayarTerbuka(false);
  };

  const tanganiSimpanSementara = () => {
    if (keranjang.length === 0) return;
    const label =
      catatan.trim() ||
      `${keranjang[0].nama}${keranjang.length > 1 ? ` +${keranjang.length - 1} item` : ''}`;
    onSimpanSementara({
      label,
      item: keranjang,
      diskon,
      catatan,
    });
    bersihkanKeranjang();
  };

  const tanganiLanjutKeranjang = (saved: KeranjangTersimpan) => {
    setKeranjang(saved.item);
    setDiskonInput(saved.diskon > 0 ? String(saved.diskon) : '');
    setCatatan(saved.catatan);
    onHapusKeranjangTersimpan(saved.id);
    setModalHoldTerbuka(false);
    onToast('info', `Melanjutkan pesanan "${saved.label}".`);
  };

  const tanganiBayar = () => {
    if (keranjang.length === 0) {
      onToast('error', 'Pilih minimal satu barang terlebih dahulu.');
      return;
    }
    if (metode === 'TUNAI' && uangDiterima < totalAkhir) {
      onToast('error', 'Uang diterima masih kurang dari total belanja.');
      return;
    }

    onSelesaikanPenjualan({
      item: keranjang,
      diskon,
      metode,
      uang_diterima: metode === 'QRIS' ? totalAkhir : uangDiterima,
      catatan,
    });
    bersihkanKeranjang();
  };

  const kategoriTabs = ['Semua', ...KATEGORI_BARANG];

  // Isi panel keranjang & pembayaran (dipakai di sidebar desktop dan bottom sheet mobile)
  const renderPanelKeranjang = (diDrawerMobile = false) => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Keranjang ({totalItem} item)
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Kasir: {kasirAktif}</p>
        </div>
        <div className="flex items-center gap-2">
          {keranjang.length > 0 && (
            <>
              <button
                type="button"
                onClick={tanganiSimpanSementara}
                title="Tahan pesanan sementara"
                className="min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5"
              >
                <PauseCircle className="w-4 h-4" />
                <span>Tahan</span>
              </button>
              <button
                type="button"
                onClick={bersihkanKeranjang}
                aria-label="Kosongkan keranjang"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </>
          )}
          {diDrawerMobile && (
            <button
              type="button"
              onClick={() => setDrawerBayarTerbuka(false)}
              aria-label="Tutup keranjang"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {keranjang.length === 0 ? (
        <div className="py-12 text-center text-slate-500 dark:text-slate-400">
          <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-base font-semibold">Keranjang masih kosong</p>
          <p className="text-sm mt-1">Ketuk barang di daftar untuk memasukkannya.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto py-3 space-y-4">
          {/* Daftar item keranjang */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {keranjang.map((it) => (
              <div key={it.barang_id} className="py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {it.nama}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-mono-num">
                    {formatRupiah(it.harga)} / {it.satuan} · Sub {formatRupiah(it.subtotal)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => ubahJumlahItem(it.barang_id, -1)}
                    aria-label={`Kurangi ${it.nama}`}
                    className="min-h-[44px] min-w-[44px] rounded-xl border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center text-base font-bold font-mono-num">
                    {it.jumlah}
                  </span>
                  <button
                    type="button"
                    onClick={() => ubahJumlahItem(it.barang_id, 1)}
                    aria-label={`Tambah ${it.nama}`}
                    className="min-h-[44px] min-w-[44px] rounded-xl bg-emerald-700 text-white flex items-center justify-center hover:bg-emerald-800"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Diskon & Catatan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Diskon (Rp)
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={diskonInput}
                onChange={(e) => setDiskonInput(e.target.value)}
                placeholder="0"
                className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-base font-mono-num text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Catatan (opsional)
              </label>
              <input
                type="text"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Misal: Ibu Budi"
                className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-base text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Total */}
          <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 flex items-center justify-between">
            <span className="text-base font-bold text-slate-800 dark:text-slate-200">
              Total Bayar
            </span>
            <span className="text-2xl font-bold font-mono-num text-emerald-800 dark:text-emerald-300">
              {formatRupiah(totalAkhir)}
            </span>
          </div>

          {/* Pilihan Metode Bayar */}
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Metode Pembayaran
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setMetode('TUNAI')}
                className={`min-h-[48px] flex items-center justify-center gap-2 rounded-xl border text-base font-bold transition ${
                  metode === 'TUNAI'
                    ? 'bg-emerald-700 border-emerald-700 text-white'
                    : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                <Banknote className="w-5 h-5" />
                <span>Tunai</span>
              </button>
              <button
                type="button"
                onClick={() => setMetode('QRIS')}
                className={`min-h-[48px] flex items-center justify-center gap-2 rounded-xl border text-base font-bold transition ${
                  metode === 'QRIS'
                    ? 'bg-emerald-700 border-emerald-700 text-white'
                    : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                <QrCode className="w-5 h-5" />
                <span>QRIS</span>
              </button>
            </div>
          </div>

          {/* Area Input Tunai atau QRIS */}
          {metode === 'TUNAI' ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Uang Diterima (Rp)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={uangDiterimaInput}
                  onChange={(e) => setUangDiterimaInput(e.target.value)}
                  placeholder={String(totalAkhir)}
                  className="w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 text-xl font-bold font-mono-num text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Tombol Nominal Cepat termasuk Uang Pas */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setUangDiterimaInput(String(totalAkhir))}
                  className="min-h-[48px] rounded-xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-sm font-bold text-amber-900 dark:text-amber-200 hover:bg-amber-200"
                >
                  Uang Pas
                </button>
                {NOMINAL_CEPAT.map((nom) => (
                  <button
                    key={nom}
                    type="button"
                    onClick={() => setUangDiterimaInput(String(nom))}
                    className="min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-bold font-mono-num text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    {nom.toLocaleString('id-ID')}
                  </button>
                ))}
              </div>

              {/* Info Kembalian */}
              <div
                className={`rounded-xl p-3.5 border flex items-center justify-between ${
                  uangDiterimaInput === ''
                    ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                    : kembalian >= 0
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
                }`}
              >
                <span className="text-base font-semibold text-slate-700 dark:text-slate-200">
                  {kembalian < 0 && uangDiterimaInput !== '' ? 'Uang Kurang' : 'Kembalian'}
                </span>
                <span
                  className={`text-lg font-bold font-mono-num ${
                    kembalian < 0 && uangDiterimaInput !== ''
                      ? 'text-rose-700 dark:text-rose-400'
                      : 'text-emerald-800 dark:text-emerald-300'
                  }`}
                >
                  {uangDiterimaInput === ''
                    ? 'Rp 0'
                    : formatRupiah(Math.abs(kembalian))}
                </span>
              </div>

              <button
                type="button"
                onClick={tanganiBayar}
                disabled={uangDiterima < totalAkhir}
                className="w-full min-h-[54px] rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 text-white text-base font-bold flex items-center justify-center gap-2 transition"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Selesaikan Transaksi Tunai</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 text-center">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {data.pengaturan.nama_merchant_qris}
                </p>
                <p className="text-xl font-bold font-mono-num text-emerald-700 dark:text-emerald-400 mt-1">
                  {formatRupiah(totalAkhir)}
                </p>
                <div className="mt-3 flex justify-center">
                  {data.pengaturan.gambar_qris ? (
                    <img
                      src={data.pengaturan.gambar_qris}
                      alt="Kode QRIS Toko Kelontong Nek Upik"
                      className="w-48 h-48 object-contain rounded-xl border border-slate-200 bg-white p-2"
                    />
                  ) : (
                    <div className="w-48 h-48 rounded-xl border border-dashed border-slate-300 flex items-center justify-center text-sm text-slate-500 p-4">
                      Gambar QRIS belum diunggah di Pengaturan.
                    </div>
                  )}
                </div>
                <div className="mt-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 p-3 text-left flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-900 dark:text-amber-200 leading-snug">
                    Pastikan notifikasi pembayaran sudah masuk di HP sebelum menyerahkan barang.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={tanganiBayar}
                className="w-full min-h-[54px] rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-base font-bold flex items-center justify-center gap-2 transition"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Pembayaran Sudah Diterima</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="lg:grid lg:grid-cols-12 lg:gap-6 items-start">
      {/* Kolom Kiri: Pencarian & Katalog Barang */}
      <div className="lg:col-span-7 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Transaksi Penjualan
          </h1>
          {data.keranjang_tersimpan.length > 0 && (
            <button
              type="button"
              onClick={() => setModalHoldTerbuka(true)}
              className="min-h-[44px] px-3.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-sm font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5"
            >
              <PlayCircle className="w-4 h-4" />
              <span>Pesanan Ditahan ({data.keranjang_tersimpan.length})</span>
            </button>
          )}
        </div>

        {/* Pencarian Instan */}
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari nama barang... (misal: gado, teh, galon)"
            className="w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-11 pr-4 text-base text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>

        {/* Filter Kategori Horizontal */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {kategoriTabs.map((kat) => {
            const aktif = kategoriAktif === kat;
            return (
              <button
                key={kat}
                type="button"
                onClick={() => setKategoriAktif(kat)}
                className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap shrink-0 transition ${
                  aktif
                    ? 'bg-emerald-700 text-white'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {kat}
              </button>
            );
          })}
        </div>

        {/* Grid Barang Cepat */}
        {daftarBarangTampil.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-500 dark:text-slate-400">
            <p className="text-base font-semibold">Barang tidak ditemukan</p>
            <p className="text-sm mt-1">Coba kata kunci lain atau pilih kategori Semua.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-20 lg:pb-4">
            {daftarBarangTampil.map((b) => {
              const qtyDiKeranjang = petaJumlahKeranjang.get(b.id) ?? 0;
              const habis = b.lacak_stok && b.stok <= 0;

              return (
                <div
                  key={b.id}
                  className={`rounded-2xl border p-3.5 transition flex items-center justify-between gap-3 ${
                    qtyDiKeranjang > 0
                      ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 dark:border-emerald-600'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                  } ${habis ? 'opacity-60' : ''}`}
                >
                  <button
                    type="button"
                    onClick={() => tambahKeKeranjang(b)}
                    disabled={habis}
                    className="flex-1 min-w-0 text-left flex items-center gap-3 min-h-[52px]"
                  >
                    {b.foto && (
                      <img
                        src={b.foto}
                        alt={b.nama}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2">
                        {b.nama}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 text-sm">
                        <span className="font-bold font-mono-num text-emerald-700 dark:text-emerald-400">
                          {formatRupiah(b.harga_jual)}
                        </span>
                        <span className="text-slate-400">·</span>
                        <span
                          className={`tabular-nums ${
                            habis
                              ? 'text-rose-700 dark:text-rose-400 font-semibold'
                              : b.lacak_stok && b.stok <= b.stok_minimum
                                ? 'text-amber-700 dark:text-amber-400 font-semibold'
                                : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {b.lacak_stok ? (habis ? 'Habis' : `Stok ${b.stok} ${b.satuan}`) : `${b.satuan} · Bebas stok`}
                        </span>
                      </div>
                    </div>
                  </button>

                  {qtyDiKeranjang > 0 ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => ubahJumlahItem(b.id, -1)}
                        aria-label={`Kurangi ${b.nama}`}
                        className="min-h-[44px] min-w-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-slate-800 dark:text-slate-100"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-7 text-center text-base font-bold font-mono-num">
                        {qtyDiKeranjang}
                      </span>
                      <button
                        type="button"
                        onClick={() => tambahKeKeranjang(b)}
                        aria-label={`Tambah ${b.nama}`}
                        className="min-h-[44px] min-w-[44px] rounded-xl bg-emerald-700 text-white flex items-center justify-center"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={habis}
                      onClick={() => tambahKeKeranjang(b)}
                      aria-label={`Tambah ${b.nama} ke keranjang`}
                      className="min-h-[44px] min-w-[44px] rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white flex items-center justify-center shrink-0"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Kolom Kanan (Desktop): Keranjang & Pembayaran Selalu Terlihat */}
      <div className="hidden lg:block lg:col-span-5 sticky top-20 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 max-h-[calc(100vh-6.5rem)] overflow-y-auto">
        {renderPanelKeranjang(false)}
      </div>

      {/* Bilah Keranjang Mengambang (Mobile) di atas Bottom Navigation */}
      {keranjang.length > 0 && (
        <div className="lg:hidden fixed bottom-16 left-0 right-0 z-30 px-3 pb-2 pointer-events-none no-print">
          <button
            type="button"
            onClick={() => setDrawerBayarTerbuka(true)}
            className="pointer-events-auto w-full min-h-[54px] rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-3 shadow-xl flex items-center justify-between gap-3 active:scale-[0.99] transition"
          >
            <div className="flex items-center gap-2.5">
              <ShoppingCart className="w-5 h-5 shrink-0" />
              <span className="text-base font-bold tabular-nums">{totalItem} item</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold font-mono-num">
                {formatRupiah(totalAkhir)}
              </span>
              <span className="rounded-lg bg-white/20 px-2.5 py-1 text-sm font-bold">
                Bayar
              </span>
            </div>
          </button>
        </div>
      )}

      {/* Drawer Pembayaran Mobile */}
      {drawerBayarTerbuka && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end bg-black/50 backdrop-blur-xs">
          <div className="w-full rounded-t-3xl bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-5 max-h-[90vh] flex flex-col">
            <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3 shrink-0" />
            <div className="flex-1 overflow-y-auto">{renderPanelKeranjang(true)}</div>
          </div>
        </div>
      )}

      {/* Modal Pesanan Ditahan */}
      {modalHoldTerbuka && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Pesanan Disimpan Sementara
              </h3>
              <button
                type="button"
                onClick={() => setModalHoldTerbuka(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-3 space-y-2.5 overflow-y-auto">
              {data.keranjang_tersimpan.map((saved) => {
                const totalSaved = Math.max(
                  0,
                  saved.item.reduce((a, b) => a + b.subtotal, 0) - saved.diskon
                );
                return (
                  <div
                    key={saved.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                        {saved.label}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-mono-num">
                        {saved.item.length} jenis · {formatRupiah(totalSaved)} · Jam{' '}
                        {formatJamWIB(saved.waktu_simpan)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => tanganiLanjutKeranjang(saved)}
                        className="min-h-[44px] px-3.5 rounded-xl bg-emerald-700 text-white text-sm font-bold"
                      >
                        Lanjutkan
                      </button>
                      <button
                        type="button"
                        onClick={() => onHapusKeranjangTersimpan(saved.id)}
                        aria-label="Hapus pesanan ditahan"
                        className="min-h-[44px] min-w-[44px] rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
