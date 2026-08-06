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
      bookingId,
      isCancelled,
      isLanjutAdmin
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
    if (isCancelled) {
      emailSubject = `Pembatalan Servis - ${customerName}`;
    }
    if (isLanjutAdmin) {
      emailSubject = `Perbaikan Dilanjutkan (Part Telah Tiba) - ${customerName}`;
    }

    let invoiceHtml = '';
    if (isCompleted && invoiceItems && invoiceItems.length > 0) {
      let itemsHtml = '';
      let subtotal = 0;
      let dpDeduction = 0;

      invoiceItems.forEach((item: any, index: number) => {
        if (item.type === 'DP-Deduction') {
          dpDeduction += Math.abs(item.price * item.qty);
        } else {
          subtotal += (item.price * item.qty);
        }

        itemsHtml += `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px 4px; text-align: center; color: #334155 !important; -webkit-text-fill-color: #334155 !important;">${index + 1}</td>
            <td style="padding: 8px 4px; font-weight: bold; color: #0f172a !important; -webkit-text-fill-color: #0f172a !important;">${item.name}</td>
            <td style="padding: 8px 4px;">
              <span style="font-size: 10px; padding: 2px 6px; background-color: #e2e8f0; border-radius: 4px; color: #475569 !important; -webkit-text-fill-color: #475569 !important;">${item.type}</span>
            </td>
            <td style="padding: 8px 4px; text-align: center; color: #334155 !important; -webkit-text-fill-color: #334155 !important;">${item.qty}</td>
            <td style="padding: 8px 4px; text-align: right; color: #334155 !important; -webkit-text-fill-color: #334155 !important;">Rp ${item.price.toLocaleString("id-ID")}</td>
            <td style="padding: 8px 4px; text-align: right; color: #0f172a !important; -webkit-text-fill-color: #0f172a !important; font-weight: bold;">
              Rp ${(item.price * item.qty).toLocaleString("id-ID")}
            </td>
          </tr>
        `;
      });

      invoiceHtml = `
        <!-- Invoice Card -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
          <tr>
            <td bgcolor="#ffffff" style="background-color: #ffffff; border-left: 4px solid #10b981; padding: 16px; border-radius: 4px; border: 1px solid #e2e8f0;">
              <h3 style="color: #0f172a !important; -webkit-text-fill-color: #0f172a !important; font-size: 16px; margin: 0 0 12px 0;">🧾 Copy Invoice</h3>
              
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 12px; color: #334155 !important; -webkit-text-fill-color: #334155 !important; border-collapse: collapse;">
                <thead style="background-color: #f8fafc; text-transform: uppercase; font-size: 10px; color: #64748b !important; -webkit-text-fill-color: #64748b !important;">
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

              <div style="margin-top: 16px; background-color: #f0fdf4; padding: 12px; border-radius: 4px; border: 1px solid #d1fae5;">
                ${dpDeduction > 0 ? `
                <div style="text-align: right; margin-bottom: 8px;">
                  <span style="color: #475569 !important; -webkit-text-fill-color: #475569 !important; font-size: 14px; margin-right: 12px;">Subtotal:</span>
                  <span style="color: #0f172a !important; -webkit-text-fill-color: #0f172a !important; font-weight: bold; font-size: 14px;">Rp ${subtotal.toLocaleString("id-ID")}</span>
                </div>
                <div style="text-align: right; margin-bottom: 12px; border-bottom: 1px solid #d1fae5; padding-bottom: 12px;">
                  <span style="color: #475569 !important; -webkit-text-fill-color: #475569 !important; font-size: 14px; margin-right: 12px;">DP yang telah dibayar:</span>
                  <span style="color: #dc2626 !important; -webkit-text-fill-color: #dc2626 !important; font-weight: bold; font-size: 14px;">- Rp ${dpDeduction.toLocaleString("id-ID")}</span>
                </div>
                ` : ''}
                <div style="text-align: right;">
                  <span style="color: #475569 !important; -webkit-text-fill-color: #475569 !important; font-weight: bold; font-size: 14px; margin-right: 12px;">${dpDeduction > 0 ? 'Sisa Tagihan' : 'Total Keseluruhan'}:</span>
                  <span style="color: #059669 !important; -webkit-text-fill-color: #059669 !important; font-weight: bold; font-size: 18px;">Rp ${(totalBayar || 0).toLocaleString("id-ID")}</span>
                </div>
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
          <td bgcolor="#f0fdf4" style="background-color: #f0fdf4; padding: 16px; border-radius: 4px; text-align: center; border: 2px dashed #10b981;">
            <p style="color: #475569 !important; -webkit-text-fill-color: #475569 !important; font-size: 13px; margin: 0 0 8px 0;">Kode Pelacakan Anda:</p>
            <h2 style="color: #059669 !important; -webkit-text-fill-color: #059669 !important; font-size: 28px; margin: 0; letter-spacing: 4px;">${trackingCode}</h2>
            <p style="color: #94a3b8 !important; -webkit-text-fill-color: #94a3b8 !important; font-size: 11px; margin: 8px 0 0 0;">Gunakan kode ini di website kami untuk cek progres tanpa login.</p>
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
            <td bgcolor="#fffbeb" style="background-color: #fffbeb; border-left: 4px solid #b45309; padding: 20px; border-radius: 4px; border: 1px solid #fde68a;">
              <h3 style="color: #92400e !important; -webkit-text-fill-color: #92400e !important; font-size: 16px; margin: 0 0 12px 0;">🔍 Hasil Pengecekan (General Checkup)</h3>
              <p style="color: #0f172a !important; -webkit-text-fill-color: #0f172a !important; font-size: 14px; margin: 0 0 8px 0;">Ditemukan beberapa kendala pada kendaraan Anda:</p>
              
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 16px;">
                <tr>
                  <td bgcolor="#ffffff" style="background-color: #ffffff; padding: 15px; border-radius: 4px; border: 1px solid #e2e8f0;">
                    <p style="color: #334155 !important; -webkit-text-fill-color: #334155 !important; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${checkupDesc}</p>
                  </td>
                </tr>
              </table>

              ${checkupImage ? `
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 16px;">
                  <tr>
                    <td style="text-align: center;">
                      <img src="${checkupImage}" alt="Foto Kendala" style="width: 100%; max-width: 400px; border-radius: 8px; border: 1px solid #e2e8f0;" />
                    </td>
                  </tr>
                </table>
              ` : ''}
              
              <!-- Question & Buttons -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 20px; border-top: 1px solid #fde68a;">
                <tr>
                  <td style="padding-top: 20px; text-align: center;">
                    <p style="color: #0f172a !important; -webkit-text-fill-color: #0f172a !important; font-weight: bold; font-size: 15px; margin: 0 0 16px 0;">Lanjut Reparasi / Servis?</p>
                    
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

    let mainMessage = '';
    if (isCancelled) {
      mainMessage = `Layanan servis untuk kendaraan Anda di <strong style="color: #b45309 !important; -webkit-text-fill-color: #b45309 !important;">Scorpion Autoworks</strong> telah dibatalkan karena penolakan penawaran harga atau atas permintaan Anda. Silakan hubungi admin untuk pengambilan kendaraan.`;
    } else if (isLanjutAdmin) {
      mainMessage = `Kabar baik! Part inden pesanan Anda telah tiba di <strong style="color: #b45309 !important; -webkit-text-fill-color: #b45309 !important;">Scorpion Autoworks</strong>. Perbaikan kendaraan Anda sedang dilanjutkan oleh mekanik kami.`;
    } else if (isCheckupResult && !hasIssues) {
      mainMessage = `Pengecekan kendaraan Anda di <strong style="color: #b45309 !important; -webkit-text-fill-color: #b45309 !important;">Scorpion Autoworks</strong> telah selesai dan tidak ditemukan kendala. Kendaraan Anda siap untuk diambil.`;
    } else if (isCheckupResult && hasIssues) {
      mainMessage = `Pengecekan kendaraan Anda di <strong style="color: #b45309 !important; -webkit-text-fill-color: #b45309 !important;">Scorpion Autoworks</strong> telah selesai. Namun, ditemukan beberapa kendala yang perlu Anda ketahui.`;
    } else if (isCompleted) {
      mainMessage = `Servis untuk kendaraan Anda di <strong style="color: #b45309 !important; -webkit-text-fill-color: #b45309 !important;">Scorpion Autoworks</strong> telah selesai.`;
    } else {
      mainMessage = `Berikut adalah update terbaru mengenai progres servis kendaraan Anda di <strong style="color: #b45309 !important; -webkit-text-fill-color: #b45309 !important;">Scorpion Autoworks</strong>.`;
    }

    // Completion message
    let completionMessage = '';
    if (isCancelled) {
      completionMessage = `<p style="color: #ef4444 !important; -webkit-text-fill-color: #ef4444 !important; font-size: 16px; font-weight: bold; text-align: center; margin: 32px 0 16px 0;">❌ Layanan Servis Dibatalkan.</p>`;
    } else if (isCompleted) {
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
                      <img src="https://scorpionautoworks.my.id/scorpionlogolight.png" alt="Scorpion Autoworks" style="max-width: 280px; height: auto; display: block; margin: 0 auto;" />
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td bgcolor="#ffffff" style="background-color: #ffffff; padding: 32px 24px;">
                      <h1 style="color: #0f172a !important; -webkit-text-fill-color: #0f172a !important; font-size: 22px; margin: 0 0 12px 0;">Halo, ${customerName}!</h1>
                      <p style="color: #475569 !important; -webkit-text-fill-color: #475569 !important; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
                        ${mainMessage}
                      </p>
                      
                      <!-- Data Kendaraan Card -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
                        <tr>
                          <td bgcolor="#ffffff" style="background-color: #ffffff; border-left: 4px solid #b45309; padding: 16px; border-radius: 4px; border: 1px solid #e2e8f0;">
                            <h3 style="color: #0f172a !important; -webkit-text-fill-color: #0f172a !important; font-size: 16px; margin: 0 0 12px 0;">🚗 Data Kendaraan</h3>
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 14px; color: #334155 !important; -webkit-text-fill-color: #334155 !important;">
                              <tr><td style="padding: 4px 0; font-weight: bold; width: 120px; color: #64748b !important; -webkit-text-fill-color: #64748b !important;">Kendaraan</td><td style="padding: 4px 0;">: ${vehicleInfo}</td></tr>
                              <tr><td style="padding: 4px 0; font-weight: bold; color: #64748b !important; -webkit-text-fill-color: #64748b !important;">Tahun</td><td style="padding: 4px 0;">: ${vehicleYear}</td></tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      ${trackingCodeHtml}

                      <!-- Detail Layanan Card -->
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                        <tr>
                          <td bgcolor="#ffffff" style="background-color: #ffffff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 4px; border: 1px solid #e2e8f0;">
                            <h3 style="color: #0f172a !important; -webkit-text-fill-color: #0f172a !important; font-size: 16px; margin: 0 0 12px 0;">🔧 Detail Layanan</h3>
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 14px; color: #334155 !important; -webkit-text-fill-color: #334155 !important;">
                              <tr><td style="padding: 4px 0; font-weight: bold; width: 130px; color: #64748b !important; -webkit-text-fill-color: #64748b !important;">Jenis Layanan</td><td style="padding: 4px 0;">: ${serviceType}</td></tr>
                              <tr><td style="padding: 4px 0; font-weight: bold; color: #64748b !important; -webkit-text-fill-color: #64748b !important;">Fase Pengerjaan</td><td style="padding: 4px 0; font-weight: bold; color: #059669 !important; -webkit-text-fill-color: #059669 !important;">: ${currentPhase}</td></tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      ${checkupHtml}

                      ${invoiceHtml}

                      ${completionMessage}

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
