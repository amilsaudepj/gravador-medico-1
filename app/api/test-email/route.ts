import { NextRequest, NextResponse } from 'next/server'
import { sendWelcomeEmail } from '@/lib/email'
import { createLovableUser, generateSecurePassword } from '@/services/lovable-integration'
import { supabaseAdmin } from '@/lib/supabase'

const LOVABLE_URL = process.env.NEXT_PUBLIC_LOVABLE_EDGE_FUNCTION_URL || ''
const API_SECRET = 'webhook-appmax-2026-secure-key'

/**
 * POST /api/admin/test-email
 * Envia um email de teste com senha sincronizada ao Lovable
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name } = body

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email é obrigatório' },
        { status: 400 }
      )
    }

    console.log(`📧 Enviando email de teste para ${email}...`)

    // 1. Verificar se usuário existe no Lovable
    let userId = null
    let password = generateSecurePassword()

    try {
      const listResponse = await fetch(LOVABLE_URL, {
        method: 'GET',
        headers: {
          'x-api-secret': API_SECRET,
          'Content-Type': 'application/json',
        },
      })

      const listData = await listResponse.json()
      const existingUser = listData.users?.find((u: any) => u.email === email)

      if (existingUser) {
        userId = existingUser.id
        console.log(`✅ Usuário existente: ${userId}`)

        // Resetar senha
        const resetResponse = await fetch(LOVABLE_URL, {
          method: 'PUT',
          headers: {
            'x-api-secret': API_SECRET,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: userId,
            newPassword: password,
          }),
        })

        if (!resetResponse.ok) {
          console.warn('⚠️ Não foi possível resetar a senha')
        } else {
          console.log('✅ Senha resetada no Lovable')
        }
      } else {
        // Criar usuário
        password = generateSecurePassword()
        const createResult = await createLovableUser({
          email,
          full_name: name || 'Teste',
          password,
        })
        if (createResult.success && createResult.user) {
          userId = createResult.user.id
          console.log(`✅ Usuário criado: ${userId}`)
        }
      }
    } catch (lovableError) {
      console.warn('⚠️ Erro com Lovable:', lovableError)
    }

    // 2. Enviar email (com HTML salvo)
    const result = await sendWelcomeEmail({
      to: email,
      customerName: name || 'Cliente Teste',
      userEmail: email,
      userPassword: password,
      orderId: `test-${Date.now()}`,
      orderValue: 36.0,
      paymentMethod: 'pix',
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Email de teste enviado com sucesso!',
      emailId: result.emailId,
      credentials: {
        email,
        password,
        synced: !!userId,
      },
    })
  } catch (error: any) {
    console.error('❌ Erro ao enviar email de teste:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
