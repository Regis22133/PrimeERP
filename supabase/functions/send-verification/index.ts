import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, code, type } = await req.json()

    if (!email || (!code && type !== 'password_reset')) {
      throw new Error('Required parameters missing')
    }

    // Create SMTP client
    const client = new SmtpClient();

    // Connect to Gmail SMTP server
    await client.connectTLS({
      hostname: "smtp.gmail.com",
      port: 465,
      username: Deno.env.get("SMTP_USERNAME"),
      password: Deno.env.get("SMTP_PASSWORD"),
    });

    let subject, html;

    if (type === 'password_reset') {
      const resetUrl = `https://primegestao01.com/redefinir-senha?token=${code}`;
      subject = "Redefinição de Senha - Prime Gestão";
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a365d; text-align: center;">Redefinição de Senha</h2>
          <p style="color: #4a5568; text-align: center;">Clique no botão abaixo para redefinir sua senha:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #1E40AF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Redefinir Senha
            </a>
          </div>
          <p style="color: #718096; text-align: center; font-size: 14px;">
            Se você não solicitou a redefinição de senha, por favor ignore este email.
          </p>
          <p style="color: #718096; text-align: center; font-size: 14px;">
            Este link expira em 1 hora.
          </p>
        </div>
      `;
    } else {
      subject = "Seu código de verificação - Prime Gestão";
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a365d; text-align: center;">Código de Verificação</h2>
          <p style="color: #4a5568; text-align: center;">Use o código abaixo para verificar sua conta:</p>
          <div style="background-color: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
            <h1 style="font-size: 32px; letter-spacing: 4px; color: #1E40AF; margin: 0;">${code}</h1>
          </div>
          <p style="color: #718096; text-align: center; font-size: 14px;">Este código expira em 15 minutos.</p>
          <p style="color: #718096; text-align: center; font-size: 14px;">Se você não solicitou este código, por favor ignore este email.</p>
        </div>
      `;
    }

    // Send email
    await client.send({
      from: Deno.env.get("SMTP_FROM") || "noreply@example.com",
      to: email,
      subject: subject,
      html: html,
    });

    // Close connection
    await client.close();

    // Return success response
    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error sending email:', error);
    
    // Return error response
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send email',
        details: error.message 
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      }
    )
  }
})