import React, { useMemo, useRef, useState } from 'react';
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  Upload,
  Download,
  X,
  ImagePlus,
  Boxes,
} from 'lucide-react';
import {
  AppData,
  Barang,
  HalamanAktif,
  KATEGORI_BARANG,
  PeranPengguna,
  SATUAN_BARANG,
} from '../types/pos';
import {
  buatCSV,
  buatId,
  formatRupiah,
  kompresGambarFile,
  parseCSV,
  unduhFile,
} from '../utils/format';
import { ConfirmModal } from '../components/ConfirmModal';

interface BarangPageProps {
  data: AppData;
  peranAktif: PeranPengguna;
  onSimpanBarang: (barang: Barang, adalahBaru: boolean) => void;
  onHapusBarang: (id: string) => void;
  onImporBarang: (barangBaru: Barang[]) => void;
  onPindahHalaman: (halaman: HalamanAktif) => void;
  onToast: (jenis: 'sukses' | 'error' | 'info', pesan: string) => void;
}

interface FormBarangState {
  id?: string;
  nama: string;
  kategori: string;
  harga_jual: string;
  harga_beli: string;
  stok: string;
  satuan: string;
  stok_minimum: string;
  lacak_stok: boolean;
  aktif: boolean;
  foto?: string;
}

const FORM_KOSONG: FormBarangState = {
  nama: '',
  kategori: KATEGORI_BARANG[1],
  harga_jual: '',
  harga_beli: '',
  stok: '0',
  satuan: 'pcs',
  stok_minimum: '5',
  lacak_stok: true,
  aktif: true,
  foto: undefined,
};

export const BarangPage: React.FC<BarangPageProps> = ({
  data,
  peranAktif,
  onSimpanBarang,
  onHapusBarang,
  onImporBarang,
  onPindahHalaman,
  onToast,
}) => {
  const [cari, setCari] = useState('');
  const [filterKategori, setFilterKategori] = useState('Semua');
  const [urutkan, setUrutkan] = useState<'nama' | 'stok_sedikit' | 'harga'>('nama');
  const [modalFormTerbuka, setModalFormTerbuka] = useState(false);
  const [form, setForm] = useState<FormBarangState>(FORM_KOSONG);
  const [errorForm, setErrorForm] = useState('');
  const [hapusTarget, setHapusTarget] = useState<Barang | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const bisaUbah = peranAktif === 'pemilik' || peranAktif === 'pengadaan';

  const daftarTampil = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return data.barang
      .filter((b) => {
        if (filterKategori !== 'Semua' && b.kategori !== filterKategori) return false;
        if (q && !b.nama.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        if (urutkan === 'stok_sedikit') {
          const sa = a.lacak_stok ? a.stok : 999999;
          const sb = b.lacak_stok ? b.stok : 999999;
          return sa - sb;
        }
        if (urutkan === 'harga') return b.harga_jual - a.harga_jual;
        return a.nama.localeCompare(b.nama, 'id');
      });
  }, [data.barang, cari, filterKategori, urutkan]);

  const bukaTambah = () => {
    setForm(FORM_KOSONG);
    setErrorForm('');
    setModalFormTerbuka(true);
  };

  const bukaEdit = (b: Barang) => {
    setForm({
      id: b.id,
      nama: b.nama,
      kategori: b.kategori,
      harga_jual: String(b.harga_jual),
      harga_beli: String(b.harga_beli),
      stok: String(b.stok),
      satuan: b.satuan,
      stok_minimum: String(b.stok_minimum),
      lacak_stok: b.lacak_stok,
      aktif: b.aktif,
      foto: b.foto,
    });
    setErrorForm('');
    setModalFormTerbuka(true);
  };

  const tanganiUploadFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await kompresGambarFile(file, 360, 0.72);
      setForm((prev) => ({ ...prev, foto: compressed }));
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Gagal memproses foto.');
    }
  };

  const tanganiSimpan = (e: React.FormEvent) => {
    e.preventDefault();
    const namaBersih = form.nama.trim();
    if (!namaBersih) {
      setErrorForm('Nama barang wajib diisi.');
      return;
    }
    const hargaJual = Number(form.harga_jual);
    const hargaBeli = Number(form.harga_beli || '0');
    const stok = Number(form.stok || '0');
    const stokMin = Number(form.stok_minimum || '0');

    if (!Number.isFinite(hargaJual) || hargaJual < 0) {
      setErrorForm('Harga jual harus berupa angka 0 atau lebih.');
      return;
    }
    if (!Number.isFinite(hargaBeli) || hargaBeli < 0) {
      setErrorForm('Harga beli harus berupa angka 0 atau lebih.');
      return;
    }
    if (!Number.isFinite(stok) || stok < 0) {
      setErrorForm('Stok tidak boleh kurang dari 0.');
      return;
    }

    const adalahBaru = !form.id;
    const itemBaru: Barang = {
      id: form.id || buatId('brg'),
      nama: namaBersih,
      kategori: form.kategori,
      harga_jual: Math.round(hargaJual),
      harga_beli: Math.round(hargaBeli),
      stok: form.lacak_stok ? Math.round(stok) : 0,
      satuan: form.satuan.trim() || 'pcs',
      stok_minimum: form.lacak_stok ? Math.max(0, Math.round(stokMin)) : 0,
      lacak_stok: form.lacak_stok,
      aktif: form.aktif,
      foto: form.foto,
      dibuat_pada: new Date().toISOString(),
    };

    onSimpanBarang(itemBaru, adalahBaru);
    setModalFormTerbuka(false);
  };

  const tanganiEksporCSV = () => {
    const headers = ['nama', 'kategori', 'harga_jual', 'harga_beli', 'stok', 'satuan', 'stok_minimum', 'lacak_stok', 'aktif'];
    const rows = data.barang.map((b) => [
      b.nama,
      b.kategori,
      b.harga_jual,
      b.harga_beli,
      b.stok,
      b.satuan,
      b.stok_minimum,
      b.lacak_stok ? 'ya' : 'tidak',
      b.aktif ? 'ya' : 'tidak',
    ]);
    const csv = buatCSV(headers, rows);
    unduhFile('daftar-barang-nek-upik.csv', csv, 'text/csv;charset=utf-8');
    onToast('sukses', `${data.barang.length} barang berhasil diekspor ke CSV.`);
  };

  const tanganiImporCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const teks = await file.text();
      const baris = parseCSV(teks);
      if (baris.length < 2) {
        onToast('error', 'File CSV kosong atau hanya berisi judul kolom.');
        return;
      }

      const header = baris[0].map((h) => h.toLowerCase().trim());
      const idxNama = header.indexOf('nama');
      const idxKat = header.indexOf('kategori');
      const idxJual = header.indexOf('harga_jual');
      const idxBeli = header.indexOf('harga_beli');
      const idxStok = header.indexOf('stok');
      const idxSat = header.indexOf('satuan');
      const idxMin = header.indexOf('stok_minimum');

      if (idxNama === -1 || idxJual === -1) {
        onToast('error', 'Kolom CSV wajib memiliki minimal kolom "nama" dan "harga_jual".');
        return;
      }

      const hasil: Barang[] = [];
      for (let i = 1; i < baris.length; i++) {
        const col = baris[i];
        const nama = (col[idxNama] || '').trim();
        if (!nama) continue;
        const hargaJual = Math.max(0, Number(col[idxJual] || 0) || 0);
        const hargaBeli = idxBeli >= 0 ? Math.max(0, Number(col[idxBeli] || 0) || 0) : 0;
        const stok = idxStok >= 0 ? Math.max(0, Number(col[idxStok] || 0) || 0) : 0;
        const satuan = idxSat >= 0 && col[idxSat] ? col[idxSat].trim() : 'pcs';
        const stokMin = idxMin >= 0 ? Math.max(0, Number(col[idxMin] || 5) || 0) : 5;
        const kategori =
          idxKat >= 0 && col[idxKat] ? col[idxKat].trim() : 'Kebutuhan Harian Lain';

        hasil.push({
          id: buatId('brg'),
          nama,
          kategori,
          harga_jual: Math.round(hargaJual),
          harga_beli: Math.round(hargaBeli),
          stok: Math.round(stok),
          satuan,
          stok_minimum: Math.round(stokMin),
          lacak_stok: satuan.toLowerCase() !== 'porsi',
          aktif: true,
          dibuat_pada: new Date().toISOString(),
        });
      }

      if (hasil.length === 0) {
        onToast('error', 'Tidak ada baris barang yang valid di file CSV.');
        return;
      }

      onImporBarang(hasil);
    } catch {
      onToast('error', 'Gagal membaca file CSV. Pastikan format file benar.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & Aksi Utama */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Data Barang
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-400">
            Total {data.barang.length} barang terdaftar
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onPindahHalaman('stok')}
            className="min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-base font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
          >
            <Boxes className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            <span>Stok Barang</span>
          </button>

          {bisaUbah && (
            <button
              type="button"
              onClick={bukaTambah}
              className="min-h-[48px] px-5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-base font-bold flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span>+ Barang</span>
            </button>
          )}
        </div>
      </div>

      {/* Impor & Ekspor CSV */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-snug">
          Punya banyak barang? Impor sekaligus dari file CSV (kolom: nama, kategori, harga_jual, harga_beli, stok, satuan, stok_minimum).
        </p>
        <div className="flex items-center gap-2 shrink-0">
          {bisaUbah && (
            <>
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={tanganiImporCSV}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => csvInputRef.current?.click()}
                className="min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5"
              >
                <Upload className="w-4 h-4" />
                <span>Impor CSV</span>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={tanganiEksporCSV}
            className="min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* Pencarian, Filter Kategori, & Urutan */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-5 relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari nama barang..."
            className="w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-11 pr-4 text-base text-slate-900 dark:text-slate-100"
          />
        </div>
        <div className="sm:col-span-4">
          <select
            value={filterKategori}
            onChange={(e) => setFilterKategori(e.target.value)}
            aria-label="Filter kategori"
            className="w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-base text-slate-900 dark:text-slate-100"
          >
            <option value="Semua">Semua Kategori</option>
            {KATEGORI_BARANG.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-3">
          <select
            value={urutkan}
            onChange={(e) => setUrutkan(e.target.value as 'nama' | 'stok_sedikit' | 'harga')}
            aria-label="Urutkan barang"
            className="w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-base text-slate-900 dark:text-slate-100"
          >
            <option value="nama">Urut: Nama A-Z</option>
            <option value="stok_sedikit">Urut: Stok Paling Sedikit</option>
            <option value="harga">Urut: Harga Tertinggi</option>
          </select>
        </div>
      </div>

      {/* Daftar Barang */}
      {daftarTampil.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 text-center">
          <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
            Belum ada barang yang cocok
          </p>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">
            Ubah kata kunci pencarian atau tambah barang baru.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {daftarTampil.map((b) => (
            <div
              key={b.id}
              className={`rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between gap-3 ${
                !b.aktif ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {b.foto && (
                  <img
                    src={b.foto}
                    alt={b.nama}
                    className="w-14 h-14 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <p className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                    {b.nama}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                    {b.kategori} {!b.aktif ? '· Nonaktif' : ''}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 text-sm">
                    <span className="font-bold font-mono-num text-emerald-700 dark:text-emerald-400">
                      Jual {formatRupiah(b.harga_jual)}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-600 dark:text-slate-400 font-mono-num">
                      Modal {formatRupiah(b.harga_beli)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400 tabular-nums">
                    {b.lacak_stok
                      ? `Stok: ${b.stok} ${b.satuan} (min ${b.stok_minimum})`
                      : `Satuan ${b.satuan} · Tidak lacak stok`}
                  </p>
                </div>
              </div>

              {bisaUbah && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => bukaEdit(b)}
                    aria-label={`Ubah ${b.nama}`}
                    className="min-h-[44px] min-w-[44px] rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  {peranAktif === 'pemilik' && (
                    <button
                      type="button"
                      onClick={() => setHapusTarget(b)}
                      aria-label={`Hapus ${b.nama}`}
                      className="min-h-[44px] min-w-[44px] rounded-xl border border-rose-200 dark:border-rose-900 flex items-center justify-center text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Tambah / Ubah Barang */}
      {modalFormTerbuka && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto">
          <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {form.id ? 'Ubah Data Barang' : 'Tambah Barang Baru'}
              </h2>
              <button
                type="button"
                onClick={() => setModalFormTerbuka(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={tanganiSimpan} className="mt-4 space-y-4">
              {errorForm && (
                <div className="rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 p-3 text-sm font-semibold text-rose-700 dark:text-rose-300">
                  {errorForm}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Nama Barang *
                </label>
                <input
                  type="text"
                  required
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  placeholder="Contoh: Gado-gado Nek Upik"
                  className="w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 text-base"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    Kategori
                  </label>
                  <select
                    value={form.kategori}
                    onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                    className="w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-base"
                  >
                    {KATEGORI_BARANG.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    Satuan
                  </label>
                  <select
                    value={form.satuan}
                    onChange={(e) => setForm({ ...form, satuan: e.target.value })}
                    className="w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-base"
                  >
                    {SATUAN_BARANG.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    Harga Jual (Rp) *
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    required
                    value={form.harga_jual}
                    onChange={(e) => setForm({ ...form, harga_jual: e.target.value })}
                    placeholder="5000"
                    className="w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 text-base font-mono-num"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    Harga Beli / Modal (Rp)
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={form.harga_beli}
                    onChange={(e) => setForm({ ...form, harga_beli: e.target.value })}
                    placeholder="3500"
                    className="w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 text-base font-mono-num"
                  />
                </div>
              </div>

              {/* Opsi Tidak Lacak Stok */}
              <label className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!form.lacak_stok}
                  onChange={(e) => setForm({ ...form, lacak_stok: !e.target.checked })}
                  className="mt-1 w-5 h-5 accent-emerald-700"
                />
                <div>
                  <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    Tidak lacak stok (khusus makanan porsi seperti gado-gado)
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Barang bisa dijual terus tanpa mengurangi angka stok.
                  </p>
                </div>
              </label>

              {form.lacak_stok && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                      Stok Saat Ini
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={form.stok}
                      onChange={(e) => setForm({ ...form, stok: e.target.value })}
                      className="w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 text-base font-mono-num"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                      Batas Stok Minimum
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={form.stok_minimum}
                      onChange={(e) => setForm({ ...form, stok_minimum: e.target.value })}
                      className="w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 text-base font-mono-num"
                    />
                  </div>
                </div>
              )}

              {/* Foto Opsional & Status Aktif */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <label className="min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 flex items-center gap-2 text-sm font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                  <ImagePlus className="w-4 h-4" />
                  <span>{form.foto ? 'Ganti Foto Barang' : 'Unggah Foto (Opsional)'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={tanganiUploadFoto}
                    className="hidden"
                  />
                </label>

                <label className="flex items-center gap-2 text-base font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.aktif}
                    onChange={(e) => setForm({ ...form, aktif: e.target.checked })}
                    className="w-5 h-5 accent-emerald-700"
                  />
                  <span>Barang Aktif Dijual</span>
                </label>
              </div>

              {form.foto && (
                <div className="flex items-center gap-3">
                  <img
                    src={form.foto}
                    alt="Pratinjau barang"
                    className="w-16 h-16 rounded-xl object-cover border border-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, foto: undefined })}
                    className="text-sm font-semibold text-rose-600 hover:underline"
                  >
                    Hapus Foto
                  </button>
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setModalFormTerbuka(false)}
                  className="flex-1 min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 text-base font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 min-h-[48px] rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-base font-bold"
                >
                  Simpan Barang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        terbuka={!!hapusTarget}
        judul="Hapus Barang?"
        pesan={`Barang "${hapusTarget?.nama}" akan dihapus dari daftar. Riwayat transaksi lama tetap tersimpan.`}
        labelKonfirmasi="Hapus Barang"
        bahaya
        onTutup={() => setHapusTarget(null)}
        onKonfirmasi={() => {
          if (hapusTarget) onHapusBarang(hapusTarget.id);
          setHapusTarget(null);
        }}
      />
    </div>
  );
};
