import React, { useCallback, useEffect, useState } from 'react';
import {
  ShoppingBag,
  Package,
  Wallet,
  BarChart3,
  Menu,
  LayoutDashboard,
  Boxes,
  QrCode,
  Settings,
  BookOpen,
  Info,
  Store,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';
import {
  AppData,
  Barang,
  DAFTAR_PROFIL,
  HalamanAktif,
  ItemBelanjaStok,
  ItemTransaksi,
  KategoriPengeluaran,
  KeranjangTersimpan,
  MetodeBayar,
  Pengaturan,
  Pengeluaran,
  PeranPengguna,
  Transaksi,
} from './types/pos';
import { posRepository } from './services/repository';
import {
  batalkanTransaksiAtomik,
  catatPengeluaranAtomik,
  hapusPengeluaranAtomik,
  prosesPenjualanAtomik,
  ubahStokAtomik,
} from './services/posEngine';
import { buatId, getTanggalWIB } from './utils/format';
import { ToastContainer, ToastItem } from './components/Toast';
import { ProfileLockModal } from './components/ProfileLockModal';
import { StrukModal } from './components/StrukModal';
import { OfflineBanner, PWAInstallButton } from './components/PWAControls';
import { DashboardPage } from './pages/DashboardPage';
import { KasirPage } from './pages/KasirPage';
import { BarangPage } from './pages/BarangPage';
import { StokPage } from './pages/StokPage';
import { KeuanganPage } from './pages/KeuanganPage';
import { LaporanPage } from './pages/LaporanPage';
import { QrisPage } from './pages/QrisPage';
import { PengaturanPage } from './pages/PengaturanPage';
import { LainnyaPage, PanduanPage, TentangPage } from './pages/LainnyaDanPanduanPage';

const SESSION_PERAN_KEY = 'kasir_nek_upik_peran_aktif';

export default function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [errorMuat, setErrorMuat] = useState<string | null>(null);

  const [peranAktif, setPeranAktif] = useState<PeranPengguna | null>(() => {
    const tersimpan = window.sessionStorage.getItem(SESSION_PERAN_KEY);
    if (tersimpan === 'pemilik' || tersimpan === 'kasir' || tersimpan === 'pengadaan') {
      return tersimpan;
    }
    return null;
  });
  const [modalGantiProfil, setModalGantiProfil] = useState(false);

  const [halaman, setHalaman] = useState<HalamanAktif>('dashboard');
  const [keuanganTabAwal, setKeuanganTabAwal] = useState<'pemasukan' | 'pengeluaran'>('pemasukan');
  const [bukaModalPengeluaran, setBukaModalPengeluaran] = useState(false);

  const [strukAktif, setStrukAktif] = useState<Transaksi | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const tambahToast = useCallback((jenis: ToastItem['jenis'], pesan: string) => {
    const id = buatId('tst');
    setToasts((prev) => [...prev, { id, jenis, pesan }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  const hapusToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Muat data awal dari IndexedDB / localStorage
  useEffect(() => {
    let aktif = true;
    posRepository
      .muatData()
      .then((hasil) => {
        if (!aktif) return;
        setData(hasil);
        setMemuat(false);
      })
      .catch((err) => {
        if (!aktif) return;
        setErrorMuat(err instanceof Error ? err.message : 'Gagal memuat data aplikasi.');
        setMemuat(false);
      });
    return () => {
      aktif = false;
    };
  }, []);

  // Sinkronkan mode gelap dan ukuran huruf ke <html>
  useEffect(() => {
    if (!data) return;
    const html = document.documentElement;
    if (data.pengaturan.mode_gelap) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
    if (data.pengaturan.ukuran_huruf === 'besar') {
      html.classList.add('font-besar');
    } else {
      html.classList.remove('font-besar');
    }
  }, [data?.pengaturan.mode_gelap, data?.pengaturan.ukuran_huruf]);

  const simpanState = useCallback(
    async (dataBaru: AppData, pesanSukses?: string) => {
      setData(dataBaru);
      try {
        await posRepository.simpanData(dataBaru);
        if (pesanSukses) tambahToast('sukses', pesanSukses);
      } catch (err) {
        tambahToast(
          'error',
          err instanceof Error ? err.message : 'Gagal menyimpan perubahan ke perangkat.'
        );
      }
    },
    [tambahToast]
  );

  const profilAktif = DAFTAR_PROFIL.find((p) => p.id === peranAktif);
  const namaPenggunaAktif = profilAktif?.nama ?? 'Nek Upik';

  const tanganiPilihProfil = (peran: PeranPengguna) => {
    setPeranAktif(peran);
    window.sessionStorage.setItem(SESSION_PERAN_KEY, peran);
    setModalGantiProfil(false);
    const nama = DAFTAR_PROFIL.find((p) => p.id === peran)?.nama ?? peran;
    tambahToast('sukses', `Masuk sebagai ${nama}.`);
    setHalaman('dashboard');
  };

  // Cek hak akses halaman sesuai peran
  const bolehAksesHalaman = (target: HalamanAktif, peran: PeranPengguna): boolean => {
    if (peran === 'pemilik') return true;
    if (peran === 'kasir') {
      return target !== 'laporan';
    }
    // pengadaan (Satria)
    return !['kasir', 'laporan', 'qris'].includes(target);
  };

  // Handler operasi atomik
  const tanganiSelesaikanPenjualan = (params: {
    item: ItemTransaksi[];
    diskon: number;
    metode: MetodeBayar;
    uang_diterima: number;
    catatan: string;
  }) => {
    if (!data) return;
    try {
      const { dataBaru, hasil } = prosesPenjualanAtomik(data, {
        ...params,
        kasir: namaPenggunaAktif,
      });
      void simpanState(dataBaru, `Transaksi ${hasil.nomor} berhasil disimpan.`);
      setStrukAktif(hasil);
    } catch (err) {
      tambahToast('error', err instanceof Error ? err.message : 'Transaksi gagal diproses.');
    }
  };

  const tanganiBatalkanTransaksi = (transaksiId: string, alasan: string) => {
    if (!data || peranAktif !== 'pemilik') return;
    try {
      const { dataBaru, hasil } = batalkanTransaksiAtomik(
        data,
        transaksiId,
        alasan,
        namaPenggunaAktif
      );
      void simpanState(
        dataBaru,
        `Transaksi ${hasil.nomor} dibatalkan. Stok & pemasukan telah dikoreksi.`
      );
      setStrukAktif(hasil);
    } catch (err) {
      tambahToast('error', err instanceof Error ? err.message : 'Gagal membatalkan transaksi.');
    }
  };

  const tanganiSimpanSementara = (
    keranjang: Omit<KeranjangTersimpan, 'id' | 'waktu_simpan'>
  ) => {
    if (!data) return;
    const baru: KeranjangTersimpan = {
      ...keranjang,
      id: buatId('hold'),
      waktu_simpan: new Date().toISOString(),
    };
    void simpanState(
      {
        ...data,
        keranjang_tersimpan: [baru, ...data.keranjang_tersimpan],
      },
      `Pesanan "${baru.label}" disimpan sementara.`
    );
  };

  const tanganiHapusKeranjangTersimpan = (id: string) => {
    if (!data) return;
    void simpanState({
      ...data,
      keranjang_tersimpan: data.keranjang_tersimpan.filter((k) => k.id !== id),
    });
  };

  const tanganiSimpanBarang = (barang: Barang, adalahBaru: boolean) => {
    if (!data) return;
    const daftarBaru = adalahBaru
      ? [barang, ...data.barang]
      : data.barang.map((b) => (b.id === barang.id ? barang : b));
    void simpanState(
      { ...data, barang: daftarBaru },
      adalahBaru ? `Barang "${barang.nama}" ditambahkan.` : `Barang "${barang.nama}" diperbarui.`
    );
  };

  const tanganiHapusBarang = (id: string) => {
    if (!data) return;
    const target = data.barang.find((b) => b.id === id);
    void simpanState(
      { ...data, barang: data.barang.filter((b) => b.id !== id) },
      `Barang "${target?.nama ?? ''}" dihapus.`
    );
  };

  const tanganiImporBarang = (barangBaru: Barang[]) => {
    if (!data) return;
    void simpanState(
      { ...data, barang: [...barangBaru, ...data.barang] },
      `${barangBaru.length} barang berhasil diimpor dari CSV.`
    );
  };

  const tanganiUbahStok = (params: {
    barang_id: string;
    mode: 'MASUK' | 'OPNAME';
    nilai: number;
    harga_beli_baru?: number;
    keterangan: string;
  }) => {
    if (!data) return;
    const { dataBaru, hasil } = ubahStokAtomik(data, {
      ...params,
      oleh: namaPenggunaAktif,
    });
    void simpanState(
      dataBaru,
      `Stok "${hasil.nama}" diperbarui menjadi ${hasil.stok} ${hasil.satuan}.`
    );
  };

  const tanganiTambahPemasukanManual = (input: {
    tanggal: string;
    jumlah: number;
    keterangan: string;
    metode: MetodeBayar;
  }) => {
    if (!data) return;
    const baru = {
      id: buatId('msk'),
      tanggal: input.tanggal || getTanggalWIB(),
      waktu: new Date().toISOString(),
      jumlah: input.jumlah,
      sumber: 'MANUAL' as const,
      keterangan: input.keterangan,
      metode: input.metode,
      status: 'AKTIF' as const,
      dicatat_oleh: namaPenggunaAktif,
    };
    void simpanState(
      { ...data, pemasukan: [baru, ...data.pemasukan] },
      'Pemasukan manual berhasil dicatat.'
    );
  };

  const tanganiCatatPengeluaran = (input: {
    tanggal: string;
    jumlah: number;
    kategori: KategoriPengeluaran;
    keterangan: string;
    dicatat_oleh: string;
    foto_nota?: string;
    terkait_stok?: ItemBelanjaStok[];
  }) => {
    if (!data) return;
    try {
      const { dataBaru } = catatPengeluaranAtomik(data, input);
      void simpanState(
        dataBaru,
        input.terkait_stok?.length
          ? 'Pengeluaran dicatat dan stok barang otomatis bertambah.'
          : 'Pengeluaran berhasil dicatat.'
      );
    } catch (err) {
      tambahToast('error', err instanceof Error ? err.message : 'Gagal mencatat pengeluaran.');
    }
  };

  const tanganiEditPengeluaran = (pengeluaranBaru: Pengeluaran) => {
    if (!data) return;
    void simpanState(
      {
        ...data,
        pengeluaran: data.pengeluaran.map((p) =>
          p.id === pengeluaranBaru.id ? pengeluaranBaru : p
        ),
      },
      'Catatan pengeluaran diperbarui.'
    );
  };

  const tanganiHapusPengeluaran = (id: string) => {
    if (!data) return;
    const dataBaru = hapusPengeluaranAtomik(data, id, namaPenggunaAktif);
    void simpanState(dataBaru, 'Catatan pengeluaran dihapus.');
  };

  const tanganiSimpanPengaturan = (pengaturan: Pengaturan) => {
    if (!data) return;
    void simpanState({ ...data, pengaturan }, 'Pengaturan disimpan.');
  };

  const tanganiCatatBackup = () => {
    if (!data) return;
    void simpanState(
      {
        ...data,
        pengaturan: {
          ...data.pengaturan,
          tanggal_backup_terakhir: new Date().toISOString(),
        },
      },
      'File cadangan JSON berhasil diunduh.'
    );
  };

  const tanganiPulihkanData = (dataPulih: AppData) => {
    void simpanState(dataPulih, 'Data berhasil dipulihkan dari file cadangan.');
  };

  const tanganiResetKeDemo = async () => {
    const baru = await posRepository.resetKeDataContoh();
    setData(baru);
    tambahToast('sukses', 'Data contoh demo berhasil dimuat ulang.');
  };

  const tanganiKosongkanData = async () => {
    const baru = await posRepository.kosongkanSemuaData();
    setData(baru);
    tambahToast('sukses', 'Semua data dihapus. Aplikasi siap diisi data asli toko.');
  };

  if (memuat) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#f6f8f7] dark:bg-[#0b120e]">
        <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center mb-3">
          <Store className="w-6 h-6" />
        </div>
        <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Membuka Kasir Nek Upik...
        </p>
        <p className="text-sm text-slate-500 mt-1">Memuat data toko dari perangkat Anda</p>
      </div>
    );
  }

  if (errorMuat || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <p className="text-lg font-bold text-rose-700">Terjadi Kendala Membuka Data</p>
        <p className="text-base text-slate-600 mt-1">{errorMuat || 'Data tidak tersedia.'}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 min-h-[48px] px-5 rounded-xl bg-emerald-700 text-white font-bold"
        >
          Muat Ulang Halaman
        </button>
      </div>
    );
  }

  const peranSaatIni: PeranPengguna = peranAktif ?? 'pemilik';

  const navDesktop: Array<{
    id: HalamanAktif;
    label: string;
    ikon: React.FC<{ className?: string }>;
  }> = [
    { id: 'dashboard', label: 'Dashboard', ikon: LayoutDashboard },
    { id: 'kasir', label: 'Kasir', ikon: ShoppingBag },
    { id: 'barang', label: 'Data Barang', ikon: Package },
    { id: 'stok', label: 'Stok Barang', ikon: Boxes },
    { id: 'keuangan', label: 'Keuangan', ikon: Wallet },
    { id: 'laporan', label: 'Laporan', ikon: BarChart3 },
    { id: 'qris', label: 'QRIS Toko', ikon: QrCode },
    { id: 'pengaturan', label: 'Pengaturan', ikon: Settings },
    { id: 'panduan', label: 'Panduan Singkat', ikon: BookOpen },
    { id: 'tentang', label: 'Tentang Aplikasi', ikon: Info },
  ];

  // 5 menu utama navigasi bawah sesuai ketentuan desain
  const navBawah: Array<{
    id: HalamanAktif;
    label: string;
    ikon: React.FC<{ className?: string }>;
  }> = [
    { id: 'kasir', label: 'Kasir', ikon: ShoppingBag },
    { id: 'barang', label: 'Barang', ikon: Package },
    { id: 'keuangan', label: 'Keuangan', ikon: Wallet },
    { id: 'laporan', label: 'Laporan', ikon: BarChart3 },
    { id: 'lainnya', label: 'Lainnya', ikon: Menu },
  ];

  const renderHalaman = () => {
    if (!bolehAksesHalaman(halaman, peranSaatIni)) {
      return (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 text-center max-w-md mx-auto mt-8">
          <ShieldAlert className="w-12 h-12 text-amber-600 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Menu Tidak Tersedia untuk Peran Ini
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-400 mt-2">
            Anda masuk sebagai <strong>{namaPenggunaAktif}</strong> ({profilAktif?.jabatan}).
            Menu ini hanya dibuka oleh Pemilik toko.
          </p>
          <button
            type="button"
            onClick={() => setHalaman('dashboard')}
            className="mt-5 w-full min-h-[48px] rounded-xl bg-emerald-700 text-white text-base font-bold"
          >
            Kembali ke Dashboard
          </button>
        </div>
      );
    }

    switch (halaman) {
      case 'dashboard':
        return (
          <DashboardPage
            data={data}
            peranAktif={peranSaatIni}
            onPindahHalaman={(h) => setHalaman(h)}
            onBukaPengeluaranBaru={() => {
              setKeuanganTabAwal('pengeluaran');
              setBukaModalPengeluaran(true);
              setHalaman('keuangan');
            }}
          />
        );
      case 'kasir':
        return (
          <KasirPage
            data={data}
            kasirAktif={namaPenggunaAktif}
            onSelesaikanPenjualan={tanganiSelesaikanPenjualan}
            onSimpanSementara={tanganiSimpanSementara}
            onHapusKeranjangTersimpan={tanganiHapusKeranjangTersimpan}
            onToast={tambahToast}
          />
        );
      case 'barang':
        return (
          <BarangPage
            data={data}
            peranAktif={peranSaatIni}
            onSimpanBarang={tanganiSimpanBarang}
            onHapusBarang={tanganiHapusBarang}
            onImporBarang={tanganiImporBarang}
            onPindahHalaman={setHalaman}
            onToast={tambahToast}
          />
        );
      case 'stok':
        return (
          <StokPage
            data={data}
            peranAktif={peranSaatIni}
            onUbahStok={tanganiUbahStok}
            onToast={tambahToast}
          />
        );
      case 'keuangan':
        return (
          <KeuanganPage
            data={data}
            peranAktif={peranSaatIni}
            namaPenggunaAktif={namaPenggunaAktif}
            tabAwal={keuanganTabAwal}
            bukaModalPengeluaranAwal={bukaModalPengeluaran}
            onResetTriggerModal={() => setBukaModalPengeluaran(false)}
            onTambahPemasukanManual={tanganiTambahPemasukanManual}
            onCatatPengeluaran={tanganiCatatPengeluaran}
            onEditPengeluaran={tanganiEditPengeluaran}
            onHapusPengeluaran={tanganiHapusPengeluaran}
            onToast={tambahToast}
          />
        );
      case 'laporan':
        return (
          <LaporanPage
            data={data}
            onBukaDetailTransaksi={(trx) => setStrukAktif(trx)}
            onToast={tambahToast}
          />
        );
      case 'qris':
        return (
          <QrisPage
            data={data}
            peranAktif={peranSaatIni}
            onPindahHalaman={setHalaman}
          />
        );
      case 'pengaturan':
        return (
          <PengaturanPage
            data={data}
            peranAktif={peranSaatIni}
            onSimpanPengaturan={tanganiSimpanPengaturan}
            onCatatBackup={tanganiCatatBackup}
            onPulihkanData={tanganiPulihkanData}
            onResetKeDemo={tanganiResetKeDemo}
            onKosongkanData={tanganiKosongkanData}
            onToast={tambahToast}
          />
        );
      case 'lainnya':
        return (
          <LainnyaPage
            peranAktif={peranSaatIni}
            onPindahHalaman={setHalaman}
            onGantiProfil={() => setModalGantiProfil(true)}
          />
        );
      case 'panduan':
        return <PanduanPage />;
      case 'tentang':
        return <TentangPage />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f6f8f7] dark:bg-[#0b120e] text-slate-900 dark:text-slate-100">
      <OfflineBanner />

      {/* Header Atas Ringkas */}
      <header className="sticky top-0 z-30 h-14 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-3 sm:px-5 flex items-center justify-between gap-3 no-print">
        <button
          type="button"
          onClick={() => setHalaman('dashboard')}
          className="flex items-center gap-2.5 min-w-0 min-h-[44px] text-left"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0">
            <Store className="w-5 h-5" />
          </div>
          <span className="text-base sm:text-lg font-bold tracking-tight truncate">
            {data.pengaturan.profil_usaha.nama_toko}
          </span>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden md:block">
            <PWAInstallButton />
          </div>
          <button
            type="button"
            onClick={() => setModalGantiProfil(true)}
            className="min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 whitespace-nowrap"
          >
            <UserCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
            <span>{namaPenggunaAktif}</span>
          </button>
        </div>
      </header>

      {/* Kerangka Utama: Sidebar (Desktop) + Konten */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 gap-1 no-print">
          {navDesktop
            .filter((item) => bolehAksesHalaman(item.id, peranSaatIni))
            .map((item) => {
              const Ikon = item.ikon;
              const aktif = halaman === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setHalaman(item.id)}
                  className={`min-h-[48px] px-3.5 rounded-xl flex items-center gap-3 text-base font-semibold transition text-left ${
                    aktif
                      ? 'bg-emerald-700 text-white'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Ikon className="w-5 h-5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
        </aside>

        <main className="flex-1 min-w-0 p-3 sm:p-5 lg:p-6 pb-28 lg:pb-10">
          {renderHalaman()}
        </main>
      </div>

      {/* Navigasi Bawah Mobile (5 Menu Utama) */}
      <nav
        aria-label="Menu Utama"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe no-print"
      >
        <div className="grid grid-cols-5 h-16">
          {navBawah.map((item) => {
            const Ikon = item.ikon;
            const aktif =
              halaman === item.id ||
              (item.id === 'barang' && halaman === 'stok') ||
              (item.id === 'lainnya' &&
                ['dashboard', 'qris', 'pengaturan', 'panduan', 'tentang'].includes(halaman));
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setHalaman(item.id)}
                className={`flex flex-col items-center justify-center gap-0.5 min-h-[48px] transition ${
                  aktif
                    ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                    : 'text-slate-600 dark:text-slate-400 font-medium'
                }`}
              >
                <Ikon className="w-5 h-5 shrink-0" />
                <span className="text-[11px] leading-tight whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Modal Struk Transaksi */}
      <StrukModal
        transaksi={strukAktif}
        pengaturan={data.pengaturan}
        peranAktif={peranSaatIni}
        onTutup={() => setStrukAktif(null)}
        onBatalkanTransaksi={tanganiBatalkanTransaksi}
        onBagikanSukses={(pesan) => tambahToast('sukses', pesan)}
      />

      {/* Modal Pilih Profil & PIN */}
      <ProfileLockModal
        terbuka={!peranAktif || modalGantiProfil}
        namaToko={data.pengaturan.profil_usaha.nama_toko}
        pinPengguna={data.pengaturan.pin_pengguna}
        peranSaatIni={peranAktif ?? undefined}
        bisaTutup={!!peranAktif}
        onPilihProfil={tanganiPilihProfil}
        onTutup={() => setModalGantiProfil(false)}
      />

      <ToastContainer toasts={toasts} onDismiss={hapusToast} />
    </div>
  );
}
