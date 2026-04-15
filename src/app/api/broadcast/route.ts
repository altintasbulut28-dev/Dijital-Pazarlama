import { NextResponse } from 'next/server';

function buildHtmlEmail(params: {
  customerName: string;
  propertyTitle: string;
  propertyLocation: string | null;
  propertyPrice: string;
  propertyDescription: string | null;
  presentationUrl: string;
  agentName: string | null;
}) {
  const { customerName, propertyTitle, propertyLocation, propertyPrice, propertyDescription, presentationUrl, agentName } = params;

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${propertyTitle}</title>
</head>
<body style="margin:0;padding:0;background:#0a0e1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0e1a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- LOGO / HEADER -->
          <tr>
            <td style="padding:0 0 32px 0;text-align:center;">
              <div style="display:inline-block;background:linear-gradient(135deg,#d4a853,#b8882a);border-radius:12px;padding:10px 20px;">
                <span style="color:#0a0e1a;font-size:20px;font-weight:900;letter-spacing:2px;">APEX OS</span>
              </div>
            </td>
          </tr>

          <!-- MAIN CARD -->
          <tr>
            <td style="background:#111827;border:1px solid #1f2937;border-radius:20px;overflow:hidden;">

              <!-- GOLD TOP BAR -->
              <div style="height:4px;background:linear-gradient(90deg,#d4a853,#f0c060,#d4a853);"></div>

              <div style="padding:40px 40px 32px;">
                <!-- GREETING -->
                <p style="margin:0 0 8px;font-size:13px;color:#d4a853;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Özel Fırsat</p>
                <h1 style="margin:0 0 16px;font-size:26px;font-weight:800;color:#ffffff;line-height:1.2;">
                  Merhaba ${customerName},
                </h1>
                <p style="margin:0 0 28px;font-size:15px;color:#9ca3af;line-height:1.7;">
                  Kriterlerinize özel seçtiğimiz bu fırsatı sizinle paylaşmak istedik. Aşağıdaki mülkü incelemenizi tavsiye ediyoruz.
                </p>

                <!-- PROPERTY CARD -->
                <div style="background:#0d1117;border:1px solid #1f2937;border-radius:14px;overflow:hidden;margin-bottom:28px;">
                  <div style="background:linear-gradient(135deg,rgba(212,168,83,0.12),rgba(10,14,26,1));padding:24px;">
                    <p style="margin:0 0 6px;font-size:11px;color:#d4a853;font-weight:700;letter-spacing:1px;">VIP MÜLK</p>
                    <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#fff;">${propertyTitle}</h2>
                    ${propertyLocation ? `<p style="margin:0 0 16px;font-size:13px;color:#9ca3af;">📍 ${propertyLocation}</p>` : ''}
                    <div style="display:inline-block;background:rgba(212,168,83,0.15);border:1px solid rgba(212,168,83,0.3);border-radius:8px;padding:8px 16px;">
                      <span style="color:#d4a853;font-size:18px;font-weight:800;">${propertyPrice}</span>
                    </div>
                  </div>
                  ${propertyDescription ? `
                  <div style="padding:20px 24px;border-top:1px solid #1f2937;">
                    <p style="margin:0;font-size:14px;color:#9ca3af;line-height:1.7;">${propertyDescription.slice(0, 200)}${propertyDescription.length > 200 ? '...' : ''}</p>
                  </div>` : ''}
                </div>

                <!-- CTA BUTTON -->
                <div style="text-align:center;margin-bottom:28px;">
                  <a href="${presentationUrl}" style="display:inline-block;background:linear-gradient(135deg,#d4a853,#b8882a);color:#0a0e1a;font-size:16px;font-weight:800;text-decoration:none;padding:16px 40px;border-radius:50px;letter-spacing:0.5px;">
                    ✨ Özel Sunumu Görüntüle
                  </a>
                </div>

                <p style="margin:0;font-size:13px;color:#6b7280;text-align:center;line-height:1.6;">
                  Randevu almak veya daha fazla bilgi için danışmanınızla iletişime geçin.
                </p>
              </div>

              <!-- FOOTER -->
              <div style="background:#0d1117;border-top:1px solid #1f2937;padding:24px 40px;text-align:center;">
                ${agentName ? `<p style="margin:0 0 6px;font-size:13px;color:#9ca3af;">Danışmanınız: <strong style="color:#fff;">${agentName}</strong></p>` : ''}
                <p style="margin:0;font-size:12px;color:#4b5563;">
                  Bu e-posta Apex OS aracılığıyla gönderilmiştir. Artık almak istemiyorsanız lütfen yanıt verin.
                </p>
              </div>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { recipients, subject, property, agentName, baseUrl } = body;

    // Eski format uyumluluğu (emails array)
    const emailList: { email: string; name: string }[] = recipients || (body.emails || []).map((e: string) => ({ email: e, name: 'Müşteri' }));

    if (!emailList || emailList.length === 0) {
      return NextResponse.json({ error: 'Alıcı bulunamadı.' }, { status: 400 });
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_7MMWbiwA_5MTfMRFVx2fvRziNm4iNbgob';
    const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';
    const FROM_NAME = process.env.FROM_NAME || 'Apex OS';

    const isSandbox = FROM_EMAIL === 'onboarding@resend.dev';

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const recipient of emailList) {
      const toEmail = isSandbox ? 'altintasbulut28@gmail.com' : recipient.email;

      const html = buildHtmlEmail({
        customerName: recipient.name || 'Değerli Müşterimiz',
        propertyTitle: property?.title || 'Özel Mülk Fırsatı',
        propertyLocation: property?.location || null,
        propertyPrice: property?.price || 'Fiyat Sorunuz',
        propertyDescription: property?.description || null,
        presentationUrl: `${baseUrl}/presentation/${property?.id}`,
        agentName: agentName || null,
      });

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: `${FROM_NAME} <${FROM_EMAIL}>`,
          to: [toEmail],
          subject: subject || `Özel Fırsat: ${property?.title}`,
          html,
        }),
      });

      if (res.ok) {
        sent++;
      } else {
        const err = await res.text();
        failed++;
        errors.push(`${toEmail}: ${err}`);
        console.error('[APEX Broadcast] Resend hata:', err);
      }
    }

    return NextResponse.json({
      success: sent > 0,
      sent,
      failed,
      sandbox: isSandbox,
      errors: errors.slice(0, 3),
      message: isSandbox
        ? `Test modu: E-posta ajans sahibine gönderildi (${sent} adet). Herkese göndermek için Vercel'e FROM_EMAIL ekleyin.`
        : `${sent} müşteriye başarıyla gönderildi.${failed > 0 ? ` ${failed} başarısız.` : ''}`,
    });

  } catch (error: unknown) {
    console.error('Broadcast Hatası:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Bilinmeyen hata' }, { status: 500 });
  }
}
