#!/usr/bin/env node

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
  console.error('❌ Erro: Variáveis de ambiente não encontradas!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testarQuery() {
  console.log('🔍 TESTANDO QUERY DA PÁGINA DE VENDAS')
  console.log('='.repeat(80))
  
  // Simular o que a página faz
  const today = new Date()
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
  
  // Formato que a página usa (yyyy-MM-dd)
  const startDate = thirtyDaysAgo.toISOString().split('T')[0]
  const endDate = today.toISOString().split('T')[0]
  
  // Query EXATA que a página executa
  const startIso = `${startDate}T00:00:00.000Z`
  const endIso = `${endDate}T23:59:59.999Z`
  
  console.log('📅 Intervalo de datas:')
  console.log(`   startDate: ${startDate}`)
  console.log(`   endDate: ${endDate}`)
  console.log(`   startIso: ${startIso}`)
  console.log(`   endIso: ${endIso}`)
  console.log('')
  
  // TESTE 1: Query com filtro de data (como a página faz)
  console.log('🧪 TESTE 1: Query COM filtro de data')
  console.log('-'.repeat(80))
  const { data: filteredData, error: filteredError } = await supabase
    .from('sales')
    .select('*')
    .gte('created_at', startIso)
    .lte('created_at', endIso)
    .order('created_at', { ascending: false })
  
  if (filteredError) {
    console.log('❌ Erro:', filteredError.message)
  } else {
    console.log(`✅ Resultado: ${filteredData.length} vendas encontradas`)
    if (filteredData.length > 0) {
      filteredData.forEach((sale, idx) => {
        console.log(`   ${idx + 1}. ID: ${sale.id.substring(0, 8)}... | Cliente: ${sale.customer_name} | Data: ${sale.created_at}`)
      })
    }
  }
  console.log('')
  
  // TESTE 2: Query SEM filtro de data (como o dashboard fallback faz)
  console.log('🧪 TESTE 2: Query SEM filtro de data (fallback)')
  console.log('-'.repeat(80))
  const { data: allData, error: allError } = await supabase
    .from('sales')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (allError) {
    console.log('❌ Erro:', allError.message)
  } else {
    console.log(`✅ Resultado: ${allData.length} vendas encontradas`)
    if (allData.length > 0) {
      allData.forEach((sale, idx) => {
        const saleDate = new Date(sale.created_at)
        const isInRange = saleDate >= new Date(startIso) && saleDate <= new Date(endIso)
        const emoji = isInRange ? '✅' : '❌'
        console.log(`   ${idx + 1}. ${emoji} ID: ${sale.id.substring(0, 8)}... | Cliente: ${sale.customer_name} | Data: ${sale.created_at} | Dentro do range? ${isInRange ? 'SIM' : 'NÃO'}`)
      })
    }
  }
  console.log('')
  
  // TESTE 3: Query usando .gt() e .lt() ao invés de .gte() e .lte()
  console.log('🧪 TESTE 3: Query usando .gt() e .lt()')
  console.log('-'.repeat(80))
  const { data: gtData, error: gtError } = await supabase
    .from('sales')
    .select('*')
    .gt('created_at', startIso)
    .lt('created_at', endIso)
    .order('created_at', { ascending: false })
  
  if (gtError) {
    console.log('❌ Erro:', gtError.message)
  } else {
    console.log(`✅ Resultado: ${gtData.length} vendas encontradas`)
  }
  console.log('')
  
  // TESTE 4: Query sem ordem específica
  console.log('🧪 TESTE 4: Query sem .order()')
  console.log('-'.repeat(80))
  const { data: noOrderData, error: noOrderError } = await supabase
    .from('sales')
    .select('*')
    .gte('created_at', startIso)
    .lte('created_at', endIso)
  
  if (noOrderError) {
    console.log('❌ Erro:', noOrderError.message)
  } else {
    console.log(`✅ Resultado: ${noOrderData.length} vendas encontradas`)
  }
  console.log('')
  
  console.log('='.repeat(80))
  console.log('📊 CONCLUSÃO:')
  if (filteredData && filteredData.length === 0 && allData && allData.length > 0) {
    console.log('   ⚠️  PROBLEMA CONFIRMADO!')
    console.log('   - Query SEM filtro encontra vendas')
    console.log('   - Query COM filtro NÃO encontra vendas')
    console.log('   - Provável causa: Formato de data ou timezone')
    console.log('')
    console.log('   💡 SOLUÇÃO: Adicionar fallback ou ajustar formato de data')
  } else if (filteredData && filteredData.length > 0) {
    console.log('   ✅ Query COM filtro está funcionando!')
    console.log('   - O problema pode estar em outro lugar')
  }
  console.log('='.repeat(80))
}

testarQuery()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Erro:', err)
    process.exit(1)
  })
