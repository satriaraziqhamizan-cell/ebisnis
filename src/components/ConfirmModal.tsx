import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  terbuka: boolean;
  judul: string;
  pesan: string;
  labelKonfirmasi?: string;
  labelBatal?: string;
  bahaya?: boolean;
  butuhAlasan?: boolean;
  placeholderAlasan?: string;
  konfirmasiGanda?: boolean;
  onTutup: () => void;
  onKonfirmasi: (alasan?: string) => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  terbuka,
  judul,
  pesan,
  labelKonfirmasi = 'Ya, Lanjutkan',
  labelBatal = 'Batal',
  bahaya = false,
  butuhAlasan = false,
  placeholderAlasan = 'Tulis alasan di sini...',
  konfirmasiGanda = false,
  onTutup,
  onKonfirmasi,
}) => {
  const [alasan, setAlasan] = useState('');
  const [langkahKedua, setLangkahKedua] = useState(false);
  const [errorAlasan, setErrorAlasan] = useState('');

  if (!terbuka) return null;

  const tanganiKlikKonfirmasi = () => {
    if (butuhAlasan && !alasan.trim()) {
      setErrorAlasan('Alasan wajib diisi sebelum melanjutkan.');
      return;
    }
    if (konfirmasiGanda && !langkahKedua) {
      setLangkahKedua(true);
      return;
    }
    const hasilAlasan = alasan.trim();
    setAlasan('');
    setLangkahKedua(false);
    setErrorAlasan('');
    onKonfirmasi(hasilAlasan);
  };

  const tanganiTutup = () => {
    setAlasan('');
    setLangkahKedua(false);
    setErrorAlasan('');
    onTutup();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4 no-print"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-konfirmasi-judul"
    >
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                bahaya
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              }`}
            >
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2
              id="modal-konfirmasi-judul"
              className="text-lg font-bold text-slate-900 dark:text-slate-100"
            >
              {langkahKedua ? 'Konfirmasi Terakhir' : judul}
            </h2>
          </div>
          <button
            type="button"
            onClick={tanganiTutup}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Tutup dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="mt-4 text-base text-slate-700 dark:text-slate-300 leading-relaxed">
          {langkahKedua
            ? 'Tindakan ini tidak dapat dibatalkan setelah dijalankan. Apakah Anda benar-benar yakin?'
            : pesan}
        </p>

        {butuhAlasan && (
          <div className="mt-4">
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
              Alasan Wajib Diisi
            </label>
            <textarea
              rows={3}
              value={alasan}
              onChange={(e) => {
                setAlasan(e.target.value);
                setErrorAlasan('');
              }}
              placeholder={placeholderAlasan}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-base text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
            {errorAlasan && (
              <p className="mt-1.5 text-sm font-medium text-rose-600 dark:text-rose-400">
                {errorAlasan}
              </p>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3">
          <button
            type="button"
            onClick={tanganiTutup}
            className="w-full sm:flex-1 min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-3 text-base font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            {labelBatal}
          </button>
          <button
            type="button"
            onClick={tanganiKlikKonfirmasi}
            className={`w-full sm:flex-1 min-h-[48px] rounded-xl px-4 py-3 text-base font-semibold text-white transition-colors ${
              bahaya
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-emerald-700 hover:bg-emerald-800'
            }`}
          >
            {langkahKedua ? 'Ya, Saya Yakin' : labelKonfirmasi}
          </button>
        </div>
      </div>
    </div>
  );
};
