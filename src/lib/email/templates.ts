/**
 * Template Email HTML Responsif Bahasa Indonesia untuk Notifikasi KMB Team Creative
 */

export interface EmailTemplateParams {
  recipientName: string;
  subject: string;
  heading: string;
  badgeLabel: string;
  badgeColor: string; // hex
  message: string;
  taskTitle: string;
  clientName: string;
  priority: string;
  deadlineWIB: string;
  ctaUrl: string;
  ctaText?: string;
}

export function generateNotificationEmailHtml({
  recipientName,
  subject,
  heading,
  badgeLabel,
  badgeColor,
  message,
  taskTitle,
  clientName,
  priority,
  deadlineWIB,
  ctaUrl,
  ctaText = 'Lihat Detail Tugas',
}: EmailTemplateParams): string {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      color: #1e293b;
    }
    .wrapper {
      width: 100%;
      background-color: #f8fafc;
      padding: 30px 15px;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
    }
    .header {
      background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%);
      padding: 28px 32px;
      text-align: left;
    }
    .brand {
      color: #ffffff;
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin: 0;
    }
    .brand span {
      color: #818cf8;
    }
    .content {
      padding: 32px;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background-color: ${badgeColor}15;
      color: ${badgeColor};
      border: 1px solid ${badgeColor}30;
      margin-bottom: 14px;
    }
    .heading {
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 12px 0;
      line-height: 1.3;
    }
    .text {
      font-size: 14px;
      line-height: 1.6;
      color: #475569;
      margin: 0 0 24px 0;
    }
    .task-card {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .task-title {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 10px 0;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      padding: 6px 0;
      border-top: 1px solid #edf2f7;
    }
    .meta-label {
      color: #64748b;
      font-weight: 500;
    }
    .meta-value {
      color: #1e293b;
      font-weight: 600;
      text-align: right;
    }
    .btn-container {
      text-align: center;
      margin: 28px 0 12px 0;
    }
    .btn {
      display: inline-block;
      background-color: #4f46e5;
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
      padding: 12px 28px;
      border-radius: 10px;
      box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);
    }
    .footer {
      background-color: #f8fafc;
      border-top: 1px solid #f1f5f9;
      padding: 20px 32px;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1 class="brand">KMB Team <span>Creative</span></h1>
      </div>
      <div class="content">
        <div class="badge">${badgeLabel}</div>
        <h2 class="heading">${heading}</h2>
        <p class="text">
          Halo <strong>${recipientName}</strong>,<br><br>
          ${message}
        </p>

        <div class="task-card">
          <div class="task-title">${taskTitle}</div>
          <div class="meta-row">
            <span class="meta-label">Klien / Proyek</span>
            <span class="meta-value">${clientName}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Prioritas</span>
            <span class="meta-value">${priority}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Batas Waktu (WIB)</span>
            <span class="meta-value" style="color: #e11d48;">${deadlineWIB}</span>
          </div>
        </div>

        <div class="btn-container">
          <a href="${ctaUrl}" class="btn">${ctaText}</a>
        </div>
      </div>
      <div class="footer">
        KMB Team Creative &bull; Manajemen Tugas Tim Kreatif (WIB UTC+7)<br>
        Email ini dikirim otomatis oleh sistem notifikasi dan pengingat deadline.
      </div>
    </div>
  </div>
</body>
</html>`;
}
