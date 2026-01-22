#!/usr/bin/env node
/**
 * 🔍 Teste Rápido de Conexão com Supabase
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

async function testeConexao() {
  console.log('\n🔍 TESTE DE CONEXÃO SUPABASE\n')
  
  // 1. Testar SELECT simples
  console.log('1️⃣ Testando SELECT em sales...')
  const { data: sales, error: salesError } = await supabase
    .from('sales')
    .select('*')
    .limit(5)
  
  if (salesError) {
    console.log('❌ Erro:', salesError.message)
  } else {
    console.log(`✅ Sucesso! ${sales.length} vendas encontradas`)
    if (sales.length > 0) {
      console.log('📋 Primeira venda:')
      console.log({
        id: sales[0].id,
        customer_name: sales[0].customer_name,
        total_amount: sales[0].total_amount,
        status: sales[0].status,
      })
    }
  }
  
  // 2. Testar SELECT em products
  console.log('\n2️⃣ Testando SELECT em products...')
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('*')
    .limit(5)
  
  if (productsError) {
    console.log('❌ Erro:', productsError.message)
  } else {
    console.log(`✅ Sucesso! ${products.length} produtos encontrados`)
    if (products.length > 0) {
      console.log('📦 Primeiro produto:')
      console.log({
        id: products[0].id,
        name: products[0].name,
        price: products[0].price,
      })
    }
  }
  
  // 3. Testar SELECT em customers
  console.log('\n3️⃣ Testando SELECT em customers...')
  const { data: customers, error: customersError } = await supabase
    .from('customers')
    .select('*')
    .limit(5)
  
  if (customersError) {
    console.log('❌ Erro:', customersError.message)
  } else {
    console.log(`✅ Sucesso! ${customers.length} clientes encontrados`)
    if (customers.length > 0) {
      console.log('👤 Primeiro cliente:')
      console.log({
        id: customers[0].id,
        name: customers[0].name,
        email: customers[0].email,
      })
    }
  }
  
  console.log('\n✅ TESTE CONCLUÍDO\n')
}

testeConexao()
