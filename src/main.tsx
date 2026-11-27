import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Daftarkan service worker agar aplikasi bisa bekerja offline
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(<App />);
