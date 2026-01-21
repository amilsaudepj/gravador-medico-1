import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Buscar todos os checkouts attempts
    const { data: attempts, error } = await supabaseAdmin
      .from('checkout_attempts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar checkout attempts:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar dados' },
        { status: 500 }
      )
    }

    // Calcular métricas
    const metrics = {
      totalRecovered: 0,
      totalPending: 0,
      totalAbandoned: 0,
      conversionRate: 0,
      totalAttempts: attempts?.length || 0
    }

    if (attempts && attempts.length > 0) {
      attempts.forEach((attempt) => {
        const amount = parseFloat(attempt.total_amount || '0')
        
        // Receita recuperada (status = recovered)
        if (attempt.recovery_status === 'recovered') {
          metrics.totalRecovered += amount
        }
        
        // PIX Pendente (status do pedido = pending ou waiting)
        if (attempt.status === 'pending' || attempt.status === 'waiting') {
          metrics.totalPending += amount
        }
        
        // Abandonos (recovery_status = abandoned ou pending)
        if (attempt.recovery_status === 'abandoned' || attempt.recovery_status === 'pending') {
          metrics.totalAbandoned += amount
        }
      })

      // Taxa de conversão (recuperados / total de tentativas)
      const recoveredCount = attempts.filter(a => a.recovery_status === 'recovered').length
      metrics.conversionRate = attempts.length > 0 
        ? (recoveredCount / attempts.length) * 100 
        : 0
    }

    return NextResponse.json({
      success: true,
      data: attempts || [],
      metrics
    })

  } catch (error) {
    console.error('Erro interno:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
