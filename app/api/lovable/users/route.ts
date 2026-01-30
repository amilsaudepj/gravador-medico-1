import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { 
  listLovableUsers, 
  createLovableUser, 
  resetLovableUserPassword,
  deactivateLovableUser,
  reactivateLovableUser,
  deleteLovableUser 
} from '@/services/lovable-integration'

/**
 * GET: Listar clientes da tabela sales
 * 
 * MUDANÇA: Anteriormente buscava de lovable_users (que pode falhar)
 * Agora busca diretamente da tabela `sales` usando supabaseAdmin
 * para bypass de RLS e garantir retorno de dados
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📋 [GET /api/lovable/users] Buscando clientes da tabela sales...')
    
    // Buscar clientes únicos da tabela sales (usando supabaseAdmin para bypass RLS)
    const { data: customers, error } = await supabaseAdmin
      .from('sales')
      .select('customer_email, customer_name, customer_phone, customer_cpf, status, created_at, total_amount')
      .in('status', ['paid', 'provisioning', 'active'])
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('❌ [GET /api/lovable/users] Erro ao buscar sales:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar clientes', details: error.message },
        { status: 500 }
      )
    }

    // Agrupar por email (eliminar duplicatas)
    const uniqueCustomers = customers?.reduce((acc, sale, index) => {
      const email = sale.customer_email
      if (!acc[email]) {
        acc[email] = {
          id: `sales-${index}-${Date.now()}`, // ID único para a interface
          email: email,
          full_name: sale.customer_name, // ✅ Usar full_name para compatibilidade com LovableUser
          name: sale.customer_name, // Manter name também para compatibilidade
          phone: sale.customer_phone,
          cpf: sale.customer_cpf,
          status: sale.status,
          created_at: sale.created_at,
          total_spent: sale.total_amount,
          purchase_count: 1,
          role: 'user' // Default role
        }
      } else {
        // Cliente já existe, somar valor e incrementar contagem
        acc[email].total_spent += sale.total_amount
        acc[email].purchase_count += 1
        // Manter a data mais recente
        if (new Date(sale.created_at) > new Date(acc[email].created_at)) {
          acc[email].created_at = sale.created_at
          acc[email].status = sale.status
          // Atualizar nome se o novo tiver mais informações (não for só username)
          if (sale.customer_name && sale.customer_name.includes(' ') && (!acc[email].full_name || !acc[email].full_name.includes(' '))) {
            acc[email].full_name = sale.customer_name
            acc[email].name = sale.customer_name
          }
        }
      }
      return acc
    }, {} as Record<string, any>)

    const customerList = Object.values(uniqueCustomers || {})
    
    console.log(`✅ [GET /api/lovable/users] ${customerList.length} clientes encontrados`)

    return NextResponse.json({
      success: true,
      users: customerList,
      total: customerList.length
    })
    
  } catch (error: any) {
    console.error('❌ [GET /api/lovable/users] Erro interno:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error.message },
      { status: 500 }
    )
  }
}

// POST: Criar usuário
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, full_name } = body

    if (!email || !password || !full_name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const result = await createLovableUser({ email, password, full_name })
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error creating Lovable user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT: Resetar senha
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, newPassword } = body

    if (!userId || !newPassword) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const result = await resetLovableUserPassword({ userId, newPassword })
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error resetting password:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH: Desativar/Reativar usuário
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, action } = body

    if (!userId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: userId and action' },
        { status: 400 }
      )
    }

    if (action !== 'ban' && action !== 'unban') {
      return NextResponse.json(
        { error: 'Invalid action. Use "ban" or "unban"' },
        { status: 400 }
      )
    }

    const result = action === 'ban' 
      ? await deactivateLovableUser(userId)
      : await reactivateLovableUser(userId)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error updating user status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE: Excluir usuário
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required field: userId' },
        { status: 400 }
      )
    }

    const result = await deleteLovableUser(userId)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
