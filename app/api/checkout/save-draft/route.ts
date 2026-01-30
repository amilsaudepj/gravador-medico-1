import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * 💾 API: Salvar Draft de Checkout (Auto-Save)
 * 
 * OBJETIVO: Capturar dados parciais do formulário antes do submit
 * Previne perda de dados por fechamento de aba, erro de conexão, etc.
 * 
 * SEGURANÇA (PCI DSS):
 * ❌ NUNCA salve: Número de cartão, CVV, senha
 * ✅ Pode salvar: Nome, Email, CPF, Telefone, Endereço
 * 
 * TABELA: abandoned_carts
 * OPERAÇÃO: UPSERT (atualiza se existe, cria se não existe)
 */

interface DraftData {
  // Dados cadastrais (seguros)
  customer_name?: string
  customer_email?: string
  customer_cpf?: string
  customer_phone?: string
  customer_address?: string
  customer_city?: string
  customer_state?: string
  customer_zip?: string
  
  // Dados do pedido
  product_id?: string
  product_name?: string
  cart_total?: number
  payment_method?: string
  
  // Metadata
  utm_source?: string
  utm_campaign?: string
  utm_medium?: string
  
  // ❌ NUNCA incluir:
  // card_number, card_cvv, card_expiry, password
}

interface SaveDraftRequest {
  session_id: string
  draft_data: DraftData
  timestamp: string
}

export async function POST(request: NextRequest) {
  try {
    const body: SaveDraftRequest = await request.json()
    const { session_id, draft_data, timestamp } = body

    if (!session_id) {
      return NextResponse.json(
        { error: 'session_id é obrigatório' },
        { status: 400 }
      )
    }

    // Validar que não estamos salvando dados sensíveis
    const forbiddenFields = ['card_number', 'card_cvv', 'card_expiry', 'password', 'cvv']
    const hasForbiddenData = Object.keys(draft_data).some(key => 
      forbiddenFields.includes(key.toLowerCase())
    )

    if (hasForbiddenData) {
      console.error('🚨 [Save Draft] Tentativa de salvar dados sensíveis bloqueada!')
      return NextResponse.json(
        { error: 'Dados sensíveis não podem ser salvos' },
        { status: 403 }
      )
    }

    console.log('💾 [Save Draft] Recebido:', {
      session_id,
      fields: Object.keys(draft_data).filter(k => draft_data[k as keyof DraftData])
    })

    // Buscar se já existe um draft para essa sessão
    const { data: existing, error: searchError } = await supabaseAdmin
      .from('abandoned_carts')
      .select('id, customer_email')
      .eq('session_id', session_id)
      .maybeSingle()

    if (searchError && searchError.code !== 'PGRST116') {
      throw searchError
    }

    const now = new Date().toISOString()

    // Preparar dados para salvar
    const cartData = {
      session_id,
      customer_name: draft_data.customer_name || null,
      customer_email: draft_data.customer_email || null,
      customer_cpf: draft_data.customer_cpf || null,
      customer_phone: draft_data.customer_phone || null,
      customer_address: draft_data.customer_address || null,
      customer_city: draft_data.customer_city || null,
      customer_state: draft_data.customer_state || null,
      customer_zip: draft_data.customer_zip || null,
      cart_total: draft_data.cart_total || 0,
      payment_method: draft_data.payment_method || null,
      status: 'draft', // Status especial para rascunhos
      metadata: {
        utm_source: draft_data.utm_source,
        utm_campaign: draft_data.utm_campaign,
        utm_medium: draft_data.utm_medium,
        auto_saved: true,
        last_save: timestamp
      },
      updated_at: now
    }

    if (existing) {
      // ATUALIZAR draft existente
      const { error: updateError } = await supabaseAdmin
        .from('abandoned_carts')
        .update(cartData)
        .eq('id', existing.id)

      if (updateError) throw updateError

      console.log('✅ [Save Draft] Draft atualizado:', existing.id)

      return NextResponse.json({
        success: true,
        action: 'updated',
        draft_id: existing.id,
        session_id
      })

    } else {
      // CRIAR novo draft
      const { data: newDraft, error: insertError } = await supabaseAdmin
        .from('abandoned_carts')
        .insert({
          ...cartData,
          created_at: now
        })
        .select('id')
        .single()

      if (insertError) throw insertError

      console.log('✅ [Save Draft] Novo draft criado:', newDraft.id)

      return NextResponse.json({
        success: true,
        action: 'created',
        draft_id: newDraft.id,
        session_id
      })
    }

  } catch (error) {
    console.error('❌ [Save Draft] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao salvar draft' },
      { status: 500 }
    )
  }
}

/**
 * 🔍 GET: Carregar Draft Salvo
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const session_id = searchParams.get('session_id')

    if (!session_id) {
      return NextResponse.json(
        { error: 'session_id é obrigatório' },
        { status: 400 }
      )
    }

    const { data: draft, error } = await supabaseAdmin
      .from('abandoned_carts')
      .select('*')
      .eq('session_id', session_id)
      .eq('status', 'draft')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error

    if (!draft) {
      return NextResponse.json(
        { error: 'Draft não encontrado' },
        { status: 404 }
      )
    }

    // Retornar apenas dados seguros
    const draft_data: DraftData = {
      customer_name: draft.customer_name,
      customer_email: draft.customer_email,
      customer_cpf: draft.customer_cpf,
      customer_phone: draft.customer_phone,
      customer_address: draft.customer_address,
      customer_city: draft.customer_city,
      customer_state: draft.customer_state,
      customer_zip: draft.customer_zip,
      cart_total: draft.cart_total,
      payment_method: draft.payment_method,
      utm_source: draft.metadata?.utm_source,
      utm_campaign: draft.metadata?.utm_campaign,
      utm_medium: draft.metadata?.utm_medium
    }

    return NextResponse.json({
      success: true,
      draft_data,
      draft_id: draft.id,
      updated_at: draft.updated_at
    })

  } catch (error) {
    console.error('❌ [Load Draft] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao carregar draft' },
      { status: 500 }
    )
  }
}

/**
 * 🗑️ DELETE: Limpar Draft (após checkout concluído)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { session_id } = await request.json()

    if (!session_id) {
      return NextResponse.json(
        { error: 'session_id é obrigatório' },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from('abandoned_carts')
      .delete()
      .eq('session_id', session_id)
      .eq('status', 'draft')

    if (error) throw error

    console.log('🗑️ [Delete Draft] Limpo:', session_id)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('❌ [Delete Draft] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao deletar draft' },
      { status: 500 }
    )
  }
}
