import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

export const runtime = 'nodejs';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    return NextResponse.json(
      { error: 'Cloudinary no configurado.' },
      { status: 500 }
    );
  }
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'no file' }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: 'boutique-regalos', resource_type: 'image' },
        (error, result) => (error ? reject(error) : resolve(result))
      ).end(buffer);
    });

    return NextResponse.json({ url: result.secure_url });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'upload error', message: err?.message || String(err) },
      { status: 500 }
    );
  }
}