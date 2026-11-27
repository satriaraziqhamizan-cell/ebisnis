import React, { useMemo, useState } from 'react';
import {
  Search,
  PackagePlus,
  SlidersHorizontal,
  History,
  MessageCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  Copy,
} from 'lucide-react';
import { AppData, Barang, PeranPengguna } from '../types/pos';
import { formatRupiah, formatTanggalJamWIB } from '../utils/format';

interface StokPageProps {
  data: AppData;
  peranAktif: PeranPengguna;
  onUbahStok: (params: {
    barang_id: string;
    mode: 'MASUK' | 'OPNAME';
    nilai: number;
    harga_beli_baru?: number;
    keterangan: string;
  }) => void;
  onToast: (jenis: 'sukses' | 'error' | 'info', pesan: string) => void;
}

const ALASAN_OPNAME = [
  'Selisih hitung rak',
  'Barang rusak / pecah',
  'Kadaluarsa',
  'Barang hilang',
  'Dipakai untuk dapur gado-gado',
];

export const StokPage: React.FC<StokPageProps> = ({
  data,
  peranAktif,
  onUbahStok,
  onToast,
}) => {
  const [tab, setTab] = useState<'daftar' | 'belanja' | 'riwayat'>('daftar');
  const [cari, setCari] = useState('');
  const [barangDipilih, setBarangDipilih] = useState<Barang | null>(null);
  const [modeAksi, setModeAksi] = useState<'MASUK' | 'OPNAME'>('MASUK');
  const [nilaiInput, setNilaiInput] = useState('');
  const [hargaBeliInput, setHargaBeliInput] = useState('');
  const [keterangan, setKeterangan] = useState('');

  const bisaUbah = peranAktif === 'pemilik' || peranAktif === 'pengadaan';

  const barangTerlacak = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return data.barang
      .filter((b) => {
        if (!b.aktif) return false;
        if (q && !b.nama.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.lacak_stok !== b.lacak_stok) return a.lacak_stok ? -1 : 1;
        return a.stok - b.stok;
      });
  }, [data.barang, cari]);

  const perluBelanja = useMemo(() => {
    return data.barang
      .filter((b) => b.aktif && b.lacak_stok && b.stok <= b.stok_minimum)
      .sort((a, b) => a.stok - b.stok);
  }, [data.barang]);

  const teksDaftarBelanja = useMemo(() => {
    const header = `*Daftar Belanja Toko Kelontong Nek Upik*\nTanggal: ${new Date().toLocaleDateString('id-ID')}\n\n`;
    const isi = perluBelanja
      .map(
        (b, idx) =>
          `${idx + 1}. ${b.nama} (sisa ${b.stok} ${b.satuan}, min ${b.stok_minimum})`
      )
      .join('\n');
    return header + isi;
  }, [perluBelanja]);

  const bukaModalStok = (b: Barang, mode: 'MASUK' | 'OPNAME') => {
    setBarangDipilih(b);
    setModeAksi(mode);
    setNilaiInput(mode === 'MASUK' ? '' : String(b.stok));
    setHargaBeliInput(String(b.harga_beli));
    setKeterangan(mode === 'MASUK' ? 'Barang masuk dari pemasok' : ALASAN_OPNAME[0]);
  };

  const tanganiSimpanStok = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barangDipilih) return;

    const angka = Number(nilaiInput);
    if (!Number.isFinite(angka)) {
      onToast('error', 'Masukkan jumlah angka yang valid.');
      return;
    }

    try {
      onUbahStok({
        barang_id: barangDipilih.id,
        mode: modeAksi,
        nilai: angka,
        harga_beli_baru:
          modeAksi === 'MASUK' && hargaBeliInput !== ''
            ? Math.max(0, Number(hargaBeliInput) || 0)
            : undefined,
        keterangan,
      });
      setBarangDipilih(null);
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Gagal memperbarui stok.');
    }
  };

  const salinDaftarBelanja = async () => {
    try {
      await navigator.clipboard.writeText(teksDaftarBelanja);
      onToast('sukses', 'Daftar belanja disalin ke papan klip.');
    } catch {
      onToast('error', 'Tidak dapat menyalin teks otomatis.');
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Stok Barang
        </h1>
        <p className="text-base text-slate-600 dark:text-slate-400">
          Pantau sisa stok, catat barang masuk, penyesuaian, dan daftar belanja
        </p>
      </div>

      {/* Tab Segmented */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-2xl">
        <button
          type="button"
          onClick={() => setTab('daftar')}
          className={`min-h-[44px] rounded-xl text-sm sm:text-base font-bold transition ${
            tab === 'daftar'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Daftar Stok
        </button>
        <button
          type="button"
          onClick={() => setTab('belanja')}
          className={`min-h-[44px] rounded-xl text-sm sm:text-base font-bold transition ${
            tab === 'belanja'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Perlu Belanja ({perluBelanja.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('riwayat')}
          className={`min-h-[44px] rounded-xl text-sm sm:text-base font-bold transition ${
            tab === 'riwayat'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Riwayat
        </button>
      </div>

      {tab === 'daftar' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Cari nama barang..."
              className="w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-11 pr-4 text-base"
            />
          </div>

          <div className="space-y-2.5">
            {barangTerlacak.map((b) => {
              const habis = b.lacak_stok && b.stok <= 0;
              const menipis = b.lacak_stok && b.stok > 0 && b.stok <= b.stok_minimum;

              return (
                <div
                  key={b.id}
                  className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {!b.lacak_stok ? (
                        <CheckCircle2 className="w-5 h-5 text-slate-400 shrink-0" />
                      ) : habis ? (
                        <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                      ) : menipis ? (
                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                      )}
                      <p className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                        {b.nama}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 pl-7">
                      {!b.lacak_stok ? (
                        'Tidak lacak stok (porsi)'
                      ) : (
                        <>
                          <span
                            className={`font-bold ${
                              habis
                                ? 'text-rose-700 dark:text-rose-400'
                                : menipis
                                  ? 'text-amber-700 dark:text-amber-400'
                                  : 'text-emerald-700 dark:text-emerald-400'
                            }`}
                          >
                            {habis ? 'Habis' : menipis ? 'Menipis' : 'Aman'}
                          </span>
                          {' · '}
                          Sisa{' '}
                          <span className="font-mono-num font-bold text-slate-900 dark:text-slate-100">
                            {b.stok} {b.satuan}
                          </span>
                          {' · '}
                          Min <span className="font-mono-num">{b.stok_minimum}</span>
                        </>
                      )}
                    </p>
                  </div>

                  {b.lacak_stok && bisaUbah && (
                    <div className="flex items-center gap-2 pl-7 sm:pl-0 shrink-0">
                      <button
                        type="button"
                        onClick={() => bukaModalStok(b, 'MASUK')}
                        className="min-h-[44px] px-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold flex items-center gap-1.5"
                      >
                        <PackagePlus className="w-4 h-4" />
                        <span>Tambah</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => bukaModalStok(b, 'OPNAME')}
                        className="min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5"
                      >
                        <SlidersHorizontal className="w-4 h-4" />
                        <span>Opname</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'belanja' && (
        <div className="space-y-4">
          {perluBelanja.length === 0 ? (
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-700 mx-auto mb-2" />
              <p className="text-lg font-bold">Semua stok barang aman</p>
              <p className="text-base text-slate-500 dark:text-slate-400 mt-1">
                Belum ada barang yang perlu dibeli ulang saat ini.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-base font-medium text-slate-700 dark:text-slate-300">
                  Bagikan daftar belanja ini ke Satri atau grup keluarga lewat WhatsApp.
                </p>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={salinDaftarBelanja}
                    className="min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-base font-semibold flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Salin</span>
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(teksDaftarBelanja)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[48px] px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-base font-bold flex items-center gap-2"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>Kirim ke WhatsApp</span>
                  </a>
                </div>
              </div>

              <div className="space-y-2.5">
                {perluBelanja.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {b.nama}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Harga modal terakhir: <span className="font-mono-num">{formatRupiah(b.harga_beli)}</span>/{b.satuan}
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
                        Sisa {b.stok} {b.satuan}
                      </p>
                      <p className="text-xs text-slate-500 font-mono-num">
                        Min {b.stok_minimum}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'riwayat' && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
          {data.pergerakan_stok.length === 0 ? (
            <div className="p-10 text-center text-slate-500">
              <History className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-base font-semibold">Belum ada riwayat pergerakan stok</p>
            </div>
          ) : (
            data.pergerakan_stok.slice(0, 60).map((log) => (
              <div key={log.id} className="p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {log.nama_barang}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                    {log.jenis} · {log.keterangan}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {formatTanggalJamWIB(log.tanggal_waktu)} · Oleh {log.oleh}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={`text-base font-bold font-mono-num ${
                      log.jumlah > 0
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : log.jumlah < 0
                          ? 'text-rose-700 dark:text-rose-400'
                          : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {log.jumlah > 0 ? `+${log.jumlah}` : log.jumlah}
                  </p>
                  <p className="text-xs text-slate-500 font-mono-num">
                    {log.stok_sebelum} → {log.stok_sesudah}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal Tambah Stok / Opname */}
      {barangDipilih && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {modeAksi === 'MASUK' ? 'Tambah Stok Masuk' : 'Penyesuaian / Stok Opname'}
              </h2>
              <button
                type="button"
                onClick={() => setBarangDipilih(null)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={tanganiSimpanStok} className="mt-4 space-y-4">
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3.5">
                <p className="text-base font-bold">{barangDipilih.nama}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-mono-num">
                  Stok tercatat saat ini: {barangDipilih.stok} {barangDipilih.satuan}
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">
                  {modeAksi === 'MASUK'
                    ? `Jumlah Barang Masuk (${barangDipilih.satuan}) *`
                    : `Jumlah Stok Fisik Sebenarnya (${barangDipilih.satuan}) *`}
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={modeAksi === 'MASUK' ? 1 : 0}
                  required
                  value={nilaiInput}
                  onChange={(e) => setNilaiInput(e.target.value)}
                  placeholder={modeAksi === 'MASUK' ? 'Contoh: 12' : String(barangDipilih.stok)}
                  className="w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 text-lg font-bold font-mono-num"
                />
              </div>

              {modeAksi === 'MASUK' && (
                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Harga Beli per {barangDipilih.satuan} (Rp)
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={hargaBeliInput}
                    onChange={(e) => setHargaBeliInput(e.target.value)}
                    className="w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 text-base font-mono-num"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-1">
                  {modeAksi === 'MASUK' ? 'Keterangan *' : 'Alasan Penyesuaian *'}
                </label>
                {modeAksi === 'OPNAME' && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {ALASAN_OPNAME.map((al) => (
                      <button
                        key={al}
                        type="button"
                        onClick={() => setKeterangan(al)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                          keterangan === al
                            ? 'bg-emerald-700 text-white border-emerald-700'
                            : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {al}
                      </button>
                    ))}
                  </div>
                )}
                <input
                  type="text"
                  required
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="Tulis keterangan atau alasan..."
                  className="w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 text-base"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setBarangDipilih(null)}
                  className="flex-1 min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 text-base font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 min-h-[48px] rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-base font-bold"
                >
                  Simpan Stok
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
