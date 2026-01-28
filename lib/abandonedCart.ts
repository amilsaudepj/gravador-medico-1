import { supabase } from './supabase'

/**
 * Salva ou atualiza um carrinho (status: pending enquanto preenche)
 * O status só muda para 'abandoned' quando o cliente SAI da página sem comprar
 * Ou para 'recovered' quando o cliente compra
 */
export async function saveAbandonedCart(data: {
  customer_name?: string
  customer_email: string
  customer_phone?: string
  customer_cpf?: string
  step: 'form_filled' | 'payment_started' | 'payment_pending'
  product_id?: string
  order_bumps?: any[]
  discount_code?: string
  cart_value?: number
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  markAsAbandoned?: boolean // ✅ Novo: só true quando cliente SAIR da página
}) {
  try {
    // Recuperar session_id do sessionStorage
    const sessionId = sessionStorage.getItem('session_id') || `session_${Date.now()}`
    
    // ✅ SEMPRE salvar session_id no sessionStorage
    if (!sessionStorage.getItem('session_id')) {
      sessionStorage.setItem('session_id', sessionId)
    }

    // ✅ Buscar carrinho existente PRIORITARIAMENTE por session_id
    // Isso permite capturar dados parciais mesmo sem email
    const { data: existing, error: searchError } = await supabase
      .from('abandoned_carts')
      .select('id, customer_email, status')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (searchError && searchError.code !== 'PGRST116') {
      // PGRST116 = not found (ok, vamos criar)
      console.error('Erro ao buscar carrinho existente:', searchError)
    }

    // ✅ LÓGICA CORRIGIDA:
    // - Começa como 'pending' (preenchendo dados)
    // - Só muda para 'abandoned' se markAsAbandoned = true (cliente saiu)
    // - Mantém status existente se já for 'recovered' ou 'abandoned'
    let status = 'pending'
    if (data.markAsAbandoned) {
      status = 'abandoned'
    } else if (existing?.status && existing.status !== 'pending') {
      // Manter status existente se já foi marcado como abandoned ou recovered
      status = existing.status
    }

    const cartData = {
      customer_name: data.customer_name,
      customer_email: data.customer_email,
      customer_phone: data.customer_phone,
      customer_cpf: data.customer_cpf,
      step: data.step,
      status: status,
      product_id: data.product_id,
      order_bumps: data.order_bumps || null,
      discount_code: data.discount_code,
      cart_value: data.cart_value,
      session_id: sessionId,
      // TODO: Adicionar UTM depois que as colunas forem criadas no banco
      // utm_source: data.utm_source || sessionStorage.getItem('utm_source'),
      // utm_medium: data.utm_medium || sessionStorage.getItem('utm_medium'),
      // utm_campaign: data.utm_campaign || sessionStorage.getItem('utm_campaign'),
    }

    if (existing?.id) {
      // Atualizar carrinho existente
      const { error } = await supabase
        .from('abandoned_carts')
        .update(cartData)
        .eq('id', existing.id)

      if (error) {
        console.error('Erro ao atualizar carrinho abandonado:', error)
        return null
      }

      console.log('✅ Carrinho atualizado:', existing.id)
      return existing.id
    } else {
      // Criar novo carrinho
      const { data: newCart, error } = await supabase
        .from('abandoned_carts')
        .insert(cartData)
        .select('id')
        .single()

      if (error) {
        console.error('Erro ao criar carrinho abandonado:', error)
        return null
      }

      console.log('✅ Carrinho abandonado salvo:', newCart.id)
      
      // Salvar ID no sessionStorage para atualizar depois
      sessionStorage.setItem('abandoned_cart_id', newCart.id)
      
      return newCart.id
    }
  } catch (error) {
    console.error('Erro ao salvar carrinho abandonado:', error)
    return null
  }
}

/**
 * Remove o carrinho quando o cliente COMPRA
 * Se comprou, não é carrinho abandonado - deve ser deletado!
 */
export async function markCartAsRecovered(orderId: string) {
  try {
    const cartId = sessionStorage.getItem('abandoned_cart_id')
    
    if (!cartId) {
      console.log('Nenhum carrinho para remover (cliente comprou)')
      return
    }

    // ✅ DELETAR o registro - se comprou, NÃO é carrinho abandonado!
    const { error } = await supabase
      .from('abandoned_carts')
      .delete()
      .eq('id', cartId)

    if (error) {
      console.error('Erro ao remover carrinho (compra realizada):', error)
    } else {
      console.log('✅ Carrinho removido (cliente comprou):', cartId, '→ Pedido:', orderId)
      sessionStorage.removeItem('abandoned_cart_id')
    }
  } catch (error) {
    console.error('Erro ao remover carrinho:', error)
  }
}
