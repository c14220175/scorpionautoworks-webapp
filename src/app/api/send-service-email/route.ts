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
      currentPhase, 
      isCompleted, 
      invoiceItems, 
      totalBayar,
      trackingCode,
      // New checkup parameters
      isCheckupResult,
      hasIssues,
      checkupDesc,
      checkupImage,
      bookingId
    } = body;

    console.log('[send-service-email] Request body:', JSON.stringify(body, null, 2));

    let emailSubject = `Update Progres Servis - ${customerName}`;
    if (isCompleted) {
      emailSubject = `Servis Selesai & Invoice - ${customerName}`;
    }
    if (isCheckupResult && hasIssues) {
      emailSubject = `Hasil Pengecekan Kendaraan - ${customerName}`;
    }
    if (isCheckupResult && !hasIssues) {
      emailSubject = `Pengecekan Selesai - Mobil Siap Diambil - ${customerName}`;
    }

    let invoiceHtml = '';
    if (isCompleted && invoiceItems && invoiceItems.length > 0) {
      let itemsHtml = '';
      invoiceItems.forEach((item: any, index: number) => {
        itemsHtml += `
          <tr style="border-bottom: 1px solid #334155;">
            <td style="padding: 8px 4px; text-align: center;">${index + 1}</td>
            <td style="padding: 8px 4px; font-weight: bold; color: #e2e8f0 !important; -webkit-text-fill-color: #e2e8f0 !important;">${item.name}</td>
            <td style="padding: 8px 4px;">
              <span style="font-size: 10px; padding: 2px 6px; background-color: #334155; border-radius: 4px; color: #cbd5e1 !important; -webkit-text-fill-color: #cbd5e1 !important;">${item.type}</span>
            </td>
            <td style="padding: 8px 4px; text-align: center;">${item.qty}</td>
            <td style="padding: 8px 4px; text-align: right;">Rp ${item.price.toLocaleString("id-ID")}</td>
            <td style="padding: 8px 4px; text-align: right; color: #e2e8f0 !important; -webkit-text-fill-color: #e2e8f0 !important; font-weight: bold;">
              Rp ${(item.price * item.qty).toLocaleString("id-ID")}
            </td>
          </tr>
        `;
      });

      invoiceHtml = `
        <!-- Invoice Card -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
          <tr>
            <td bgcolor="#1e293b" style="background-color: #1e293b; background-image: linear-gradient(#1e293b, #1e293b); border-left: 4px solid #10b981; padding: 16px; border-radius: 4px;">
              <h3 style="color: #e2e8f0 !important; -webkit-text-fill-color: #e2e8f0 !important; font-size: 16px; margin: 0 0 12px 0;">🧾 Copy Invoice</h3>
              
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 12px; color: #cbd5e1 !important; -webkit-text-fill-color: #cbd5e1 !important; border-collapse: collapse;">
                <thead style="background-color: #0f172a; text-transform: uppercase; font-size: 10px; color: #94a3b8 !important; -webkit-text-fill-color: #94a3b8 !important;">
                  <tr>
                    <th style="padding: 8px 4px; text-align: center;">No.</th>
                    <th style="padding: 8px 4px; text-align: left;">Nama</th>
                    <th style="padding: 8px 4px; text-align: left;">Jenis</th>
                    <th style="padding: 8px 4px; text-align: center;">Jumlah</th>
                    <th style="padding: 8px 4px; text-align: right;">Harga Satuan</th>
                    <th style="padding: 8px 4px; text-align: right;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>

              <div style="margin-top: 16px; text-align: right; background-color: #0f172a; padding: 12px; border-radius: 4px; border: 1px solid #334155;">
                <span style="color: #94a3b8 !important; -webkit-text-fill-color: #94a3b8 !important; font-weight: bold; font-size: 14px; margin-right: 12px;">Total Keseluruhan:</span>
                <span style="color: #10b981 !important; -webkit-text-fill-color: #10b981 !important; font-weight: bold; font-size: 18px;">Rp ${(totalBayar || 0).toLocaleString("id-ID")}</span>
              </div>
            </td>
          </tr>
        </table>
      `;
    }

    // Card Kode Lacak (hanya tampil saat servis belum selesai dan ada tracking code)
    const trackingCodeHtml = !isCompleted && trackingCode ? `
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
        <tr>
          <td bgcolor="#1e293b" style="background-color: #1e293b; background-image: linear-gradient(#1e293b, #1e293b); padding: 16px; border-radius: 4px; text-align: center; border: 2px dashed #10b981;">
            <p style="color: #94a3b8 !important; -webkit-text-fill-color: #94a3b8 !important; font-size: 13px; margin: 0 0 8px 0;">Kode Pelacakan Anda:</p>
            <h2 style="color: #10b981 !important; -webkit-text-fill-color: #10b981 !important; font-size: 28px; margin: 0; letter-spacing: 4px;">${trackingCode}</h2>
            <p style="color: #64748b !important; -webkit-text-fill-color: #64748b !important; font-size: 11px; margin: 8px 0 0 0;">Gunakan kode ini di website kami untuk cek progres tanpa login.</p>
          </td>
        </tr>
      </table>
    ` : '';

    // ====== CHECKUP RESULT HTML ======
    let checkupHtml = '';
    if (isCheckupResult && hasIssues) {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://scorpionautoworks.my.id';
      
      checkupHtml = `
        <!-- Checkup Result Card -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
          <tr>
            <td bgcolor="#1e293b" style="background-color: #1e293b; background-image: linear-gradient(#1e293b, #1e293b); border-left: 4px solid #eab308; padding: 20px; border-radius: 4px;">
              <h3 style="color: #eab308 !important; -webkit-text-fill-color: #eab308 !important; font-size: 16px; margin: 0 0 12px 0;">🔍 Hasil Pengecekan (General Checkup)</h3>
              <p style="color: #e2e8f0 !important; -webkit-text-fill-color: #e2e8f0 !important; font-size: 14px; margin: 0 0 8px 0;">Ditemukan beberapa kendala pada kendaraan Anda:</p>
              
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 16px;">
                <tr>
                  <td bgcolor="#0f172a" style="background-color: #0f172a; background-image: linear-gradient(#0f172a, #0f172a); padding: 15px; border-radius: 4px; border: 1px solid #334155;">
                    <p style="color: #cbd5e1 !important; -webkit-text-fill-color: #cbd5e1 !important; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${checkupDesc}</p>
                  </td>
                </tr>
              </table>

              ${checkupImage ? `
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 16px;">
                  <tr>
                    <td style="text-align: center;">
                      <img src="${checkupImage}" alt="Foto Kendala" style="width: 100%; max-width: 400px; border-radius: 8px; border: 1px solid #334155;" />
                    </td>
                  </tr>
                </table>
              ` : ''}
              
              <!-- Question & Buttons -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 20px; border-top: 1px solid #334155;">
                <tr>
                  <td style="padding-top: 20px; text-align: center;">
                    <p style="color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; font-weight: bold; font-size: 15px; margin: 0 0 16px 0;">Lanjut Reparasi / Servis?</p>
                    
                    <table border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                      <tr>
                        <td style="padding-right: 12px;">
                          <a href="${baseUrl}/api/checkup-response?id=${bookingId}&choice=yes" 
                             style="display: inline-block; background-color: #10b981; color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">Ya</a>
                        </td>
                        <td>
                          <a href="${baseUrl}/api/checkup-response?id=${bookingId}&choice=no" 
                             style="display: inline-block; background-color: #ef4444; color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">Tidak</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      `;
    }

    // Determine the main message
    let mainMessage = '';
    if (isCheckupResult && !hasIssues) {
      mainMessage = `Pengecekan kendaraan Anda di <strong style="color: #eab308 !important; -webkit-text-fill-color: #eab308 !important;">Scorpion Autoworks</strong> telah selesai dan tidak ditemukan kendala. Kendaraan Anda siap untuk diambil.`;
    } else if (isCheckupResult && hasIssues) {
      mainMessage = `Pengecekan kendaraan Anda di <strong style="color: #eab308 !important; -webkit-text-fill-color: #eab308 !important;">Scorpion Autoworks</strong> telah selesai. Namun, ditemukan beberapa kendala yang perlu Anda ketahui.`;
    } else if (isCompleted) {
      mainMessage = `Servis untuk kendaraan Anda di <strong style="color: #eab308 !important; -webkit-text-fill-color: #eab308 !important;">Scorpion Autoworks</strong> telah selesai.`;
    } else {
      mainMessage = `Berikut adalah update terbaru mengenai progres servis kendaraan Anda di <strong style="color: #eab308 !important; -webkit-text-fill-color: #eab308 !important;">Scorpion Autoworks</strong>.`;
    }

    // Completion message
    let completionMessage = '';
    if (isCompleted) {
      completionMessage = `<p style="color: #10b981 !important; -webkit-text-fill-color: #10b981 !important; font-size: 16px; font-weight: bold; text-align: center; margin: 32px 0 16px 0;">✅ Mobil sudah selesai.</p>`;
    } else if (isCheckupResult && !hasIssues) {
      completionMessage = `<p style="color: #10b981 !important; -webkit-text-fill-color: #10b981 !important; font-size: 16px; font-weight: bold; text-align: center; margin: 32px 0 16px 0;">✅ Mobil siap diambil — tidak ditemukan kendala.</p>`;
    }

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
                        ${mainMessage}
                      </p>
                      
                      <!-- Data Kendaraan Card -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
                        <tr>
                          <td bgcolor="#1e293b" style="background-color: #1e293b; background-image: linear-gradient(#1e293b, #1e293b); border-left: 4px solid #eab308; padding: 16px; border-radius: 4px;">
                            <h3 style="color: #e2e8f0 !important; -webkit-text-fill-color: #e2e8f0 !important; font-size: 16px; margin: 0 0 12px 0;">🚗 Data Kendaraan</h3>
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 14px; color: #cbd5e1 !important; -webkit-text-fill-color: #cbd5e1 !important;">
                              <tr><td style="padding: 4px 0; font-weight: bold; width: 120px; color: #94a3b8 !important; -webkit-text-fill-color: #94a3b8 !important;">Kendaraan</td><td style="padding: 4px 0;">: ${vehicleInfo}</td></tr>
                              <tr><td style="padding: 4px 0; font-weight: bold; color: #94a3b8 !important; -webkit-text-fill-color: #94a3b8 !important;">Tahun</td><td style="padding: 4px 0;">: ${vehicleYear}</td></tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      ${trackingCodeHtml}

                      <!-- Detail Layanan Card -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                        <tr>
                          <td bgcolor="#1e293b" style="background-color: #1e293b; background-image: linear-gradient(#1e293b, #1e293b); border-left: 4px solid #3b82f6; padding: 16px; border-radius: 4px;">
                            <h3 style="color: #e2e8f0 !important; -webkit-text-fill-color: #e2e8f0 !important; font-size: 16px; margin: 0 0 12px 0;">🔧 Detail Layanan</h3>
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 14px; color: #cbd5e1 !important; -webkit-text-fill-color: #cbd5e1 !important;">
                              <tr><td style="padding: 4px 0; font-weight: bold; width: 130px; color: #94a3b8 !important; -webkit-text-fill-color: #94a3b8 !important;">Jenis Layanan</td><td style="padding: 4px 0;">: ${serviceType}</td></tr>
                              <tr><td style="padding: 4px 0; font-weight: bold; color: #94a3b8 !important; -webkit-text-fill-color: #94a3b8 !important;">Fase Pengerjaan</td><td style="padding: 4px 0; font-weight: bold; color: #10b981 !important; -webkit-text-fill-color: #10b981 !important;">: ${currentPhase}</td></tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      ${checkupHtml}

                      ${invoiceHtml}

                      ${completionMessage}

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
      console.error('[send-service-email] Resend error:', JSON.stringify(error, null, 2));
      return NextResponse.json({ error }, { status: 400 });
    }

    console.log('[send-service-email] Email sent successfully:', JSON.stringify(data, null, 2));
    return NextResponse.json({ data });
  } catch (error) {
    console.error('[send-service-email] Catch error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
