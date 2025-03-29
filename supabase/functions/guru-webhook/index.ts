import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import { SMTPClient } from "npm:emailjs@4.0.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate secure password
function gerarSenhaSegura(): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+[]{}|;:,.<>?';

  const all = upper + lower + numbers + special;
  let senha = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
    special[Math.floor(Math.random() * special.length)],
  ];

  for (let i = 4; i < 12; i++) {
    senha.push(all[Math.floor(Math.random() * all.length)]);
  }

  return senha.sort(() => Math.random() - 0.5).join('');
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify request method
    if (req.method !== "POST") {
      throw new Error("Method not allowed");
    }

    const payload = await req.json();
    console.log("Received webhook payload:", payload);

    // Validate webhook payload
    if (!payload.event || !payload.data) {
      throw new Error("Invalid webhook payload");
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Handle different webhook events
    switch (payload.event) {
      case "subscription.created":
      case "subscription.activated": {
        const { customer, subscription } = payload.data;
        
        // Generate secure password
        const senha = gerarSenhaSegura();

        // Create user in Supabase
        const { data: userData, error: userError } = await supabase.auth.admin.createUser({
          email: customer.email,
          password: senha,
          email_confirm: true,
        });

        if (userError) {
          throw userError;
        }

        // Initialize SMTP client
        const client = new SMTPClient({
          user: Deno.env.get("SMTP_USERNAME"),
          password: Deno.env.get("SMTP_PASSWORD"),
          host: "smtp.gmail.com",
          ssl: true,
        });

        // Send welcome email
        await client.send({
          from: Deno.env.get("SMTP_FROM") || "",
          to: customer.email,
          subject: "Seus dados de acesso à plataforma",
          text: `Bem-vindo! Sua senha temporária é: ${senha}`,
          attachment: [
            {
              data: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #1a365d;">Bem-vindo!</h2>
                  
                  <p>Sua assinatura foi confirmada com sucesso.</p>
                  
                  <div style="background-color: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <p style="margin: 0;"><strong>Login:</strong> ${customer.email}</p>
                    <p style="margin: 10px 0;"><strong>Senha temporária:</strong> ${senha}</p>
                  </div>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="https://primegestao01.com/login" 
                       style="background-color: #1E40AF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                      Acessar a Plataforma
                    </a>
                  </div>
                  
                  <p style="color: #718096; font-size: 14px;">
                    Por favor, troque sua senha no primeiro acesso.
                  </p>

                  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                    <h3 style="color: #1a365d;">Detalhes da Assinatura</h3>
                    <p><strong>Plano:</strong> ${subscription.plan_name}</p>
                    <p><strong>Valor:</strong> R$ ${(subscription.amount / 100).toFixed(2)}</p>
                    <p><strong>Próxima cobrança:</strong> ${new Date(subscription.current_period_end).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
              `,
              alternative: true
            }
          ]
        });

        break;
      }

      case "subscription.canceled":
      case "subscription.deleted": {
        const { customer } = payload.data;

        // Disable user in Supabase
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('email', customer.email)
          .single();

        if (userError) {
          throw userError;
        }

        const { error: updateError } = await supabase.auth.admin.updateUserById(
          user.id,
          { user_metadata: { disabled: true } }
        );

        if (updateError) {
          throw updateError;
        }

        break;
      }

      case "subscription.updated": {
        // Handle subscription updates if needed
        console.log("Subscription updated:", payload.data);
        break;
      }

      default:
        console.log("Unhandled webhook event:", payload.event);
    }

    return new Response(
      JSON.stringify({ message: "Webhook processed successfully" }),
      { 
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        status: 200 
      }
    );

  } catch (error) {
    console.error("Error processing webhook:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Internal server error" 
      }),
      { 
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        status: 500
      }
    );
  }
});