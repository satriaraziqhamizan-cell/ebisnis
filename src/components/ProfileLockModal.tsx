import React, { useState } from 'react';
import { Lock, UserCheck, Store, Delete } from 'lucide-react';
import { DAFTAR_PROFIL, PeranPengguna } from '../types/pos';

interface ProfileLockModalProps {
  terbuka: boolean;
  namaToko: string;
  pinPengguna: Record<PeranPengguna, string>;
  peranSaatIni?: PeranPengguna;
  bisaTutup?: boolean;
  onPilihProfil: (peran: PeranPengguna) => void;
  onTutup?: () => void;
}

export const ProfileLockModal: React.FC<ProfileLockModalProps> = ({
  terbuka,
  namaToko,
  pinPengguna,
  peranSaatIni,
  bisaTutup = false,
  onPilihProfil,
  onTutup,
}) => {
  const [peranDipilih, setPeranDipilih] = useState<PeranPengguna | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [errorPin, setErrorPin] = useState('');

  if (!terbuka) return null;

  const profilDipilih = DAFTAR_PROFIL.find((p) => p.id === peranDipilih);

  const tekanAngka = (digit: string) => {
    if (pinInput.length >= 4) return;
    const baru = pinInput + digit;
    setPinInput(baru);
    setErrorPin('');

    if (baru.length === 4 && peranDipilih) {
      if (baru === pinPengguna[peranDipilih]) {
        setPinInput('');
        setPeranDipilih(null);
        onPilihProfil(peranDipilih);
      } else {
        setErrorPin('PIN salah. Silakan coba lagi.');
        setTimeout(() => setPinInput(''), 350);
      }
    }
  };

  const hapusDigit = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setErrorPin('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto no-print">
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shrink-0">
            <Store className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
              {namaToko}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {peranDipilih ? 'Masukkan PIN 4 angka Anda' : 'Pilih siapa yang sedang bertugas'}
            </p>
          </div>
        </div>

        {!peranDipilih ? (
          <div className="space-y-3">
            {DAFTAR_PROFIL.map((profil) => {
              const aktif = peranSaatIni === profil.id;
              return (
                <button
                  key={profil.id}
                  type="button"
                  onClick={() => {
                    setPeranDipilih(profil.id);
                    setPinInput('');
                    setErrorPin('');
                  }}
                  className={`w-full text-left rounded-2xl border p-4 transition-colors min-h-[72px] flex items-center justify-between gap-3 ${
                    aktif
                      ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 dark:border-emerald-500'
                      : 'border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {profil.nama}
                      </span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">·</span>
                      <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                        {profil.jabatan}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 leading-snug">
                      {profil.deskripsi}
                    </p>
                  </div>
                  <UserCheck className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                </button>
              );
            })}

            <div className="pt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-200 dark:border-slate-800">
              PIN bawaan demo: Nek Upik (<span className="font-mono-num font-semibold">1234</span>) · Tante Meli (<span className="font-mono-num font-semibold">2222</span>) · Satri (<span className="font-mono-num font-semibold">3333</span>). Bisa diubah di Pengaturan.
            </div>

            {bisaTutup && onTutup && (
              <button
                type="button"
                onClick={onTutup}
                className="w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 text-base font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Kembali
              </button>
            )}
          </div>
        ) : (
          <div>
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-4 text-center mb-4">
              <div className="flex items-center justify-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
                <Lock className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                <span>{profilDipilih?.nama}</span>
                <span className="text-slate-400">·</span>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {profilDipilih?.jabatan}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-center gap-3">
                {[0, 1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-full border-2 transition-colors ${
                      idx < pinInput.length
                        ? 'bg-emerald-700 border-emerald-700 dark:bg-emerald-400 dark:border-emerald-400'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}
                  />
                ))}
              </div>

              {errorPin ? (
                <p className="mt-3 text-sm font-semibold text-rose-600 dark:text-rose-400">
                  {errorPin}
                </p>
              ) : (
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  PIN bawaan: <span className="font-mono-num font-semibold">{pinPengguna[peranDipilih]}</span>
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => tekanAngka(d)}
                  className="min-h-[54px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xl font-bold text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-[0.98] font-mono-num"
                >
                  {d}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setPeranDipilih(null);
                  setPinInput('');
                  setErrorPin('');
                }}
                className="min-h-[54px] rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Ganti
              </button>
              <button
                type="button"
                onClick={() => tekanAngka('0')}
                className="min-h-[54px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xl font-bold text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-[0.98] font-mono-num"
              >
                0
              </button>
              <button
                type="button"
                onClick={hapusDigit}
                aria-label="Hapus angka"
                className="min-h-[54px] rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
