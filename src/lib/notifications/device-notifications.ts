import { Capacitor } from '@capacitor/core';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

export const TASK_NOTIFICATION_CHANNEL_ID = 'task_alerts';

let isChannelCreated = false;

/**
 * Inisialisasi kanal notifikasi dan perizinan di Android secara aman
 */
export async function initDeviceNotifications(router?: AppRouterInstance) {
  if (typeof window === 'undefined') return { success: false, reason: 'SSR' };

  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');

      // 1. Buat Notification Channel untuk Android 8.0+
      try {
        await LocalNotifications.createChannel({
          id: TASK_NOTIFICATION_CHANNEL_ID,
          name: 'Pemberitahuan Tugas Baru & Deadline',
          description: 'Notifikasi saat ada tugas baru ditugaskan atau status direview',
          importance: 5, // High / Max: Muncul sebagai heads-up pop-up banner di layar
          visibility: 1, // Public di lockscreen
          vibration: true,
          lights: true,
          lightColor: '#4f46e5',
        });
        isChannelCreated = true;
      } catch (channelErr) {
        console.warn('Gagal membuat notification channel kustom:', channelErr);
      }

      // 2. Periksa dan minta izin notifikasi (Android 13+)
      let permStatus = await LocalNotifications.checkPermissions();
      if (permStatus.display !== 'granted') {
        permStatus = await LocalNotifications.requestPermissions();
      }

      // 3. Pasang listener untuk menangani klik notifikasi (Deep-linking)
      try {
        await LocalNotifications.removeAllListeners();
        await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
          const extra = action.notification.extra;
          if (extra && extra.url && router) {
            router.push(extra.url);
          }
        });
      } catch (listenerErr) {
        console.warn('Gagal mendaftarkan listener notifikasi:', listenerErr);
      }

      return {
        success: permStatus.display === 'granted',
        permission: permStatus.display,
      };
    } catch (err) {
      console.warn('Device notification initialization skipped:', err);
      return { success: false, error: err };
    }
  } else {
    // Web Browser Fallback (Jika dibuka via Chrome Android / Desktop)
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        const perm = await Notification.requestPermission();
        return { success: perm === 'granted', permission: perm };
      } catch (err) {
        console.warn('Web notification permission error:', err);
        return { success: false, error: err };
      }
    }
    return {
      success: typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted',
      permission: typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied',
    };
  }
}

/**
 * Tampilkan notifikasi native di status bar Android atau browser
 */
export async function triggerNativeNotification({
  title,
  body,
  taskId,
  url,
}: {
  title: string;
  body: string;
  taskId?: string;
  url?: string;
}): Promise<{ success: boolean; error?: string; permission?: string }> {
  if (typeof window === 'undefined') return { success: false, error: 'Window tidak tersedia' };

  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      
      // 1. Pastikan perizinan aktif
      let permStatus = await LocalNotifications.checkPermissions();
      if (permStatus.display !== 'granted') {
        permStatus = await LocalNotifications.requestPermissions();
        if (permStatus.display !== 'granted') {
          return {
            success: false,
            error: 'Izin notifikasi belum diaktifkan di HP Anda. Silakan izinkan di Pengaturan Aplikasi Android.',
            permission: permStatus.display,
          };
        }
      }

      // 2. Pastikan channel sudah dibuat
      if (!isChannelCreated) {
        await LocalNotifications.createChannel({
          id: TASK_NOTIFICATION_CHANNEL_ID,
          name: 'Pemberitahuan Tugas Baru & Deadline',
          description: 'Notifikasi saat ada tugas baru ditugaskan atau status direview',
          importance: 5, // High: Heads-up banner
          visibility: 1, // Public
          vibration: true,
          lights: true,
          lightColor: '#ffffff',
        }).catch(() => {});
        isChannelCreated = true;
      }

      const notificationId = Math.floor(Math.random() * 1000000) + 1;
      const targetUrl = url || (taskId ? `/pegawai/tugas/${taskId}` : '/pegawai');

      // 3. Jadwalkan notifikasi instan
      // PENTING: isExactNotification wajib false agar tidak diblokir izin EXACT_ALARM di Android 12+
      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: notificationId,
              title,
              body,
              channelId: TASK_NOTIFICATION_CHANNEL_ID,
              smallIcon: 'ic_launcher',
              isExactNotification: false,
              isExactMandatory: false,
              foreground: true,
              autoCancel: true,
              ongoing: false,
              extra: {
                taskId,
                url: targetUrl,
              },
            },
          ],
        });
        return { success: true, permission: permStatus.display };
      } catch (scheduleErr) {
        // Fallback: coba jadwalkan tanpa channelId kustom jika channelId ditolak
        console.warn('Gagal dengan channel kustom, mencoba fallback default channel:', scheduleErr);
        await LocalNotifications.schedule({
          notifications: [
            {
              id: notificationId,
              title,
              body,
              channelId: 'default',
              smallIcon: 'ic_launcher',
              iconColor: '#ffffff',
              isExactNotification: false,
              isExactMandatory: false,
              foreground: true,
              autoCancel: true,
              ongoing: false,
              extra: {
                taskId,
                url: targetUrl,
              },
            },
          ],
        });
        return { success: true, permission: permStatus.display };
      }
    } catch (err: unknown) {
      console.warn('Error triggering native local notification:', err);
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  } else {
    // Web Notification API (Browser fallback: Desktop & Mobile Chrome/PWA)
    try {
      if ('Notification' in window) {
        let perm = Notification.permission;
        if (perm === 'default') {
          perm = await Notification.requestPermission();
        }
        if (perm === 'granted') {
          const targetUrl = url || (taskId ? `/pegawai/tugas/${taskId}` : '/pegawai');

          // Khusus Android Chrome / PWA, new Notification() dilarang, wajib ServiceWorker
          if ('serviceWorker' in navigator) {
            try {
              const reg = await navigator.serviceWorker.ready;
              if (reg && reg.showNotification) {
                await reg.showNotification(title, {
                  body,
                  icon: '/logo.png',
                  badge: '/logo.png',
                  data: { url: targetUrl },
                });
                return { success: true, permission: 'granted' };
              }
            } catch (swErr) {
              console.warn('ServiceWorker showNotification fallback:', swErr);
            }
          }

          // Desktop Notification constructor
          try {
            const notif = new Notification(title, {
              body,
              icon: '/logo.png',
              badge: '/logo.png',
            });
            notif.onclick = () => {
              window.focus();
              window.location.href = targetUrl;
            };
            return { success: true, permission: 'granted' };
          } catch (e) {
            console.warn('Notification constructor error:', e);
          }
          return { success: true, permission: 'granted' };
        } else {
          return {
            success: false,
            error: 'Izin notifikasi browser diblokir atau belum diberikan.',
            permission: perm,
          };
        }
      }
      return { success: false, error: 'Browser tidak mendukung Notification API' };
    } catch (err: unknown) {
      console.warn('Error triggering web notification:', err);
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }
}
