import React, { useRef, useState } from 'react';
import {
  Save,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  Moon,
  Sun,
  Type,
  ImagePlus,
  HardDrive,
} from 'lucide-react';
import { AppData, Pengaturan, PeranPengguna } from '../types/pos';
import { DEFAULT_QRIS_IMAGE } from '../data/seedData';
import { formatTanggalJamWIB, getTanggalWIB, kompresGambarFile, unduhFile } from '../utils/format';
import { validasiJsonBackup } from '../services/repository';
import { ConfirmModal } from '../components/ConfirmModal';
import { PWAInstallButton } from '../components/PWAControls';

interface PengaturanPageProps {
  data: AppData;
  peranAktif: PeranPengguna;
  onSimpanPengaturan: (pengaturan: Pengaturan) => void;
  onCatatBackup: () => void;
  onPulihkanData: (dataBaru: AppData) => void;
  onResetKeDemo: () => void;
  onKosongkanData: () => void;
  onToast: (jenis: 'sukses' | 'error' | 'info', pesan: string) => void;
}

export const PengaturanPage: React.FC<PengaturanPageProps> = ({
  data,
  peranAktif,
  onSimpanPengaturan,
  onCatatBackup,
  onPulihkanData,
  onResetKeDemo,
  onKosongkanData,
  onToast,
}) => {
  const [namaToko, setNamaToko] = useState(data.pengaturan.profil_usaha.nama_toko);
  const [alamat, setAlamat] = useState(data.pengaturan.profil_usaha.alamat);
  const [telepon, setTelepon] = useState(data.pengaturan.profil_usaha.telepon);
  const [pesanStruk, setPesanStruk] = useState(data.pengaturan.profil_usaha.pesan_struk);
  const [namaMerchantQris, setNamaMerchantQris] = useState(data.pengaturan.nama_merchant_qris);
  const [gambarQris, setGambarQris] = useState(data.pengaturan.gambar_qris);
  const [pinPemilik, setPinPemilik] = useState(data.pengaturan.pin_pengguna.pemilik);
  const [pinKasir, setPinKasir] = useState(data.pengaturan.pin_pengguna.kasir);
  const [pinPengadaan, setPinPengadaan] = useState(data.pengaturan.pin_pengguna.pengadaan);

  const [kandidatRestore, setKandidatRestore] = useState<AppData | null>(null);
  const [konfirmasiResetDemo, setKonfirmasiResetDemo] = useState(false);
  const [konfirmasiKosongkan, setKonfirmasiKosongkan] = useState(false);

  const fileRestoreRef = useRef<HTMLInputElement>(null);

  const tanganiSimpanProfil = (e: React.FormEvent) => {
    e.preventDefault();
    const validPin = (p: string) => /^\d{4}$/.test(p);
    if (!validPin(pinPemilik) || !validPin(pinKasir) || !validPin(pinPengadaan)) {
      onToast('error', 'Semua PIN pengguna harus berupa tepat 4 angka.');
      return;
    }

    onSimpanPengaturan({
      ...data.pengaturan,
      profil_usaha: {
        nama_toko: namaToko.trim() || 'Toko Kelontong Nek Upik',
        alamat: alamat.trim(),
        telepon: telepon.trim(),
        pesan_struk: pesanStruk.trim(),
      },
      nama_merchant_qris: namaMerchantQris.trim(),
      gambar_qris: gambarQris,
      pin_pengguna: {
        pemilik: pinPemilik,
        kasir: pinKasir,
        pengadaan: pinPengadaan,
      },
    });
  };

  const tanganiUploadQris = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await kompresGambarFile(file, 700, 0.85);
      setGambarQris(url);
      onToast('info', 'Gambar QRIS baru siap. Jangan lupa tekan "Simpan Pengaturan".');
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'Gagal membaca gambar QRIS.');
    }
  };

  const tanganiBackup = () => {
    const payload = {
      aplikasi: 'Kasir Digital Toko Kelontong Nek Upik',
      versi: '1.0',
      dibuat_pada: new Date().toISOString(),
      data,
    };
    const json = JSON.stringify(payload, null, 2);
    unduhFile(`cadangan-kasir-nek-upik-${getTanggalWIB()}.json`, json, 'application/json');
    onCatatBackup();
  };

  const tanganiPilihRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = validasiJsonBackup(text);
      setKandidatRestore(parsed);
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'File cadangan tidak valid.');
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Pengaturan & Cadangan Data
        </h1>
        <p className="text-base text-slate-600 dark:text-slate-400">
          Atur tampilan, profil toko, gambar QRIS, PIN, dan backup data
        </p>
      </div>

      {/* Peringatan Penyimpanan Perangkat */}
      <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-4 flex items-start gap-3">
        <HardDrive className="w-6 h-6 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed">
          <p className="font-bold text-base">Data Tersimpan di Perangkat Ini</p>
          <p className="mt-0.5">
            Aplikasi berjalan offline agar lancar meski sinyal toko kurang stabil. Lakukan{' '}
            <strong>Cadangkan Data</strong> secara rutin agar data aman bila HP ganti atau rusak.
          </p>
        </div>
      </div>

      {/* Tampilan & Pasang Aplikasi */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <h2 className="text-lg font-bold">Tampilan & Aplikasi di HP</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() =>
              onSimpanPengaturan({
                ...data.pengaturan,
                mode_gelap: !data.pengaturan.mode_gelap,
              })
            }
            className="min-h-[52px] rounded-xl border border-slate-300 dark:border-slate-700 px-4 flex items-center justify-between text-base font-semibold"
          >
            <span className="flex items-center gap-2">
              {data.pengaturan.mode_gelap ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              <span>Mode Gelap</span>
            </span>
            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
              {data.pengaturan.mode_gelap ? 'Aktif' : 'Mati'}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              onSimpanPengaturan({
                ...data.pengaturan,
                ukuran_huruf: data.pengaturan.ukuran_huruf === 'normal' ? 'besar' : 'normal',
              })
            }
            className="min-h-[52px] rounded-xl border border-slate-300 dark:border-slate-700 px-4 flex items-center justify-between text-base font-semibold"
          >
            <span className="flex items-center gap-2">
              <Type className="w-5 h-5" />
              <span>Ukuran Huruf</span>
            </span>
            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
              {data.pengaturan.ukuran_huruf === 'besar' ? 'Besar (Lansia)' : 'Normal'}
            </span>
          </button>
        </div>

        <PWAInstallButton penuh />
      </div>

      {/* Backup & Restore (Khusus Pemilik) */}
      {peranAktif === 'pemilik' && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div>
            <h2 className="text-lg font-bold">Cadangkan & Pulihkan Data</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Backup terakhir:{' '}
              <strong>
                {data.pengaturan.tanggal_backup_terakhir
                  ? formatTanggalJamWIB(data.pengaturan.tanggal_backup_terakhir)
                  : 'Belum pernah'}
              </strong>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={tanganiBackup}
              className="min-h-[52px] rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-base font-bold flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              <span>Cadangkan Data (JSON)</span>
            </button>

            <input
              ref={fileRestoreRef}
              type="file"
              accept=".json,application/json"
              onChange={tanganiPilihRestore}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRestoreRef.current?.click()}
              className="min-h-[52px] rounded-xl border border-slate-300 dark:border-slate-700 text-base font-bold flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Upload className="w-5 h-5" />
              <span>Pulihkan Data (JSON)</span>
            </button>
          </div>
        </div>
      )}

      {/* Profil Usaha, QRIS & PIN (Khusus Pemilik) */}
      {peranAktif === 'pemilik' && (
        <form
          onSubmit={tanganiSimpanProfil}
          className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4"
        >
          <h2 className="text-lg font-bold">Profil Usaha, QRIS & PIN</h2>

          <div>
            <label className="block text-sm font-semibold mb-1">Nama Toko</label>
            <input
              type="text"
              value={namaToko}
              onChange={(e) => setNamaToko(e.target.value)}
              className="w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 text-base"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Alamat Toko</label>
            <input
              type="text"
              value={alamat}
              onChange={(e) => setAlamat(e.target.value)}
              className="w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 text-base"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-1">Nomor HP / WhatsApp</label>
              <input
                type="text"
                value={telepon}
                onChange={(e) => setTelepon(e.target.value)}
                className="w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 text-base font-mono-num"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Nama Merchant QRIS</label>
              <input
                type="text"
                value={namaMerchantQris}
                onChange={(e) => setNamaMerchantQris(e.target.value)}
                className="w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 text-base"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Pesan di Bawah Struk</label>
            <input
              type="text"
              value={pesanStruk}
              onChange={(e) => setPesanStruk(e.target.value)}
              className="w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 text-base"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-1">
            {gambarQris && (
              <img
                src={gambarQris}
                alt="QRIS Toko"
                className="w-20 h-20 object-contain rounded-xl border border-slate-200 bg-white p-1"
              />
            )}
            <label className="min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 flex items-center gap-2 text-base font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
              <ImagePlus className="w-5 h-5" />
              <span>Unggah / Ganti Gambar QRIS</span>
              <input
                type="file"
                accept="image/*"
                onChange={tanganiUploadQris}
                className="hidden"
              />
            </label>
            {gambarQris !== DEFAULT_QRIS_IMAGE && (
              <button
                type="button"
                onClick={() => setGambarQris(DEFAULT_QRIS_IMAGE)}
                className="min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Pakai QRIS Bawaan Toko
              </button>
            )}
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
            <p className="text-base font-bold mb-2">PIN Pengguna (4 Angka)</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Nek Upik (Pemilik)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={pinPemilik}
                  onChange={(e) => setPinPemilik(e.target.value.replace(/\D/g, ''))}
                  className="w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 text-base font-mono-num"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tante Meli (Kasir)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={pinKasir}
                  onChange={(e) => setPinKasir(e.target.value.replace(/\D/g, ''))}
                  className="w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 text-base font-mono-num"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Satria (Pengadaan)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={pinPengadaan}
                  onChange={(e) => setPinPengadaan(e.target.value.replace(/\D/g, ''))}
                  className="w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 text-base font-mono-num"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full min-h-[52px] rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-base font-bold flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            <span>Simpan Pengaturan</span>
          </button>
        </form>
      )}

      {/* Reset Data Demo (Khusus Pemilik) */}
      {peranAktif === 'pemilik' && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900 p-5 space-y-3">
          <h2 className="text-lg font-bold text-rose-700 dark:text-rose-400">
            Kelola Data Demo & Reset
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Gunakan menu ini hanya bila ingin mengulang data contoh untuk latihan atau menghapus data contoh sebelum dipakai jualan asli.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => setKonfirmasiResetDemo(true)}
              className="min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 px-4 text-base font-semibold flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <RotateCcw className="w-5 h-5" />
              <span>Muat Ulang Data Contoh</span>
            </button>
            <button
              type="button"
              onClick={() => setKonfirmasiKosongkan(true)}
              className="min-h-[48px] rounded-xl border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400 px-4 text-base font-semibold flex items-center justify-center gap-2 hover:bg-rose-50 dark:hover:bg-rose-950/40"
            >
              <Trash2 className="w-5 h-5" />
              <span>Hapus Semua Data (Mulai Bersih)</span>
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        terbuka={!!kandidatRestore}
        judul="Pulihkan Data dari Cadangan?"
        pesan={`File cadangan berisi ${kandidatRestore?.barang.length ?? 0} barang dan ${kandidatRestore?.transaksi.length ?? 0} transaksi. Data yang ada saat ini di HP akan diganti dengan isi file cadangan tersebut.`}
        labelKonfirmasi="Ya, Pulihkan Data"
        bahaya
        onTutup={() => setKandidatRestore(null)}
        onKonfirmasi={() => {
          if (kandidatRestore) onPulihkanData(kandidatRestore);
          setKandidatRestore(null);
        }}
      />

      <ConfirmModal
        terbuka={konfirmasiResetDemo}
        judul="Muat Ulang Data Contoh?"
        pesan="Seluruh data saat ini akan diganti kembali dengan data contoh demo Toko Kelontong Nek Upik."
        labelKonfirmasi="Muat Ulang Demo"
        bahaya
        konfirmasiGanda
        onTutup={() => setKonfirmasiResetDemo(false)}
        onKonfirmasi={() => {
          setKonfirmasiResetDemo(false);
          onResetKeDemo();
        }}
      />

      <ConfirmModal
        terbuka={konfirmasiKosongkan}
        judul="Hapus Semua Data?"
        pesan="Semua data contoh, barang, transaksi, dan catatan keuangan akan dihapus hingga kosong agar Anda bisa mengisi barang asli toko."
        labelKonfirmasi="Hapus Semua Data"
        bahaya
        konfirmasiGanda
        onTutup={() => setKonfirmasiKosongkan(false)}
        onKonfirmasi={() => {
          setKonfirmasiKosongkan(false);
          onKosongkanData();
        }}
      />
    </div>
  );
};
