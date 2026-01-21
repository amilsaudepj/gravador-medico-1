#!/usr/bin/env node

/**
 * DIAGNÓSTICO COMPLETO - APPMAX → SALES → DASHBOARD
 * 
 * Este script testa todo o fluxo:
 * 1. Envia webhook simulando Appmax
 * 2. Verifica se dados chegaram na tabela sales
 * 3. Testa queries do dashboard admin
 * 4. Identifica onde está o problema
 */

const { readFileSync } = require('fs')
const { join } = require('path')

// Ler variáveis de ambiente manualmente
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
  console.error('❌ Erro: Variáveis de ambiente não encontradas!')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅' : '❌')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
})

const TEST_ORDER_ID = `TEST-DIAG-${Date.now()}`

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function testWebhook() {
  console.log('\n📤 TESTE 1: Enviando webhook para /api/webhook/appmax')
  console.log('=' .repeat(60))
  
  const payload = {
    appmax_order_id: TEST_ORDER_ID,
    order_id: TEST_ORDER_ID,
    status: 'approved',
    customer: {
      name: 'Cliente Diagnóstico',
      email: 'diagnostico@teste.com',
      phone: '11999999999'
    },
    total_amount: 297.00,
    payment_method: 'credit_card',
    utm_source: 'diagnostico',
    utm_campaign: 'teste-completo'
  }
  
  try {
    const response = await fetch('http://localhost:3000/api/webhook/appmax', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    })
    
    const result = await response.json()
    console.log('Status:', response.status)
    console.log('Resposta:', JSON.stringify(result, null, 2))
    
    if (response.ok) {
      console.log('✅ Webhook processado com sucesso')
      return true
    } else {
      console.log('⚠️ Webhook retornou erro')
      return false
    }
  } catch (error) {
    console.log('❌ Erro ao enviar webhook:', error.message)
    return false
  }
}

async function checkSalesTable() {
  console.log('\n🔍 TESTE 2: Verificando tabela sales')
  console.log('=' .repeat(60))
  
  // Esperar um pouco para o webhook processar
  await sleep(2000)
  
  // 1. Verificar estrutura da tabela
  console.log('\n📊 Colunas da tabela sales:')
  const { data: columns, error: colError } = await supabase
    .from('sales')
    .select('*')
    .limit(1)
  
  if (colError) {
    console.error('❌ Erro ao consultar sales:', colError)
    return false
  }
  
  if (columns && columns.length > 0) {
    console.log('Colunas disponíveis:', Object.keys(columns[0]).join(', '))
  }
  
  // 2. Buscar nossa venda de teste
  console.log('\n🔎 Buscando venda de teste:', TEST_ORDER_ID)
  const { data: testSale, error: testError } = await supabase
    .from('sales')
    .select('*')
    .eq('appmax_order_id', TEST_ORDER_ID)
    .single()
  
  if (testError) {
    console.error('❌ Venda de teste NÃO encontrada:', testError.message)
    return false
  }
  
  console.log('✅ Venda de teste encontrada:')
  console.log(JSON.stringify(testSale, null, 2))
  
  // 3. Buscar todas as vendas (últimas 10)
  console.log('\n📦 Últimas 10 vendas na tabela:')
  const { data: allSales, error: allError } = await supabase
    .from('sales')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)
  
  if (allError) {
    console.error('❌ Erro ao buscar vendas:', allError)
    return false
  }
  
  console.log(`Total de vendas encontradas: ${allSales?.length || 0}`)
  if (allSales && allSales.length > 0) {
    allSales.forEach((sale, i) => {
      console.log(`\n${i + 1}. Order ID: ${sale.appmax_order_id}`)
      console.log(`   Status: ${sale.status}`)
      console.log(`   Email: ${sale.customer_email}`)
      console.log(`   Valor: R$ ${sale.total_amount}`)
      console.log(`   Data: ${sale.created_at}`)
    })
  }
  
  return true
}

async function testDashboardQueries() {
  console.log('\n📊 TESTE 3: Simulando queries do dashboard')
  console.log('=' .repeat(60))
  
  // Query 1: Vendas aprovadas (como o dashboard busca)
  console.log('\n1️⃣ Query: Vendas aprovadas (status = approved/paid/completed)')
  const { data: approvedSales, error: approvedError } = await supabase
    .from('sales')
    .select('*')
    .in('status', ['approved', 'paid', 'completed'])
    .order('created_at', { ascending: false })
  
  if (approvedError) {
    console.error('❌ Erro:', approvedError)
  } else {
    console.log(`✅ Encontradas: ${approvedSales?.length || 0} vendas`)
    if (approvedSales && approvedSales.length > 0) {
      const total = approvedSales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0)
      console.log(`💰 Receita total: R$ ${total.toFixed(2)}`)
    }
  }
  
  // Query 2: Com filtro de data (últimos 30 dias)
  console.log('\n2️⃣ Query: Vendas dos últimos 30 dias')
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const startIso = thirtyDaysAgo.toISOString()
  const endIso = new Date().toISOString()
  
  const { data: recentSales, error: recentError } = await supabase
    .from('sales')
    .select('*')
    .gte('created_at', startIso)
    .lte('created_at', endIso)
    .order('created_at', { ascending: false })
  
  if (recentError) {
    console.error('❌ Erro:', recentError)
  } else {
    console.log(`✅ Encontradas: ${recentSales?.length || 0} vendas`)
  }
  
  // Query 3: Todas as vendas (sem filtro)
  console.log('\n3️⃣ Query: TODAS as vendas (sem filtro)')
  const { data: allSalesCount, error: countError, count } = await supabase
    .from('sales')
    .select('*', { count: 'exact' })
  
  if (countError) {
    console.error('❌ Erro:', countError)
  } else {
    console.log(`✅ Total no banco: ${allSalesCount?.length || 0} vendas`)
  }
  
  return true
}

async function checkCustomersTable() {
  console.log('\n👥 TESTE 4: Verificando tabela customers')
  console.log('=' .repeat(60))
  
  const { data: customers, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)
  
  if (error) {
    console.error('❌ Erro ao buscar customers:', error)
    return false
  }
  
  console.log(`Total de clientes (últimos 5): ${customers?.length || 0}`)
  if (customers && customers.length > 0) {
    customers.forEach((c, i) => {
      console.log(`\n${i + 1}. ${c.name || c.email}`)
      console.log(`   Email: ${c.email}`)
      console.log(`   ID: ${c.id}`)
    })
  }
  
  return true
}

async function checkWebhookLogs() {
  console.log('\n📋 TESTE 5: Verificando webhooks_logs')
  console.log('=' .repeat(60))
  
  const { data: logs, error } = await supabase
    .from('webhooks_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)
  
  if (error) {
    console.error('❌ Erro ao buscar logs:', error)
    return false
  }
  
  console.log(`Total de logs (últimos 10): ${logs?.length || 0}`)
  if (logs && logs.length > 0) {
    logs.forEach((log, i) => {
      console.log(`\n${i + 1}. ${log.endpoint || 'N/A'}`)
      console.log(`   Status: ${log.response_status}`)
      console.log(`   Data: ${log.created_at}`)
      if (log.error) {
        console.log(`   ❌ Erro: ${log.error}`)
      }
    })
  }
  
  return true
}

async function runDiagnostics() {
  console.log('\n🏥 DIAGNÓSTICO COMPLETO - APPMAX → SALES → DASHBOARD')
  console.log('=' .repeat(60))
  console.log(`📅 Data: ${new Date().toLocaleString('pt-BR')}`)
  console.log(`🆔 Test Order ID: ${TEST_ORDER_ID}`)
  
  const results = {
    webhook: false,
    sales: false,
    dashboard: false,
    customers: false,
    logs: false
  }
  
  // Testes sequenciais
  results.webhook = await testWebhook()
  results.sales = await checkSalesTable()
  results.dashboard = await testDashboardQueries()
  results.customers = await checkCustomersTable()
  results.logs = await checkWebhookLogs()
  
  // Resumo final
  console.log('\n📊 RESUMO DO DIAGNÓSTICO')
  console.log('=' .repeat(60))
  console.log(`Webhook enviado:        ${results.webhook ? '✅' : '❌'}`)
  console.log(`Dados em sales:         ${results.sales ? '✅' : '❌'}`)
  console.log(`Queries dashboard:      ${results.dashboard ? '✅' : '❌'}`)
  console.log(`Tabela customers:       ${results.customers ? '✅' : '❌'}`)
  console.log(`Logs de webhook:        ${results.logs ? '✅' : '❌'}`)
  
  const allPass = Object.values(results).every(r => r === true)
  
  if (allPass) {
    console.log('\n✅ TUDO FUNCIONANDO! O problema pode ser:')
    console.log('   - Dados da Appmax não estão chegando via webhook')
    console.log('   - Webhook não configurado corretamente na Appmax')
    console.log('   - Necessário verificar logs de produção')
  } else {
    console.log('\n⚠️ PROBLEMAS ENCONTRADOS!')
    console.log('   Verifique os erros acima para mais detalhes')
  }
  
  console.log('\n' + '='.repeat(60))
}

// Executar diagnóstico
runDiagnostics()
  .catch(error => {
    console.error('\n❌ ERRO FATAL:', error)
    process.exit(1)
  })
