import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/orders/[orderId]/redirect
 * Retorna a URL de redirecionamento se o pagamento foi aprovado
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID é obrigatório' },
        { status: 400 }
      );
    }

    // Conecta ao Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Busca o pedido
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, status, redirect_url, payment_status')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      return NextResponse.json(
        { error: 'Pedido não encontrado' },
        { status: 404 }
      );
    }

    // Verifica se o pagamento foi aprovado
    const isApproved = 
      order.status === 'paid' || 
      order.payment_status === 'approved' ||
      order.payment_status === 'success';

    if (!isApproved) {
      return NextResponse.json({
        should_redirect: false,
        status: order.status,
        payment_status: order.payment_status,
        message: 'Pagamento ainda não foi aprovado',
      });
    }

    // Retorna URL de redirecionamento
    return NextResponse.json({
      should_redirect: true,
      redirect_url: order.redirect_url,
      status: order.status,
      payment_status: order.payment_status,
    });

  } catch (error) {
    console.error('Erro ao verificar redirect:', error);
    return NextResponse.json(
      { error: 'Erro ao verificar redirecionamento' },
      { status: 500 }
    );
  }
}
