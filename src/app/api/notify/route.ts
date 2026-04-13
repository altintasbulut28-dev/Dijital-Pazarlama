import { NextResponse } from 'next/server';

// Şu an bildirim sistemi pasif.
// İleride WhatsApp Business API entegrasyonu buraya eklenecek.
// WHATSAPP_API_TOKEN ve WHATSAPP_PHONE_NUMBER_ID env değişkenleri ile çalışacak.

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { message } = data;

    if (!message) {
      return NextResponse.json({ error: 'Mesaj eksik.' }, { status: 400 });
    }

    const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN;
    const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!WHATSAPP_API_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      // WhatsApp API henüz yapılandırılmadı — sessizce geç
      console.log('[APEX OS] Bildirim atlandı (WhatsApp API henüz aktif değil):', message);
      return NextResponse.json({ success: true, skipped: true, message: 'WhatsApp API henüz aktif değil' });
    }

    // WhatsApp Business API entegrasyonu buraya gelecek
    // Şimdilik placeholder
    return NextResponse.json({ success: true, message: 'Bildirim gönderildi' });

  } catch (error: any) {
    console.error('Bildirim Hatası:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
