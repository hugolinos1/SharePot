
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
  
  // Check for placeholder password
  if (gmailPassword === 'REMPLACEZ_PAR_VOTRE_MOT_DE_PASSE_D_APPLICATION_GMAIL_OU_MOT_DE_PASSE_NORMAL' || gmailPassword.length < 16) { // App passwords are 16 chars
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
      <p>Bonjour,</p>
      <p>Vous êtes invité(e) à rejoindre le projet "<strong>${projectName}</strong>" sur SharePot.</p>
      <p>Cliquez sur le lien suivant pour créer un compte ou vous connecter et accéder au projet : <a href="${invitationLink}">${invitationLink}</a></p>
      <p>À bientôt sur SharePot !</p>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email envoyé avec succès :', info.response);
    return NextResponse.json({ message: 'Invitation envoyée avec succès.' }, { status: 200 });
  } catch (error: any) {
    console.error("Erreur lors de l'envoi de l'email :", error);
    let clientErrorMessage = "Erreur lors de l'envoi de l'email. Veuillez réessayer plus tard.";
    if (error.responseCode === 535) {
        clientErrorMessage = "Échec de l'authentification avec le serveur Gmail. Veuillez vérifier les identifiants du serveur (GMAIL_APP_USER, GMAIL_APP_PASSWORD) et les paramètres de sécurité du compte Gmail (utilisez un mot de passe d'application si la 2FA est activée).";
        console.error("Gmail Authentication Error (535): Username and Password not accepted. Ensure 2FA is handled with an App Password if enabled.");
    } else if (error.message) {
        clientErrorMessage = `Erreur lors de l'envoi de l'email: ${error.message}`;
    }
    return NextResponse.json({ error: clientErrorMessage }, { status: 500 });
  }
}

