import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';

/**
 * Memeriksa apakah kredensial Cloudinary sudah terkonfigurasi di environment variables
 */
export function isCloudinaryConfigured(): boolean {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  return Boolean(cloudName && apiKey && apiSecret);
}

/**
 * Menginisialisasi dan mendapatkan instance Cloudinary v2 yang telah terkonfigurasi
 */
export function getCloudinaryClient() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      'Kredensial Cloudinary belum dikonfigurasi. Pastikan CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, dan CLOUDINARY_API_SECRET telah diisi di .env.local.'
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  return cloudinary;
}

export interface CloudinaryUploadOptions {
  buffer: Buffer;
  fileName: string;
  folder?: string;
  tags?: string[];
}

export interface CloudinaryUploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
  format: string;
  resourceType: 'image' | 'video' | 'raw';
  bytes: number;
  fileName: string;
}

export interface CloudinaryUsageData {
  plan: string;
  storageUsedBytes: number;
  storageLimitBytes: number;
  creditsUsed: number;
  creditsLimit: number;
  creditsPercent: number;
  totalFiles: number;
  bandwidthUsedBytes: number;
  lastUpdated: string;
}

export interface CloudinaryCleanupResult {
  deletedCount: number;
  deletedIds: string[];
  logs: string[];
}

/**
 * Mengunggah file buffer ke Cloudinary secara stream dengan resource_type auto
 * dan menyematkan tag auto-expire-7d untuk pembersihan berkala.
 */
export async function uploadToCloudinary({
  buffer,
  fileName,
  folder = 'taskflow-creative/attachments',
  tags = ['auto-expire-7d'],
}: CloudinaryUploadOptions): Promise<CloudinaryUploadResult> {
  const client = getCloudinaryClient();

  return new Promise((resolve, reject) => {
    // Sanitasi nama file tanpa ekstensi untuk public_id
    const baseName = fileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const timestamp = Date.now();
    const publicId = `${folder}/${baseName}_${timestamp}`;

    const uploadStream = client.uploader.upload_stream(
      {
        public_id: publicId,
        resource_type: 'auto',
        use_filename: true,
        unique_filename: true,
        overwrite: true,
        tags,
      },
      (error: unknown, result?: UploadApiResponse) => {
        if (error || !result) {
          let errMessage =
            error && typeof error === 'object' && 'message' in error
              ? (error as { message: string }).message
              : 'Gagal mengunggah file ke Cloudinary';

          if (
            errMessage.includes('403') ||
            errMessage.includes('missing permissions') ||
            errMessage.includes('Request forbidden')
          ) {
            errMessage =
              'Izin API Key Cloudinary Anda belum aktif untuk tindakan Upload ("create"). Silakan buka Dashboard Cloudinary -> Settings (ikon gear) -> API Keys -> Edit Key -> centang "Full Access" atau "Upload/Create", lalu klik Save.';
          }

          return reject(new Error(errMessage));
        }

        resolve({
          url: result.url,
          secureUrl: result.secure_url,
          publicId: result.public_id,
          format: result.format || fileName.split('.').pop() || '',
          resourceType: (result.resource_type as 'image' | 'video' | 'raw') || 'raw',
          bytes: result.bytes,
          fileName,
        });
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Mengambil informasi kuota dan penggunaan (Usage) dari Cloudinary Admin API
 */
export async function getCloudinaryUsage(): Promise<CloudinaryUsageData | null> {
  if (!isCloudinaryConfigured()) {
    return null;
  }

  try {
    const client = getCloudinaryClient();
    const usage = (await client.api.usage()) as any;

    const storageUsedBytes = usage.storage?.usage || 0;
    const creditsUsed = usage.credits?.usage || 0;
    const creditsLimit = usage.credits?.limit || 25; // 25 Credits (GB) pada free plan
    const creditsPercent = usage.credits?.used_percent || 0;
    const totalFiles = (usage.resources || 0) + (usage.derived_resources || 0);
    const bandwidthUsedBytes = usage.bandwidth?.usage || 0;

    return {
      plan: usage.plan || 'Free Plan',
      storageUsedBytes,
      storageLimitBytes: creditsLimit * 1024 * 1024 * 1024,
      creditsUsed,
      creditsLimit,
      creditsPercent: Number(creditsPercent.toFixed(2)),
      totalFiles,
      bandwidthUsedBytes,
      lastUpdated: usage.last_updated || new Date().toISOString(),
    };
  } catch (err) {
    console.error('[Cloudinary Usage Error]:', err);
    return null;
  }
}

export interface CloudinaryCleanupOptions {
  days?: number;
  forceAll?: boolean; // Jika true, hapus semua file di folder lampiran tanpa memedulikan umur (< 7 hari tetap dihapus)
}

/**
 * Menghapus file lampiran di Cloudinary.
 * - Jika forceAll=true atau days=0: Menghapus SELURUH file lampiran di folder taskflow-creative/attachments/* (termasuk yang < 7 hari).
 * - Jika forceAll=false & days>0 (misal 7 hari): Hanya menghapus file yang lebih tua dari N hari (digunakan scheduler cron malam).
 */
export async function cleanupExpiredCloudinaryAssets(
  options: number | CloudinaryCleanupOptions = 7
): Promise<CloudinaryCleanupResult> {
  const isForceAll =
    typeof options === 'object'
      ? Boolean(options.forceAll || (typeof options.days === 'number' && options.days <= 0))
      : options <= 0;
  const days = typeof options === 'number' ? options : options.days ?? 7;

  const logs: string[] = [];
  if (isForceAll) {
    logs.push('[Cloudinary Cleanup] Memulai HAPUS PAKSA seluruh aset lampiran (termasuk file < 7 hari)...');
  } else {
    logs.push(`[Cloudinary Cleanup] Memulai pembersihan aset lampiran lebih dari ${days} hari...`);
  }

  if (!isCloudinaryConfigured()) {
    logs.push('[Error] Kredensial Cloudinary belum dikonfigurasi.');
    return { deletedCount: 0, deletedIds: [], logs };
  }

  try {
    const client = getCloudinaryClient();

    // Query pencarian aset di Cloudinary menggunakan public_id prefix
    const expression = isForceAll
      ? 'public_id:taskflow-creative/attachments/*'
      : `public_id:taskflow-creative/attachments/* AND created_at<${days}d`;

    logs.push(`[Query]: ${expression}`);

    const searchRes = (await client.search
      .expression(expression)
      .max_results(500)
      .execute()) as any;

    const resources = searchRes.resources || [];
    logs.push(`[Ditemukan]: ${resources.length} aset yang sesuai kriteria.`);

    if (resources.length === 0) {
      logs.push(
        isForceAll
          ? '[Selesai] Folder lampiran Cloudinary sudah kosong/bersih.'
          : '[Selesai] Tidak ada file kedaluwarsa (> 7 hari) yang perlu dihapus saat ini.'
      );
      return { deletedCount: 0, deletedIds: [], logs };
    }

    // Kelompokkan public_id berdasarkan resource_type agar penghapusan via Admin API valid
    const imageIds = resources
      .filter((r: any) => r.resource_type === 'image')
      .map((r: any) => r.public_id);
    const videoIds = resources
      .filter((r: any) => r.resource_type === 'video')
      .map((r: any) => r.public_id);
    const rawIds = resources
      .filter((r: any) => r.resource_type === 'raw')
      .map((r: any) => r.public_id);

    const deletedIds: string[] = [];

    if (imageIds.length > 0) {
      await client.api.delete_resources(imageIds, { resource_type: 'image', invalidate: true });
      deletedIds.push(...imageIds);
      logs.push(`[OK] Berhasil menghapus ${imageIds.length} file gambar.`);
    }

    if (videoIds.length > 0) {
      await client.api.delete_resources(videoIds, { resource_type: 'video', invalidate: true });
      deletedIds.push(...videoIds);
      logs.push(`[OK] Berhasil menghapus ${videoIds.length} file video.`);
    }

    if (rawIds.length > 0) {
      await client.api.delete_resources(rawIds, { resource_type: 'raw', invalidate: true });
      deletedIds.push(...rawIds);
      logs.push(`[OK] Berhasil menghapus ${rawIds.length} file dokumen/arsip raw.`);
    }

    // Untuk forceAll, jalankan delete_resources_by_prefix sebagai pembersihan tuntas tambahan
    if (isForceAll) {
      try {
        await client.api.delete_resources_by_prefix('taskflow-creative/attachments/', {
          resource_type: 'image',
          invalidate: true,
        });
        await client.api.delete_resources_by_prefix('taskflow-creative/attachments/', {
          resource_type: 'video',
          invalidate: true,
        });
        await client.api.delete_resources_by_prefix('taskflow-creative/attachments/', {
          resource_type: 'raw',
          invalidate: true,
        });
      } catch (cleanPrefixErr) {
        // Fallback jika tidak ada resource tersisa
      }
    }

    logs.push(
      `[Selesai] Total ${deletedIds.length} aset berhasil dibersihkan tuntas dari Cloudinary.`
    );
    return { deletedCount: deletedIds.length, deletedIds, logs };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : 'Terjadi kegagalan saat proses pembersihan';
    logs.push(`[Error Pembersihan]: ${errorMsg}`);
    console.error('[Cloudinary Cleanup Error]:', errorMsg);
    return { deletedCount: 0, deletedIds: [], logs };
  }
}
