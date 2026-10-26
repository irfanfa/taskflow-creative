import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/supabase/get-profile';
import { isCloudinaryConfigured, uploadToCloudinary } from '@/lib/cloudinary/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/cloudinary/upload
 * Memeriksa status konfigurasi Cloudinary
 */
export async function GET() {
  const configured = isCloudinaryConfigured();
  return NextResponse.json({
    configured,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || null,
  });
}

/**
 * POST /api/cloudinary/upload
 * Menerima file multipart/form-data dan mengunggahnya langsung ke Cloudinary
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Verifikasi autentikasi pengguna
    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Silakan login terlebih dahulu untuk mengunggah file.' },
        { status: 401 }
      );
    }

    // 2. Periksa apakah kredensial Cloudinary sudah ada di .env.local
    if (!isCloudinaryConfigured()) {
      return NextResponse.json(
        {
          success: false,
          notConfigured: true,
          error:
            'Kredensial Cloudinary belum dikonfigurasi di .env.local. Silakan masukkan CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, dan CLOUDINARY_API_SECRET.',
        },
        { status: 400 }
      );
    }

    // 3. Baca payload FormData
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Tidak ada file yang dipilih untuk diunggah.' },
        { status: 400 }
      );
    }

    // Batasan ukuran (misal 100 MB per file)
    const MAX_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `Ukuran file (${(file.size / (1024 * 1024)).toFixed(1)} MB) melebihi batas maksimal 100 MB.`,
        },
        { status: 400 }
      );
    }

    // 4. Konversi file ke Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 5. Unggah ke Cloudinary
    const result = await uploadToCloudinary({
      buffer,
      fileName: file.name,
      folder: 'taskflow-creative/attachments',
    });

    return NextResponse.json({
      success: true,
      file: {
        url: result.secureUrl,
        fileName: result.fileName,
        size: result.bytes,
        format: result.format,
        resourceType: result.resourceType,
      },
      message: `File "${result.fileName}" berhasil diunggah ke Cloudinary CDN!`,
    });
  } catch (error: unknown) {
    console.error('[Cloudinary Upload API Error]:', error);
    const errorMsg =
      error instanceof Error ? error.message : 'Terjadi kesalahan saat mengunggah file ke Cloudinary';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
  }
}
