import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(request: Request) {
  try {
    const { employeeId, name, department, date, project, hours, description } = await request.json();

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("RESEND_API_KEY is not defined in environment variables.");
    }

    // Initialize Resend with credentials
    const resend = new Resend(apiKey || "re_placeholder_key");

    // Format date for nice email display
    const formattedDate = new Date(date).toLocaleDateString("en-IN", { 
      day: "2-digit", 
      month: "short", 
      year: "numeric" 
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Timesheet Hours Submission Notification</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background-color: #fafafa;
              margin: 0;
              padding: 0;
              color: #444444;
              line-height: 1.6;
              -webkit-font-smoothing: antialiased;
            }
            .wrapper {
              width: 100%;
              background-color: #fafafa;
              padding: 40px 0;
            }
            .container {
              max-width: 540px;
              margin: 0 auto;
              background: #ffffff;
              border: 1px solid #eaeaea;
              border-radius: 16px;
              overflow: hidden;
            }
            .content {
              padding: 40px;
            }
            .logo-section {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo-text-iro {
              font-size: 20px;
              font-weight: 800;
              color: #111111;
              letter-spacing: -0.03em;
            }
            .logo-text-people {
              font-size: 9px;
              font-weight: 800;
              color: #1d4ed8;
              letter-spacing: 0.25em;
              display: block;
              margin-top: 2px;
              text-transform: uppercase;
            }
            .title {
              font-size: 20px;
              font-weight: 700;
              color: #111111;
              text-align: center;
              margin: 0 0 35px 0;
              letter-spacing: -0.02em;
            }
            .info-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            .info-row td {
              padding: 12px 0;
              border-bottom: 1px solid #f0f0f0;
            }
            .info-label {
              font-size: 11px;
              font-weight: 600;
              color: #888888;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              width: 130px;
              vertical-align: top;
            }
            .info-value {
              font-size: 13px;
              font-weight: 500;
              color: #111111;
              vertical-align: top;
            }
            .info-value-highlight {
              color: #1d4ed8;
              font-weight: 600;
            }
            .reason-heading {
              font-size: 11px;
              font-weight: 600;
              color: #888888;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              margin-bottom: 8px;
            }
            .reason-text {
              font-size: 13px;
              color: #555555;
              background-color: #fafafa;
              border: 1px solid #eaeaea;
              padding: 18px;
              border-radius: 10px;
              margin: 0 0 35px 0;
              line-height: 1.5;
            }
            .btn-container {
              text-align: center;
            }
            .btn {
              display: inline-block;
              background-color: #111111;
              color: #ffffff !important;
              text-decoration: none;
              padding: 12px 24px;
              font-size: 12px;
              font-weight: 600;
              border-radius: 8px;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            .footer {
              padding: 24px 40px;
              text-align: center;
              font-size: 10px;
              color: #999999;
              border-top: 1px solid #f0f0f0;
              background-color: #fafafa;
            }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="container">
              <div class="content">
                
                <!-- Logo -->
                <div class="logo-section">
                  <span class="logo-text-iro">IRO</span>
                  <span class="logo-text-people">PEOPLE</span>
                </div>

                <!-- Title -->
                <h1 class="title">Timesheet Hours Submitted</h1>

                <!-- Info Fields -->
                <table class="info-table">
                  <tr class="info-row">
                    <td class="info-label">Employee</td>
                    <td class="info-value">${name} <span style="color: #888888; font-size: 11px;">(ID: ${employeeId})</span></td>
                  </tr>
                  <tr class="info-row">
                    <td class="info-label">Department</td>
                    <td class="info-value">${department}</td>
                  </tr>
                  <tr class="info-row">
                    <td class="info-label">Project / Task</td>
                    <td class="info-value info-value-highlight">${project}</td>
                  </tr>
                  <tr class="info-row">
                    <td class="info-label">Date Logged</td>
                    <td class="info-value">${formattedDate}</td>
                  </tr>
                  <tr class="info-row">
                    <td class="info-label">Hours Logged</td>
                    <td class="info-value" style="font-weight: 700; color: #10b981;">${hours.toFixed(1)} Hours</td>
                  </tr>
                </table>

                <!-- Description Section -->
                <div class="reason-heading">Activity Description</div>
                <div class="reason-text">
                  "${description}"
                </div>

                <!-- CTA -->
                <div class="btn-container">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/attendance" class="btn">Review Logs</a>
                </div>

              </div>
              <div class="footer">
                This is an automated operational notification from IRO People.<br>
                Please do not reply directly to this mail.
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    const toEmail = process.env.RESEND_TO_EMAIL || "ajai.kc@iroidtechnologies.com";

    const response = await resend.emails.send({
      from: `IRO People <${fromEmail}>`,
      to: [toEmail],
      subject: `✉️ New Timesheet Logged: ${name} (${hours.toFixed(1)} hrs)`,
      html: htmlContent,
    });

    return NextResponse.json({ success: true, data: response });
  } catch (error: any) {
    console.error("Failed to deliver timesheet email:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
