import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      customerName, 
      customerEmail, 
      vehicleInfo,
      rescheduleLink
    } = body;

    console.log('[send-reschedule-link-email] Request body:', JSON.stringify(body, null, 2));

    if (!customerEmail) {
        return NextResponse.json({ error: 'Customer email is required' }, { status: 400 });
    }

    const emailSubject = `Part Pesanan Tiba - Pilih Jadwal Servis Anda - Scorpion Autoworks`;

    const { data, error } = await resend.emails.send({
      from: 'Scorpion Autoworks <admin@scorpionautoworks.my.id>',
      to: [customerEmail],
      subject: emailSubject,
      html: `
        <!DOCTYPE html>
        <html lang="id" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta name="color-scheme" content="dark">
          <meta name="supported-color-schemes" content="dark">
          <title>${emailSubject}</title>
          <style>
            :root {
              color-scheme: dark;
              supported-color-schemes: dark;
            }
          </style>
        </head>
        <body style="margin: 0; padding: 0; background-color: #0f172a; color: #e2e8f0 !important; -webkit-text-fill-color: #e2e8f0 !important; -webkit-font-smoothing: antialiased;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#0f172a" style="background-color: #0f172a; background-image: linear-gradient(#0f172a, #0f172a);">
            <tr>
              <td align="center" style="padding: 20px 0;">
                <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; font-family: Arial, Helvetica, sans-serif; border-collapse: collapse;">
                  <!-- Header -->
                  <tr>
                    <td align="center" bgcolor="#000000" style="background-color: #000000; padding: 24px; border-radius: 8px 8px 0 0;">
                      <img src="https://scorpionautoworks.my.id/scorpionlogo.png" alt="Scorpion Autoworks" style="max-width: 280px; height: auto; display: block; margin: 0 auto;" />
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td bgcolor="#0f172a" style="background-color: #0f172a; padding: 32px 24px;">
                      <h1 style="color: #e2e8f0 !important; font-size: 22px; margin: 0 0 12px 0;">Halo, ${customerName}!</h1>
                      <p style="color: #94a3b8 !important; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
                        Kabar baik! Part inden pesanan Anda untuk kendaraan (${vehicleInfo}) <strong>telah tiba</strong> di bengkel kami.
                      </p>
                      
                      <!-- Action Card -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                        <tr>
                          <td bgcolor="#1e293b" style="background-color: #1e293b; border-left: 4px solid #10b981; padding: 24px; border-radius: 4px; text-align: center;">
                            <p style="color: #cbd5e1 !important; font-size: 14px; margin: 0 0 16px 0;">
                              Silakan tentukan jadwal kedatangan Anda ke bengkel untuk melanjutkan perbaikan dengan mengklik tombol di bawah ini:
                            </p>
                            <a href="${rescheduleLink}" style="display: inline-block; background-color: #10b981; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                              Pilih Jadwal Kedatangan
                            </a>
                            <p style="color: #64748b !important; font-size: 12px; margin: 16px 0 0 0;">
                              Atau gunakan link ini: <br/>
                              <a href="${rescheduleLink}" style="color: #10b981 !important; word-break: break-all;">${rescheduleLink}</a>
                            </p>
                          </td>
                        </tr>
                      </table>
                      
                      <hr style="border: none; border-top: 1px solid #334155; margin: 24px 0;" />
                      
                      <p style="color: #94a3b8 !important; font-size: 14px; margin: 0 0 8px 0;">Alamat bengkel:</p>
                      <p style="color: #e2e8f0 !important; font-size: 14px; font-weight: bold; margin: 0 0 4px 0;">Scorpion Autoworks</p>
                      <p style="color: #94a3b8 !important; font-size: 13px; line-height: 1.5; margin: 0 0 8px 0;">Jl. Galaksi Klampis Asri Selatan II Blok L2 No. 55, RT.O/ RW.O, Medokan Semampir, SUKOLILO, KOTA SURABAYA, JAWA TIMUR</p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td align="center" bgcolor="#000000" style="padding: 20px 24px; border-radius: 0 0 8px 8px;">
                      <p style="color: #64748b !important; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Scorpion Autoworks. All rights reserved.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('[send-reschedule-link-email] Resend error:', JSON.stringify(error, null, 2));
      return NextResponse.json({ error }, { status: 400 });
    }

    console.log('[send-reschedule-link-email] Email sent successfully:', JSON.stringify(data, null, 2));
    return NextResponse.json({ data });
  } catch (error) {
    console.error('[send-reschedule-link-email] Catch error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
