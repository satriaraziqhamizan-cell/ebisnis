import React, { useState } from 'react';
import { Printer, Share2, X, Ban, CheckCircle2 } from 'lucide-react';
import { Pengaturan, PeranPengguna, Transaksi } from '../types/pos';
import { formatRupiah, formatTanggalJamWIB } from '../utils/format';
import { ConfirmModal } from './ConfirmModal';

interface StrukModalProps {
  transaksi: Transaksi | null;
  pengaturan: Pengaturan;
  peranAktif: PeranPengguna;
  onTutup: () => void;
  onBatalkanTransaksi?: (transaksiId: string, alasan: string) => void;
  onBagikanSukses?: (pesan: string) => void;
}

export const StrukModal: React.FC<StrukModalProps> = ({
  transaksi,
  pengaturan,
  peranAktif,
  onTutup,
  onBatalkanTransaksi,
  onBagikanSukses,
}) => {
  const [konfirmasiBatal, setKonfirmasiBatal] = useState(false);

  if (!transaksi) return null;

  const teksStruk = [
    pengaturan.profil_usaha.nama_toko,
    pengaturan.profil_usaha.alamat,
    `No: ${transaksi.nomor}`,
    `Waktu: ${formatTanggalJamWIB(transaksi.tanggal_waktu)}`,
    `Kasir: ${transaksi.kasir}`,
    '------------------------------',
    ...transaksi.item.map(
      (it) => `${it.nama} (${it.jumlah} x ${formatRupiah(it.harga)}) = ${formatRupiah(it.subtotal)}`
    ),
    '------------------------------',
    ...(transaksi.diskon > 0 ? [`Diskon: -${formatRupiah(transaksi.diskon)}`] : []),
    `TOTAL: ${formatRupiah(transaksi.total)}`,
    `Bayar (${transaksi.metode}): ${formatRupiah(transaksi.uang_diterima)}`,
    ...(transaksi.metode === 'TUNAI'
      ? [`Kembali: ${formatRupiah(transaksi.kembalian)}`]
      : []),
    ...(transaksi.catatan ? [`Catatan: ${transaksi.catatan}`] : []),
    ...(transaksi.status === 'DIBATALKAN'
      ? [`STATUS: DIBATALKAN (${transaksi.alasan_batal || '-'})`]
      : []),
    '',
    pengaturan.profil_usaha.pesan_struk,
  ].join('\n');

  const tanganiBagikan = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Struk ${transaksi.nomor}`,
          text: teksStruk,
        });
        onBagikanSukses?.('Struk berhasil dibagikan.');
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(teksStruk);
        onBagikanSukses?.('Teks struk disalin ke papan klip (siap ditempel ke WhatsApp).');
      }
    } catch {
      // Pengguna membatalkan dialog share
    }
  };

  const tanganiCetak = () => {
    window.print();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto">
        <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[92vh] flex flex-col print-container">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 no-print">
            <div className="flex items-center gap-2">
              {transaksi.status === 'SELESAI' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
              ) : (
                <Ban className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              )}
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Struk Transaksi
              </h2>
            </div>
            <button
              type="button"
              onClick={onTutup}
              aria-label="Tutup struk"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 overflow-y-auto flex-1 space-y-4 text-slate-900 dark:text-slate-100">
            {/* Kop Struk */}
            <div className="text-center border-b border-dashed border-slate-300 dark:border-slate-700 pb-4">
              <h3 className="text-lg font-bold">{pengaturan.profil_usaha.nama_toko}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {pengaturan.profil_usaha.alamat}
              </p>
              {pengaturan.profil_usaha.telepon && (
                <p className="text-sm text-slate-600 dark:text-slate-400 font-mono-num">
                  Telp/WA: {pengaturan.profil_usaha.telepon}
                </p>
              )}
            </div>

            {transaksi.status === 'DIBATALKAN' && (
              <div className="rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 p-3.5 text-rose-800 dark:text-rose-200">
                <p className="text-sm font-bold">TRANSAKSI DIBATALKAN</p>
                <p className="text-sm mt-0.5">Alasan: {transaksi.alasan_batal}</p>
              </div>
            )}

            <div className="space-y-1 text-sm border-b border-dashed border-slate-300 dark:border-slate-700 pb-3">
              <div className="flex justify-between gap-2">
                <span className="text-slate-600 dark:text-slate-400">Nomor</span>
                <span className="font-mono-num font-semibold">{transaksi.nomor}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-600 dark:text-slate-400">Tanggal</span>
                <span className="tabular-nums">{formatTanggalJamWIB(transaksi.tanggal_waktu)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-600 dark:text-slate-400">Kasir</span>
                <span>{transaksi.kasir}</span>
              </div>
            </div>

            {/* Daftar Item */}
            <div className="space-y-2.5 border-b border-dashed border-slate-300 dark:border-slate-700 pb-3">
              {transaksi.item.map((it, idx) => (
                <div key={`${it.barang_id}-${idx}`} className="flex justify-between gap-3 text-base">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 dark:text-slate-100">{it.nama}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-mono-num">
                      {it.jumlah} {it.satuan} x {formatRupiah(it.harga)}
                    </p>
                  </div>
                  <p className="font-mono-num font-semibold shrink-0">{formatRupiah(it.subtotal)}</p>
                </div>
              ))}
            </div>

            {/* Ringkasan Bayar */}
            <div className="space-y-1.5 text-base">
              {transaksi.diskon > 0 && (
                <>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Subtotal</span>
                    <span className="font-mono-num">{formatRupiah(transaksi.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-rose-700 dark:text-rose-400">
                    <span>Diskon</span>
                    <span className="font-mono-num">-{formatRupiah(transaksi.diskon)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-lg font-bold pt-1">
                <span>Total</span>
                <span className="font-mono-num text-emerald-700 dark:text-emerald-400">
                  {formatRupiah(transaksi.total)}
                </span>
              </div>
              <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                <span>Metode Bayar</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {transaksi.metode}
                </span>
              </div>
              <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                <span>Uang Diterima</span>
                <span className="font-mono-num">{formatRupiah(transaksi.uang_diterima)}</span>
              </div>
              {transaksi.metode === 'TUNAI' && (
                <div className="flex justify-between text-base font-bold text-slate-900 dark:text-slate-100">
                  <span>Kembalian</span>
                  <span className="font-mono-num">{formatRupiah(transaksi.kembalian)}</span>
                </div>
              )}
              {transaksi.catatan && (
                <div className="pt-2 text-sm text-slate-600 dark:text-slate-400">
                  Catatan: <span className="text-slate-900 dark:text-slate-200">{transaksi.catatan}</span>
                </div>
              )}
            </div>

            <p className="text-center text-sm text-slate-600 dark:text-slate-400 pt-2 border-t border-dashed border-slate-300 dark:border-slate-700">
              {pengaturan.profil_usaha.pesan_struk}
            </p>
          </div>

          <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2.5 no-print">
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={tanganiCetak}
                className="min-h-[48px] flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-3 text-base font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Printer className="w-5 h-5" />
                <span>Cetak / PDF</span>
              </button>
              <button
                type="button"
                onClick={tanganiBagikan}
                className="min-h-[48px] flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-base font-semibold text-white hover:bg-emerald-800"
              >
                <Share2 className="w-5 h-5" />
                <span>Bagikan</span>
              </button>
            </div>

            {peranAktif === 'pemilik' &&
              transaksi.status === 'SELESAI' &&
              onBatalkanTransaksi && (
                <button
                  type="button"
                  onClick={() => setKonfirmasiBatal(true)}
                  className="w-full min-h-[48px] flex items-center justify-center gap-2 rounded-xl border border-rose-300 dark:border-rose-800 px-4 py-2.5 text-base font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                >
                  <Ban className="w-5 h-5" />
                  <span>Batalkan Transaksi (Void)</span>
                </button>
              )}

            <button
              type="button"
              onClick={onTutup}
              className="w-full min-h-[48px] rounded-xl bg-slate-100 dark:bg-slate-800 text-base font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              Selesai & Tutup
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        terbuka={konfirmasiBatal}
        judul="Batalkan Transaksi?"
        pesan={`Transaksi ${transaksi.nomor} senilai ${formatRupiah(transaksi.total)} akan ditandai DIBATALKAN. Stok barang akan dikembalikan dan pemasukan dikoreksi otomatis.`}
        labelKonfirmasi="Batalkan Transaksi"
        bahaya
        butuhAlasan
        placeholderAlasan="Contoh: Salah input jumlah, atau pelanggan batal beli"
        onTutup={() => setKonfirmasiBatal(false)}
        onKonfirmasi={(alasan) => {
          setKonfirmasiBatal(false);
          if (alasan && onBatalkanTransaksi) {
            onBatalkanTransaksi(transaksi.id, alasan);
          }
        }}
      />
    </>
  );
};
