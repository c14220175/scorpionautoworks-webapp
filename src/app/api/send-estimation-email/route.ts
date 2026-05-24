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
      vehicleYear,
      serviceType,
      estimationItems,
      estimationTotal,
      bookingId,
      trackingCode,
      estimationNotes,
    } = body;

    console.log('[send-estimation-email] Request body:', JSON.stringify(body, null, 2));

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://scorpionautoworks.my.id';

    // Build estimation items table
    let itemsHtml = '';
    (estimationItems || []).forEach((item: any, index: number) => {
      itemsHtml += `
        <tr style="border-bottom: 1px solid #334155;">
          <td style="padding: 8px 4px; text-align: center; color: #cbd5e1 !important; -webkit-text-fill-color: #cbd5e1 !important;">${index + 1}</td>
          <td style="padding: 8px 4px; font-weight: bold; color: #e2e8f0 !important; -webkit-text-fill-color: #e2e8f0 !important;">${item.name}</td>
          <td style="padding: 8px 4px; color: #cbd5e1 !important; -webkit-text-fill-color: #cbd5e1 !important;">
            <span style="font-size: 10px; padding: 2px 6px; background-color: #334155; border-radius: 4px; color: #cbd5e1 !important; -webkit-text-fill-color: #cbd5e1 !important;">${item.type}</span>
          </td>
          <td style="padding: 8px 4px; text-align: right; color: #e2e8f0 !important; -webkit-text-fill-color: #e2e8f0 !important; font-weight: bold;">
            Rp ${(item.price || 0).toLocaleString("id-ID")}
          </td>
        </tr>
      `;
    });

    const emailSubject = `Estimasi Biaya Servis - ${customerName}`;

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
          <!--[if mso]>
          <noscript>
            <xml>
              <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
              </o:OfficeDocumentSettings>
            </xml>
          </noscript>
          <![endif]-->
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
                  <!-- Header with Logo -->
                  <tr>
                    <td align="center" bgcolor="#000000" style="background-color: #000000; background-image: linear-gradient(#000000, #000000); padding: 24px; border-radius: 8px 8px 0 0;">
                      <img src="https://scorpionautoworks.my.id/scorpionlogo.png" alt="Scorpion Autoworks" style="max-width: 280px; height: auto; display: block; margin: 0 auto;" />
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td bgcolor="#0f172a" style="background-color: #0f172a; background-image: linear-gradient(#0f172a, #0f172a); padding: 32px 24px;">
                      <h1 style="color: #e2e8f0 !important; -webkit-text-fill-color: #e2e8f0 !important; font-size: 22px; margin: 0 0 12px 0;">Halo, ${customerName}!</h1>
                      <p style="color: #94a3b8 !important; -webkit-text-fill-color: #94a3b8 !important; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
                        Berikut adalah <strong style="color: #eab308 !important; -webkit-text-fill-color: #eab308 !important;">estimasi biaya servis</strong> untuk kendaraan Anda di <strong style="color: #eab308 !important; -webkit-text-fill-color: #eab308 !important;">Scorpion Autoworks</strong>. Mohon review dan berikan persetujuan Anda.
                      </p>
                      
                      <!-- Data Kendaraan Card -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
                        <tr>
                          <td bgcolor="#1e293b" style="background-color: #1e293b; background-image: linear-gradient(#1e293b, #1e293b); border-left: 4px solid #eab308; padding: 16px; border-radius: 4px;">
                            <h3 style="color: #e2e8f0 !important; -webkit-text-fill-color: #e2e8f0 !important; font-size: 16px; margin: 0 0 12px 0;">🚗 Data Kendaraan</h3>
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 14px; color: #cbd5e1 !important; -webkit-text-fill-color: #cbd5e1 !important;">
                              <tr><td style="padding: 4px 0; font-weight: bold; width: 120px; color: #94a3b8 !important; -webkit-text-fill-color: #94a3b8 !important;">Kendaraan</td><td style="padding: 4px 0;">: ${vehicleInfo}</td></tr>
                              <tr><td style="padding: 4px 0; font-weight: bold; color: #94a3b8 !important; -webkit-text-fill-color: #94a3b8 !important;">Tahun</td><td style="padding: 4px 0;">: ${vehicleYear}</td></tr>
                              <tr><td style="padding: 4px 0; font-weight: bold; color: #94a3b8 !important; -webkit-text-fill-color: #94a3b8 !important;">Jenis Layanan</td><td style="padding: 4px 0;">: ${serviceType}</td></tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      ${trackingCode ? `
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
                        <tr>
                          <td bgcolor="#1e293b" style="background-color: #1e293b; background-image: linear-gradient(#1e293b, #1e293b); padding: 16px; border-radius: 4px; text-align: center; border: 2px dashed #10b981;">
                            <p style="color: #94a3b8 !important; -webkit-text-fill-color: #94a3b8 !important; font-size: 13px; margin: 0 0 8px 0;">Kode Pelacakan Anda:</p>
                            <h2 style="color: #10b981 !important; -webkit-text-fill-color: #10b981 !important; font-size: 28px; margin: 0; letter-spacing: 4px;">${trackingCode}</h2>
                          </td>
                        </tr>
                      </table>
                      ` : ''}

                      <!-- Estimation Table Card -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                        <tr>
                          <td bgcolor="#1e293b" style="background-color: #1e293b; background-image: linear-gradient(#1e293b, #1e293b); border-left: 4px solid #3b82f6; padding: 16px; border-radius: 4px;">
                            <h3 style="color: #e2e8f0 !important; -webkit-text-fill-color: #e2e8f0 !important; font-size: 16px; margin: 0 0 12px 0;">💰 Estimasi Biaya</h3>
                            
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 12px; color: #cbd5e1 !important; -webkit-text-fill-color: #cbd5e1 !important; border-collapse: collapse;">
                              <thead style="background-color: #0f172a; text-transform: uppercase; font-size: 10px; color: #94a3b8 !important; -webkit-text-fill-color: #94a3b8 !important;">
                                <tr>
                                  <th style="padding: 8px 4px; text-align: center;">No.</th>
                                  <th style="padding: 8px 4px; text-align: left;">Nama</th>
                                  <th style="padding: 8px 4px; text-align: left;">Jenis</th>
                                  <th style="padding: 8px 4px; text-align: right;">Harga</th>
                                </tr>
                              </thead>
                              <tbody>
                                ${itemsHtml}
                              </tbody>
                            </table>

                            <div style="margin-top: 16px; text-align: right; background-color: #0f172a; padding: 12px; border-radius: 4px; border: 1px solid #334155;">
                              <span style="color: #94a3b8 !important; -webkit-text-fill-color: #94a3b8 !important; font-weight: bold; font-size: 14px; margin-right: 12px;">Total Estimasi:</span>
                              <span style="color: #10b981 !important; -webkit-text-fill-color: #10b981 !important; font-weight: bold; font-size: 18px;">Rp ${(estimationTotal || 0).toLocaleString("id-ID")}</span>
                            </div>
                          </td>
                        </tr>
                      </table>

                      ${estimationNotes ? `
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                        <tr>
                          <td bgcolor="#1e293b" style="background-color: #1e293b; background-image: linear-gradient(#1e293b, #1e293b); border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px;">
                            <h3 style="color: #e2e8f0 !important; -webkit-text-fill-color: #e2e8f0 !important; font-size: 16px; margin: 0 0 12px 0;">📝 Keterangan</h3>
                            <p style="color: #cbd5e1 !important; -webkit-text-fill-color: #cbd5e1 !important; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${estimationNotes}</p>
                          </td>
                        </tr>
                      </table>
                      ` : ''}

                      <!-- Approval Buttons -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 24px; border-top: 1px solid #334155;">
                        <tr>
                          <td style="padding-top: 24px; text-align: center;">
                            <p style="color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; font-weight: bold; font-size: 16px; margin: 0 0 8px 0;">Apakah Anda menyetujui estimasi biaya di atas?</p>
                            <p style="color: #94a3b8 !important; -webkit-text-fill-color: #94a3b8 !important; font-size: 13px; margin: 0 0 20px 0;">Klik salah satu tombol di bawah untuk memberikan respon Anda.</p>
                            
                            <table border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                              <tr>
                                <td style="padding-right: 12px;">
                                  <a href="${baseUrl}/api/estimation-response?id=${bookingId}&choice=yes" 
                                     style="display: inline-block; background-color: #10b981; color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px;">✅ Setuju</a>
                                </td>
                                <td>
                                  <a href="${baseUrl}/api/estimation-response?id=${bookingId}&choice=no" 
                                     style="display: inline-block; background-color: #ef4444; color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px;">❌ Tolak</a>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      <hr style="border: none; border-top: 1px solid #334155; margin: 24px 0;" />
                      
                      <p style="color: #94a3b8 !important; -webkit-text-fill-color: #94a3b8 !important; font-size: 14px; margin: 0 0 8px 0;">Alamat bengkel:</p>
                      <p style="color: #e2e8f0 !important; -webkit-text-fill-color: #e2e8f0 !important; font-size: 14px; font-weight: bold; margin: 0 0 4px 0;">Scorpion Autoworks</p>
                      <p style="color: #94a3b8 !important; -webkit-text-fill-color: #94a3b8 !important; font-size: 13px; line-height: 1.5; margin: 0 0 8px 0;">Jl. Galaksi Klampis Asri Selatan II Blok L2 No. 55, RT.O/ RW.O, Medokan Semampir, SUKOLILO, KOTA SURABAYA, JAWA TIMUR</p>
                      <a href="https://maps.app.goo.gl/WaNjjFnWs564HRX98?g_st=ipc" style="color: #60a5fa !important; -webkit-text-fill-color: #60a5fa !important; font-size: 13px; text-decoration: underline;">📍 Buka di Google Maps</a>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td align="center" bgcolor="#000000" style="background-color: #000000; background-image: linear-gradient(#000000, #000000); padding: 20px 24px; border-radius: 0 0 8px 8px;">
                      <p style="color: #64748b !important; -webkit-text-fill-color: #64748b !important; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Scorpion Autoworks. All rights reserved.</p>
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
      console.error('[send-estimation-email] Resend error:', JSON.stringify(error, null, 2));
      return NextResponse.json({ error }, { status: 400 });
    }

    console.log('[send-estimation-email] Email sent successfully:', JSON.stringify(data, null, 2));
    return NextResponse.json({ data });
  } catch (error) {
    console.error('[send-estimation-email] Catch error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
