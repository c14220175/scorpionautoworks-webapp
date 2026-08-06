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
      estimationMessage,
      bookingId,
      trackingCode,
      // Legacy support for old format
      estimationItems,
      estimationTotal,
      estimationNotes,
    } = body;

    console.log('[send-estimation-email] Request body:', JSON.stringify(body, null, 2));

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://scorpionautoworks.my.id';

    // Determine which format to use
    const isMessageOnly = !!estimationMessage;

    // Build estimation content based on format
    let estimationContentHtml = '';

    if (isMessageOnly) {
      // New format: message only
      estimationContentHtml = `
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
          <tr>
            <td bgcolor="#ffffff" style="background-color: #ffffff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 4px; border: 1px solid #e2e8f0;">
              <h3 style="color: #0f172a !important; -webkit-text-fill-color: #0f172a !important; font-size: 16px; margin: 0 0 12px 0;">💰 Penawaran Harga</h3>
              <p style="color: #334155 !important; -webkit-text-fill-color: #334155 !important; font-size: 14px; line-height: 1.8; margin: 0; white-space: pre-wrap;">${estimationMessage}</p>
            </td>
          </tr>
        </table>
      `;
    } else {
      // Legacy format: items table
      let itemsHtml = '';
      (estimationItems || []).forEach((item: any, index: number) => {
        itemsHtml += `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px 4px; text-align: center; color: #334155 !important; -webkit-text-fill-color: #334155 !important;">${index + 1}</td>
            <td style="padding: 8px 4px; font-weight: bold; color: #0f172a !important; -webkit-text-fill-color: #0f172a !important;">${item.name}</td>
            <td style="padding: 8px 4px; color: #334155 !important; -webkit-text-fill-color: #334155 !important;">
              <span style="font-size: 10px; padding: 2px 6px; background-color: #e2e8f0; border-radius: 4px; color: #475569 !important; -webkit-text-fill-color: #475569 !important;">${item.type}</span>
            </td>
            <td style="padding: 8px 4px; text-align: right; color: #0f172a !important; -webkit-text-fill-color: #0f172a !important; font-weight: bold;">
              Rp ${(item.price || 0).toLocaleString("id-ID")}
            </td>
          </tr>
        `;
      });

      estimationContentHtml = `
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
          <tr>
            <td bgcolor="#ffffff" style="background-color: #ffffff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 4px; border: 1px solid #e2e8f0;">
              <h3 style="color: #0f172a !important; -webkit-text-fill-color: #0f172a !important; font-size: 16px; margin: 0 0 12px 0;">💰 Penawaran Harga</h3>
              
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 12px; color: #334155 !important; -webkit-text-fill-color: #334155 !important; border-collapse: collapse;">
                <thead style="background-color: #f8fafc; text-transform: uppercase; font-size: 10px; color: #64748b !important; -webkit-text-fill-color: #64748b !important;">
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

              <div style="margin-top: 16px; text-align: right; background-color: #f0fdf4; padding: 12px; border-radius: 4px; border: 1px solid #d1fae5;">
                <span style="color: #475569 !important; -webkit-text-fill-color: #475569 !important; font-weight: bold; font-size: 14px; margin-right: 12px;">Total Penawaran:</span>
                <span style="color: #059669 !important; -webkit-text-fill-color: #059669 !important; font-weight: bold; font-size: 18px;">Rp ${(estimationTotal || 0).toLocaleString("id-ID")}</span>
              </div>
            </td>
          </tr>
        </table>

        ${estimationNotes ? `
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
          <tr>
            <td bgcolor="#fffbeb" style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px; border: 1px solid #fde68a;">
              <h3 style="color: #92400e !important; -webkit-text-fill-color: #92400e !important; font-size: 16px; margin: 0 0 12px 0;">📝 Keterangan</h3>
              <p style="color: #334155 !important; -webkit-text-fill-color: #334155 !important; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${estimationNotes}</p>
            </td>
          </tr>
        </table>
        ` : ''}
      `;
    }

    const emailSubject = `Penawaran Harga Servis - ${customerName}`;

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
                  <!-- Header with Logo -->
                  <tr>
                    <td align="center" bgcolor="#000000" style="background-color: #000000; background-image: linear-gradient(#000000, #000000); padding: 24px; border-radius: 8px 8px 0 0;">
                      <img src="https://scorpionautoworks.my.id/scorpionlogo.png" alt="Scorpion Autoworks" style="max-width: 280px; height: auto; display: block; margin: 0 auto;" />
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td bgcolor="#ffffff" style="background-color: #ffffff; padding: 32px 24px;">
                      <h1 style="color: #0f172a !important; -webkit-text-fill-color: #0f172a !important; font-size: 22px; margin: 0 0 12px 0;">Halo, ${customerName}!</h1>
                      <p style="color: #475569 !important; -webkit-text-fill-color: #475569 !important; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
                        Berikut adalah <strong style="color: #b45309 !important; -webkit-text-fill-color: #b45309 !important;">penawaran harga servis</strong> untuk kendaraan Anda di <strong style="color: #b45309 !important; -webkit-text-fill-color: #b45309 !important;">Scorpion Autoworks</strong>. Mohon review dan berikan persetujuan Anda.
                      </p>
                      
                      <!-- Data Kendaraan Card -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
                        <tr>
                          <td bgcolor="#ffffff" style="background-color: #ffffff; border-left: 4px solid #b45309; padding: 16px; border-radius: 4px; border: 1px solid #e2e8f0;">
                            <h3 style="color: #0f172a !important; -webkit-text-fill-color: #0f172a !important; font-size: 16px; margin: 0 0 12px 0;">🚗 Data Kendaraan</h3>
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 14px; color: #334155 !important; -webkit-text-fill-color: #334155 !important;">
                              <tr><td style="padding: 4px 0; font-weight: bold; width: 120px; color: #64748b !important; -webkit-text-fill-color: #64748b !important;">Kendaraan</td><td style="padding: 4px 0;">: ${vehicleInfo}</td></tr>
                              <tr><td style="padding: 4px 0; font-weight: bold; color: #64748b !important; -webkit-text-fill-color: #64748b !important;">Tahun</td><td style="padding: 4px 0;">: ${vehicleYear}</td></tr>
                              <tr><td style="padding: 4px 0; font-weight: bold; color: #64748b !important; -webkit-text-fill-color: #64748b !important;">Jenis Layanan</td><td style="padding: 4px 0;">: ${serviceType}</td></tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      ${trackingCode ? `
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
                        <tr>
                          <td bgcolor="#f0fdf4" style="background-color: #f0fdf4; padding: 16px; border-radius: 4px; text-align: center; border: 2px dashed #10b981;">
                            <p style="color: #475569 !important; -webkit-text-fill-color: #475569 !important; font-size: 13px; margin: 0 0 8px 0;">Kode Pelacakan Anda:</p>
                            <h2 style="color: #059669 !important; -webkit-text-fill-color: #059669 !important; font-size: 28px; margin: 0; letter-spacing: 4px;">${trackingCode}</h2>
                          </td>
                        </tr>
                      </table>
                      ` : ''}

                      <!-- Estimation Content -->
                      ${estimationContentHtml}

                      <!-- Approval Buttons -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 24px; border-top: 1px solid #e2e8f0;">
                        <tr>
                          <td style="padding-top: 24px; text-align: center;">
                            <p style="color: #0f172a !important; -webkit-text-fill-color: #0f172a !important; font-weight: bold; font-size: 16px; margin: 0 0 8px 0;">Apakah Anda menyetujui penawaran di atas?</p>
                            <p style="color: #64748b !important; -webkit-text-fill-color: #64748b !important; font-size: 13px; margin: 0 0 20px 0;">Klik salah satu tombol di bawah untuk memberikan respon Anda.</p>
                            
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

                      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                      
                      <p style="color: #475569 !important; -webkit-text-fill-color: #475569 !important; font-size: 14px; margin: 0 0 8px 0;">Alamat bengkel:</p>
                      <p style="color: #0f172a !important; -webkit-text-fill-color: #0f172a !important; font-size: 14px; font-weight: bold; margin: 0 0 4px 0;">Scorpion Autoworks</p>
                      <p style="color: #475569 !important; -webkit-text-fill-color: #475569 !important; font-size: 13px; line-height: 1.5; margin: 0 0 8px 0;">Jl. Galaksi Klampis Asri Selatan II Blok L2 No. 55, RT.O/ RW.O, Medokan Semampir, SUKOLILO, KOTA SURABAYA, JAWA TIMUR</p>
                      <a href="https://maps.app.goo.gl/WaNjjFnWs564HRX98?g_st=ipc" style="color: #2563eb !important; -webkit-text-fill-color: #2563eb !important; font-size: 13px; text-decoration: underline;">📍 Buka di Google Maps</a>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td align="center" bgcolor="#1e293b" style="background-color: #1e293b; padding: 20px 24px; border-radius: 0 0 8px 8px;">
                      <p style="color: #94a3b8 !important; -webkit-text-fill-color: #94a3b8 !important; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Scorpion Autoworks. All rights reserved.</p>
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
