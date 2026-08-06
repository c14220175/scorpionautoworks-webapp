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
      dpAmount
    } = body;

    console.log('[send-dp-invoice-email] Request body:', JSON.stringify(body, null, 2));

    if (!customerEmail) {
        return NextResponse.json({ error: 'Customer email is required' }, { status: 400 });
    }

    const emailSubject = `Kuitansi Pembayaran DP - Scorpion Autoworks`;

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
          <meta name="color-scheme" content="light">
          <meta name="supported-color-schemes" content="light">
          <title>${emailSubject}</title>
          <style>
            :root {
              color-scheme: light;
              supported-color-schemes: light;
            }
          </style>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f1f5f9; color: #1e293b !important; -webkit-text-fill-color: #1e293b !important; -webkit-font-smoothing: antialiased;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f1f5f9" style="background-color: #f1f5f9; background-image: linear-gradient(#f1f5f9, #f1f5f9);">
            <tr>
              <td align="center" style="padding: 20px 0;">
                <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; font-family: Arial, Helvetica, sans-serif; border-collapse: collapse;">
                  <!-- Header -->
                  <tr>
                    <td align="center" bgcolor="#000000" style="background-color: #000000; padding: 24px; border-radius: 8px 8px 0 0;">
                      <img src="https://scorpionautoworks.my.id/scorpionlogolight.png" alt="Scorpion Autoworks" style="max-width: 280px; height: auto; display: block; margin: 0 auto;" />
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td bgcolor="#ffffff" style="background-color: #ffffff; padding: 32px 24px;">
                      <h1 style="color: #0f172a !important; font-size: 22px; margin: 0 0 12px 0;">Halo, ${customerName}!</h1>
                      <p style="color: #475569 !important; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
                        Pembayaran DP (Down Payment) untuk pesanan Part Inden kendaraan Anda (${vehicleInfo}) telah <strong>berhasil diverifikasi</strong>.
                      </p>
                      
                      ${dpAmount && dpAmount > 0 ? `
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                        <tr>
                          <td bgcolor="#f0fdf4" style="background-color: #f0fdf4; border: 1px solid #10b981; padding: 16px; border-radius: 4px; text-align: center;">
                            <p style="color: #475569 !important; font-size: 14px; margin: 0 0 8px 0;">Total DP yang telah dibayar:</p>
                            <p style="color: #059669 !important; font-size: 24px; font-weight: bold; margin: 0;">Rp ${dpAmount.toLocaleString('id-ID')}</p>
                          </td>
                        </tr>
                      </table>
                      ` : ''}
                      
                      <p style="color: #475569 !important; font-size: 14px; margin: 0 0 24px 0;">
                        Part pesanan Anda sedang kami proses dan segera kami informasikan kembali jika part sudah tiba di bengkel.
                      </p>

                      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                      
                      <p style="color: #475569 !important; font-size: 14px; margin: 0 0 8px 0;">Alamat bengkel:</p>
                      <p style="color: #0f172a !important; font-size: 14px; font-weight: bold; margin: 0 0 4px 0;">Scorpion Autoworks</p>
                      <p style="color: #475569 !important; font-size: 13px; line-height: 1.5; margin: 0 0 8px 0;">Jl. Galaksi Klampis Asri Selatan II Blok L2 No. 55, RT.O/ RW.O, Medokan Semampir, SUKOLILO, KOTA SURABAYA, JAWA TIMUR</p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td align="center" bgcolor="#1e293b" style="background-color: #1e293b; padding: 20px 24px; border-radius: 0 0 8px 8px;">
                      <p style="color: #94a3b8 !important; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Scorpion Autoworks. All rights reserved.</p>
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
      console.error('[send-dp-invoice-email] Resend error:', JSON.stringify(error, null, 2));
      return NextResponse.json({ error }, { status: 400 });
    }

    console.log('[send-dp-invoice-email] Email sent successfully:', JSON.stringify(data, null, 2));
    return NextResponse.json({ data });
  } catch (error) {
    console.error('[send-dp-invoice-email] Catch error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
