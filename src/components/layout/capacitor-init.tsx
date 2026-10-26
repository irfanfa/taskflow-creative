'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function CapacitorInit() {
  const router = useRouter();

  useEffect(() => {
    // Dynamic import agar tidak memberatkan bundle web murni
    async function initNative() {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;

        const { SplashScreen } = await import('@capacitor/splash-screen');
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        const { App } = await import('@capacitor/app');

        // 1. Sembunyikan Splash Screen
        await SplashScreen.hide().catch(() => {});

        // 2. Konfigurasi Status Bar
        await StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
        await StatusBar.setBackgroundColor({ color: '#0f172a' }).catch(() => {});

        // 3. Tangani Tombol Back Fisik Android
        App.addListener('backButton', ({ canGoBack }) => {
          const path = window.location.pathname;
          const rootPaths = ['/admin', '/pegawai', '/pep', '/login', '/'];
          if (rootPaths.includes(path)) {
            App.exitApp();
          } else if (canGoBack) {
            router.back();
          } else {
            App.exitApp();
          }
        });

        // 4. Inisialisasi Kanal & Izin Notifikasi Android
        const { initDeviceNotifications } = await import('@/lib/notifications/device-notifications');
        await initDeviceNotifications(router);
      } catch (err) {
        console.warn('Capacitor native plugins skipped:', err);
      }
    }

    initNative();
  }, [router]);

  return null;
}
