#!/usr/bin/env node
/**
 * 🧹 Limpar dados de teste do banco
 * Remove vendas de teste mantendo apenas vendas reais da Appmax
 */

const fs = require('fs')
const path = require('path')

// Ler .env.local
const envPath = path.join(__dirname, '..', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length) {
    process.env[key.trim()] = valueParts.join('=').trim()
  }
})

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function limparTestes() {
  console.log('\n🧹 LIMPANDO DADOS DE TESTE...\n')
  
  // 1. Buscar todas as vendas
  const { data: allSales, error: fetchError } = await supabase
    .from('sales')
    .select('*')
  
  if (fetchError) {
    console.error('❌ Erro ao buscar vendas:', fetchError)
    return
  }
  
  console.log(`📊 Total de vendas no banco: ${allSales.length}\n`)
  
  // 2. Identificar vendas de teste
  const testSales = allSales.filter(sale => {
    const orderId = sale.appmax_order_id || ''
    const name = sale.customer_name || ''
    const email = sale.customer_email || ''
    
    return (
      orderId.includes('TEST') ||
      orderId.includes('test') ||
      name.includes('Teste') ||
      name.includes('Cliente Teste') ||
      email.includes('test')
    )
  })
  
  const realSales = allSales.filter(sale => {
    const orderId = sale.appmax_order_id || ''
    const name = sale.customer_name || ''
    const email = sale.customer_email || ''
    
    return !(
      orderId.includes('TEST') ||
      orderId.includes('test') ||
      name.includes('Teste') ||
      name.includes('Cliente Teste') ||
      email.includes('test')
    )
  })
  
  console.log('📋 RESUMO:')
  console.log(`   🧪 Vendas de teste: ${testSales.length}`)
  console.log(`   ✅ Vendas reais: ${realSales.length}\n`)
  
  if (testSales.length === 0) {
    console.log('✅ Nenhuma venda de teste encontrada!')
    return
  }
  
  console.log('🧪 VENDAS DE TESTE A SEREM REMOVIDAS:\n')
  testSales.forEach((sale, i) => {
    console.log(`${i + 1}. 🛒 ${sale.appmax_order_id}`)
    console.log(`   👤 ${sale.customer_name || sale.customer_email}`)
    console.log(`   💵 R$ ${(sale.total_amount || 0).toFixed(2)}\n`)
  })
  
  // 3. Deletar vendas de teste
  const testIds = testSales.map(s => s.id)
  
  const { error: deleteError } = await supabase
    .from('sales')
    .delete()
    .in('id', testIds)
  
  if (deleteError) {
    console.error('❌ Erro ao deletar:', deleteError)
    return
  }
  
  console.log(`✅ ${testSales.length} vendas de teste removidas com sucesso!\n`)
  
  // 4. Mostrar vendas reais restantes
  if (realSales.length > 0) {
    console.log('📊 VENDAS REAIS MANTIDAS:\n')
    realSales.forEach((sale, i) => {
      console.log(`${i + 1}. 🛒 Pedido #${sale.appmax_order_id}`)
      console.log(`   👤 ${sale.customer_name || sale.customer_email}`)
      console.log(`   💵 R$ ${(sale.total_amount || 0).toFixed(2)}`)
      console.log(`   📊 Status: ${sale.status}`)
      console.log(`   📅 ${new Date(sale.created_at).toLocaleString('pt-BR')}\n`)
    })
    
    const totalReal = realSales.reduce((sum, s) => sum + (s.total_amount || 0), 0)
    console.log(`💰 TOTAL EM VENDAS REAIS: R$ ${totalReal.toFixed(2)}\n`)
  } else {
    console.log('⚠️ Nenhuma venda real encontrada (todas eram testes)\n')
  }
  
  console.log('✅ Limpeza concluída!\n')
}

limparTestes()
