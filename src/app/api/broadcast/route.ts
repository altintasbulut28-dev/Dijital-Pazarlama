import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { emails, subject, text } = await request.json();

    if (!emails || emails.length === 0) {
      return NextResponse.json({ error: 'Alıcı e-posta adresi bulunamadı.' }, { status: 400 });
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_7MMWbiwA_5MTfMRFVx2fvRziNm4iNbgob';
    const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';
    const FROM_NAME = process.env.FROM_NAME || 'Apex OS';

    // Domain eklenmemişse sadece sandbox modda çalışır (kendi emailine gider)
    const isSandbox = FROM_EMAIL === 'onboarding@resend.dev';
    const toList = isSandbox ? ['altintasbulut28@gmail.com'] : emails;

    if (isSandbox) {
      console.warn('[APEX OS] Sandbox modu: Email sadece ajans sahibine gidecek. Canlı için .env dosyasına FROM_EMAIL ekleyin.');
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: toList,
        subject,
        text,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Resend Hatası:', err);
      throw new Error(`Mail hatası: ${err}`);
    }

    return NextResponse.json({
      success: true,
      message: isSandbox
        ? 'Test modu: Email ajans sahibine gönderildi. Tüm emlakçılara göndermek için domain ekleyin.'
        : `Email ${toList.length} kişiye gönderildi.`,
      sandbox: isSandbox,
    });

  } catch (error: any) {
    console.error('Broadcast Hatası:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
