// ========================================
// 🚀 LOVABLE EDGE FUNCTION
// ========================================
// Admin User Manager - Deployed no Supabase do Lovable
// GET: Listar usuários | POST: Criar usuário | PATCH: Reset senha
// ========================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-secret',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
};

// =====================================================
// 🔐 VALIDAÇÃO DE AUTENTICAÇÃO
// =====================================================
function validateAuth(req: Request): boolean {
  const apiSecret = req.headers.get('x-api-secret');
  const expectedSecret = Deno.env.get('EXTERNAL_API_SECRET');
  
  if (!apiSecret || !expectedSecret) {
    return false;
  }
  
  return apiSecret === expectedSecret;
}

// =====================================================
// 📧 GERAR EMAIL TEMPORÁRIO ALEATÓRIO
// =====================================================
function generateTempEmail(baseEmail: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const [username, domain] = baseEmail.split('@');
  return `${username}+${timestamp}_${random}@${domain}`;
}

// =====================================================
// 🔑 GERAR SENHA SEGURA
// =====================================================
function generateSecurePassword(length = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  
  for (let i = 0; i < length; i++) {
    password += chars[array[i] % chars.length];
  }
  
  return password;
}

// =====================================================
// 🎯 HANDLER PRINCIPAL
// =====================================================
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validar autenticação
    if (!validateAuth(req)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'Invalid API secret' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Inicializar Supabase Admin Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { method } = req;
    const url = new URL(req.url);

    // =====================================================
    // 📋 GET: LISTAR USUÁRIOS
    // =====================================================
    if (method === 'GET') {
      const email = url.searchParams.get('email');
      
      if (email) {
        // Buscar usuário específico
        const { data: user, error } = await supabaseAdmin.auth.admin.listUsers();
        
        if (error) {
          throw error;
        }
        
        const foundUser = user.users.find(u => u.email === email);
        
        if (!foundUser) {
          return new Response(
            JSON.stringify({ error: 'User not found' }),
            {
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
        
        return new Response(
          JSON.stringify({
            user: {
              id: foundUser.id,
              email: foundUser.email,
              email_confirmed_at: foundUser.email_confirmed_at,
              created_at: foundUser.created_at,
              last_sign_in_at: foundUser.last_sign_in_at,
            },
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      // Listar todos (com limite)
      const limit = parseInt(url.searchParams.get('limit') || '100', 10);
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: limit,
      });
      
      if (error) {
        throw error;
      }
      
      return new Response(
        JSON.stringify({
          users: data.users.map(u => ({
            id: u.id,
            email: u.email,
            email_confirmed_at: u.email_confirmed_at,
            created_at: u.created_at,
          })),
          total: data.users.length,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // =====================================================
    // ➕ POST: CRIAR USUÁRIO
    // =====================================================
    if (method === 'POST') {
      const body = await req.json();
      const { email, password, autoConfirm = true, metadata } = body;
      
      if (!email) {
        return new Response(
          JSON.stringify({ error: 'Email is required' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      const finalPassword = password || generateSecurePassword();
      
      // Criar usuário
      const { data: user, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: finalPassword,
        email_confirm: autoConfirm,
        user_metadata: metadata || {},
      });
      
      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          user: {
            id: user.user.id,
            email: user.user.email,
            email_confirmed_at: user.user.email_confirmed_at,
            created_at: user.user.created_at,
          },
          credentials: {
            email,
            password: finalPassword,
          },
          message: 'User created successfully',
        }),
        {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // =====================================================
    // 🔄 PATCH: RESET SENHA
    // =====================================================
    if (method === 'PATCH') {
      const body = await req.json();
      const { email, userId, newPassword, generatePassword = false } = body;
      
      if (!email && !userId) {
        return new Response(
          JSON.stringify({ error: 'Email or userId is required' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      let targetUserId = userId;
      
      // Se apenas email foi fornecido, buscar o ID do usuário
      if (email && !userId) {
        const { data: users } = await supabaseAdmin.auth.admin.listUsers();
        const user = users.users.find(u => u.email === email);
        
        if (!user) {
          return new Response(
            JSON.stringify({ error: 'User not found' }),
            {
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
        
        targetUserId = user.id;
      }
      
      const finalPassword = generatePassword ? generateSecurePassword() : newPassword;
      
      if (!finalPassword) {
        return new Response(
          JSON.stringify({ error: 'Password is required or set generatePassword=true' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      // Atualizar senha
      const { data: user, error } = await supabaseAdmin.auth.admin.updateUserById(
        targetUserId,
        { password: finalPassword }
      );
      
      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          user: {
            id: user.user.id,
            email: user.user.email,
          },
          credentials: {
            password: finalPassword,
          },
          message: 'Password reset successfully',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Método não suportado
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Edge function error:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
