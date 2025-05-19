
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
  }

  const { toEmail, projectName, invitationLink } = await req.json();

  if (!toEmail || !projectName || !invitationLink) {
    return NextResponse.json({ error: 'Missing required fields: toEmail, projectName, invitationLink' }, { status: 400 });
  }

  const gmailUser = process.env.GMAIL_APP_USER;
  const gmailPassword = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailPassword) {
    console.error('Gmail credentials are not configured in environment variables (GMAIL_APP_USER or GMAIL_APP_PASSWORD).');
    return NextResponse.json({ error: 'Email service is not configured on the server.' }, { status: 500 });
  }
  
  if (gmailPassword === 'REMPLACEZ_PAR_VOTRE_MOT_DE_PASSE_D_APPLICATION_GMAIL_OU_MOT_DE_PASSE_NORMAL' || gmailPassword.length < 16) {
    console.error('Default Gmail password placeholder might still be in use or password seems incorrect. Please update .env with actual App Password if 2FA is enabled, or standard password if not (not recommended).');
     return NextResponse.json({ error: 'Email service is not properly configured. Please check server credentials.' }, { status: 500 });
  }


  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailPassword, 
    },
  });

  const mailOptions = {
    from: `"SharePot" <${gmailUser}>`,
    to: toEmail,
    subject: `Invitation à rejoindre le projet "${projectName}" sur SharePot`,
    text: `Bonjour,\n\nVous êtes invité(e) à rejoindre le projet "${projectName}" sur SharePot.\n\nCliquez sur le lien suivant pour créer un compte ou vous connecter et accéder au projet : ${invitationLink}\n\nÀ bientôt sur SharePot !`,
    html: `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Invitation SharePot</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f0f4ff;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 20px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(to right, #4F46E5, #7C3AED);
      color: white;
      text-align: center;
      padding: 24px;
    }
    .content {
      padding: 30px;
      color: #333333;
    }
    .footer {
      background-color: #f9fafb;
      color: #6b7280;
      text-align: center;
      padding: 20px;
      font-size: 14px;
      border-top: 1px solid #e5e7eb;
    }
    .btn {
      display: inline-block;
      background-color: #4F46E5;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 8px;
      margin-top: 20px;
      transition: background-color 0.3s ease;
    }
    .btn:hover {
      background-color: #3730a3;
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f0f4ff; font-family:Arial, sans-serif;">
  <table align="center" border="0" cellPadding="0" cellSpacing="0" width="100%" style="max-width:600px; margin:auto;">
    <tr>
      <td style="padding:20px 0;">
        <table align="center" border="0" cellPadding="0" cellSpacing="0" width="100%">
          <tr>
            <td align="center">
              <img src="https://i.ibb.co/FL74SP7m/logo-Share-Pot.png" alt="Logo SharePot" width="40" height="40" style="display:inline-block;" />
            </td>
          </tr>
        </table>
        <table align="center" border="0" cellPadding="0" cellSpacing="0" width="100%" style="background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 10px 20px rgba(0,0,0,0.05); margin-top: 20px;">
          <tr>
            <td style="background:linear-gradient(to right, #4F46E5, #7C3AED); color:white; text-align:center; padding:24px;">
              <h1 style="font-size:24px; font-weight:bold; margin:0;">Vous êtes invité(e) sur SharePot !</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:30px; color:#333333;">
              <p style="margin-bottom:10px;">Bonjour,</p>
              <p style="margin-bottom:10px;">Vous êtes invité(e) à rejoindre le projet <strong>"${projectName}"</strong> sur <strong>SharePot</strong>.</p>
              <p>Cliquez sur le bouton ci-dessous pour créer un compte ou vous connecter et accéder au projet :</p>
              <div style="text-align:center; margin-top:20px;">
                <a href="${invitationLink}" target="_blank" style="display:inline-block; background-color:#4F46E5; color:white; padding:12px 24px; text-decoration:none; border-radius:8px;">Rejoindre le projet</a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f9fafb; color:#6b7280; text-align:center; padding:20px; font-size:14px; border-top:1px solid #e5e7eb;">
              À bientôt sur <strong style="color:#4F46E5;">SharePot</strong> !
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };

  try {
    console.log('[API Send Invite] Attempting to send email with options:', { from: mailOptions.from, to: mailOptions.to, subject: mailOptions.subject });
    const info = await transporter.sendMail(mailOptions);
    console.log('Email envoyé avec succès :', info.response);
    return NextResponse.json({ message: 'Invitation envoyée avec succès.' }, { status: 200 });
  } catch (error: any) {
    console.error("Erreur lors de l'envoi de l'email :", error);
    let clientErrorMessage = "Erreur lors de l'envoi de l'email. Veuillez réessayer plus tard.";
    if (error.responseCode === 535) {
        clientErrorMessage = "Échec de l'authentification avec le serveur Gmail. Veuillez vérifier les identifiants du serveur (GMAIL_APP_USER, GMAIL_APP_PASSWORD) et les paramètres de sécurité du compte Gmail (utilisez un mot de passe d'application si la 2FA est activée).";
        console.error("Gmail Authentication Error (535): Username and Password not accepted. Ensure 2FA is handled with an App Password if enabled.");
    } else if (error.message && error.message.includes("Invalid login")) { // Catch more generic login errors too
        clientErrorMessage = "Échec de l'authentification avec le serveur Gmail. Vérifiez les identifiants du serveur et les paramètres de sécurité du compte Gmail.";
        console.error("Gmail Authentication Error:", error.message);
    } else if (error.message) {
        clientErrorMessage = `Erreur lors de l'envoi de l'email: ${error.message}`;
    }
    return NextResponse.json({ error: clientErrorMessage, details: error.message }, { status: 500 });
  }
}
