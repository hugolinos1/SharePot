
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
    console.error('Gmail credentials are not configured in environment variables.');
    return NextResponse.json({ error: 'Email service is not configured on the server.' }, { status: 500 });
  }
  
  if (gmailPassword === 'REMPLACEZ_PAR_VOTRE_MOT_DE_PASSE_D_APPLICATION_GMAIL_OU_MOT_DE_PASSE_NORMAL') {
    console.error('Default Gmail password placeholder is still in use. Please update .env with actual credentials.');
     return NextResponse.json({ error: 'Email service is not properly configured. Default password placeholder found.' }, { status: 500 });
  }


  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailPassword, // Use App Password if 2FA is enabled
    },
  });

  const mailOptions = {
    from: `"SharePot" <${gmailUser}>`, // You can customize the sender name
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
    return NextResponse.json({ error: `Erreur lors de l'envoi de l'email: ${error.message || 'Erreur inconnue'}` }, { status: 500 });
  }
}
