import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

/**
 * @fileOverview API route to send project invitation emails via Gmail SMTP.
 */

export async function POST(req: NextRequest) {
  try {
    const { toEmail, projectName, invitationLink } = await req.json();

    if (!toEmail || !projectName || !invitationLink) {
      return NextResponse.json({ error: 'Champs requis manquants.' }, { status: 400 });
    }

    const gmailUser = process.env.GMAIL_APP_USER;
    const gmailPassword = process.env.GMAIL_APP_PASSWORD;

    // Vérification de la configuration serveur
    if (!gmailUser || !gmailPassword || gmailPassword.includes('REMPLACEZ')) {
      console.error('[SMTP] Configuration manquante ou non valide dans le fichier .env');
      return NextResponse.json({ error: 'Le service d\'envoi d\'emails n\'est pas encore configuré sur le serveur.' }, { status: 500 });
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
      subject: `Invitation à rejoindre le projet "${projectName}"`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
          <h2 style="color: #5b43d7; text-align: center;">Vous êtes invité sur SharePot !</h2>
          <p>Bonjour,</p>
          <p>Vous avez été invité(e) à rejoindre le projet <strong>${projectName}</strong> pour gérer vos dépenses communes.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${invitationLink}" style="background-color: #5b43d7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Rejoindre le Projet</a>
          </div>
          <p style="font-size: 0.9em; color: #64748b;">Si le bouton ne fonctionne pas, copiez-collez ce lien : <br/> ${invitationLink}</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 0.8em; color: #94a3b8; text-align: center;">Ceci est un message automatique de l'application SharePot.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return NextResponse.json({ success: true, message: 'Invitation envoyée avec succès.' });
  } catch (error: any) {
    console.error('[SMTP Error]', error);
    return NextResponse.json({ error: `Erreur lors de l'envoi : ${error.message}` }, { status: 500 });
  }
}
