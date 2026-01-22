require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function verificarDatas() {
  console.log('\n🔍 VERIFICANDO DATAS DAS VENDAS\n')
  
  const { data: sales, error } = await supabase
    .from('sales')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ Erro:', error)
    return
  }

  console.log(`📊 Total de vendas: ${sales.length}\n`)
  
  sales.forEach((sale, index) => {
    const date = new Date(sale.created_at)
    const hoje = new Date()
    const diffDias = Math.floor((hoje - date) / (1000 * 60 * 60 * 24))
    
    console.log(`${index + 1}. Venda #${sale.appmax_order_id}`)
    console.log(`   Data: ${date.toLocaleString('pt-BR')}`)
    console.log(`   Há ${diffDias} dias`)
    console.log(`   Status: ${sale.status}`)
    console.log(`   Valor: R$ ${sale.total_amount}`)
    console.log(`   Cliente: ${sale.customer_name}`)
    console.log('')
  })
  
  // Verificar o período atual do filtro
  const hoje = new Date()
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(hoje.getDate() - 30)
  
  console.log('📅 PERÍODO DE FILTRO PADRÃO (últimos 30 dias):')
  console.log(`   De: ${thirtyDaysAgo.toLocaleDateString('pt-BR')}`)
  console.log(`   Até: ${hoje.toLocaleDateString('pt-BR')}`)
  console.log('')
  
  const vendasNoPeriodo = sales.filter(sale => {
    const saleDate = new Date(sale.created_at)
    return saleDate >= thirtyDaysAgo && saleDate <= hoje
  })
  
  console.log(`✅ Vendas dentro do período padrão: ${vendasNoPeriodo.length}/${sales.length}`)
  
  if (vendasNoPeriodo.length < sales.length) {
    console.log('\n⚠️  PROBLEMA ENCONTRADO!')
    console.log(`   ${sales.length - vendasNoPeriodo.length} vendas estão FORA do período padrão de 30 dias`)
    console.log('   Por isso não aparecem no dashboard!')
    console.log('\n💡 SOLUÇÃO: Aumentar o período do filtro ou usar "Todos os períodos"')
  }
}

verificarDatas().then(() => process.exit(0))
