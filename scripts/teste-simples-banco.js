#!/usr/bin/env node

/**
 * TESTE SIMPLIFICADO - APENAS BANCO DE DADOS
 * Verifica se as correções do schema foram aplicadas
 */

const { readFileSync } = require('fs')
const { join } = require('path')

// Ler variáveis de ambiente
function loadEnv() {
  try {
    const envPath = join(__dirname, '..', '.env.local')
    const envContent = readFileSync(envPath, 'utf8')
    const lines = envContent.split('\n')
    
    lines.forEach(line => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) return
      
      const match = trimmed.match(/^([^=]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        const value = match[2].trim().replace(/^["']|["']$/g, '')
        process.env[key] = value
      }
    })
  } catch (error) {
    console.error('Erro ao carregar .env.local:', error.message)
  }
}

loadEnv()

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
})

async function testDatabase() {
  console.log('\n🔍 TESTE DO BANCO DE DADOS - PÓS CORREÇÃO')
  console.log('=' .repeat(60))
  
  // 1. Testar inserção direta na tabela sales
  console.log('\n📝 TESTE 1: Inserir venda diretamente no banco')
  console.log('-'.repeat(60))
  
  const testSale = {
    appmax_order_id: `TEST-DIRECT-${Date.now()}`,
    customer_name: 'Cliente Teste Direto',
    customer_email: 'teste-direto@exemplo.com',
    total_amount: 297.00,
    subtotal: 297.00,
    status: 'approved',
    payment_method: 'credit_card'
  }
  
  console.log('Tentando inserir:', testSale.appmax_order_id)
  
  const { data: insertedSale, error: insertError } = await supabase
    .from('sales')
    .insert(testSale)
    .select()
    .single()
  
  if (insertError) {
    console.error('❌ ERRO ao inserir:', insertError.message)
    console.error('Detalhes:', insertError)
    return false
  }
  
  console.log('✅ Venda inserida com sucesso!')
  console.log('   ID:', insertedSale.id)
  console.log('   Order ID:', insertedSale.appmax_order_id)
  
  // 2. Buscar a venda inserida
  console.log('\n🔎 TESTE 2: Buscar venda inserida')
  console.log('-'.repeat(60))
  
  const { data: foundSale, error: findError } = await supabase
    .from('sales')
    .select('*')
    .eq('appmax_order_id', testSale.appmax_order_id)
    .single()
  
  if (findError) {
    console.error('❌ ERRO ao buscar:', findError.message)
    return false
  }
  
  console.log('✅ Venda encontrada!')
  console.log(JSON.stringify(foundSale, null, 2))
  
  // 3. Listar todas as vendas
  console.log('\n📦 TESTE 3: Listar todas as vendas')
  console.log('-'.repeat(60))
  
  const { data: allSales, error: listError } = await supabase
    .from('sales')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (listError) {
    console.error('❌ ERRO ao listar:', listError.message)
    return false
  }
  
  console.log(`✅ Total de vendas no banco: ${allSales?.length || 0}`)
  
  if (allSales && allSales.length > 0) {
    allSales.forEach((sale, i) => {
      console.log(`\n${i + 1}. ${sale.appmax_order_id}`)
      console.log(`   Status: ${sale.status}`)
      console.log(`   Email: ${sale.customer_email}`)
      console.log(`   Valor: R$ ${sale.total_amount}`)
    })
  }
  
  // 4. Testar query do dashboard
  console.log('\n📊 TESTE 4: Query do dashboard (vendas aprovadas)')
  console.log('-'.repeat(60))
  
  const { data: approvedSales } = await supabase
    .from('sales')
    .select('*')
    .in('status', ['approved', 'paid', 'completed'])
  
  console.log(`✅ Vendas aprovadas: ${approvedSales?.length || 0}`)
  
  if (approvedSales && approvedSales.length > 0) {
    const total = approvedSales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0)
    console.log(`💰 Receita total: R$ ${total.toFixed(2)}`)
  }
  
  return true
}

async function main() {
  console.log('\n🎯 TESTE SIMPLIFICADO - VERIFICAÇÃO DO SCHEMA')
  console.log('='.repeat(60))
  console.log(`📅 Data: ${new Date().toLocaleString('pt-BR')}`)
  
  const success = await testDatabase()
  
  console.log('\n' + '='.repeat(60))
  if (success) {
    console.log('✅ SCHEMA CORRIGIDO COM SUCESSO!')
    console.log('\nPróximos passos:')
    console.log('1. Inicie o servidor: npm run dev')
    console.log('2. Configure webhook na Appmax')
    console.log('3. Faça uma compra de teste')
  } else {
    console.log('❌ AINDA HÁ PROBLEMAS NO SCHEMA')
    console.log('\nVerifique se executou o SQL no Supabase corretamente')
  }
  console.log('='.repeat(60))
}

main().catch(error => {
  console.error('\n❌ ERRO FATAL:', error)
  process.exit(1)
})
