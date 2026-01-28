#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' })

async function resetPassword() {
  const url = process.env.NEXT_PUBLIC_LOVABLE_EDGE_FUNCTION_URL
  const secret = process.env.LOVABLE_API_SECRET
  
  // 1. GET para listar usuários
  console.log('Buscando usuários...')
  
  let res = await fetch(url, {
    method: 'GET',
    headers: { 'x-api-secret': secret }
  })
  
  let data = await res.json()
  
  // Encontrar Weverton
  const user = data.users?.find(u => u.email === 'wevertonfcarvalho@hotmail.com')
  
  if (!user) {
    console.log('Usuário não encontrado. Emails cadastrados:')
    data.users?.slice(0, 10).forEach(u => console.log('-', u.email))
    return
  }
  
  console.log('Encontrado! ID:', user.id)
  
  // 2. PUT para resetar senha
  console.log('Resetando senha...')
  
  res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-api-secret': secret },
    body: JSON.stringify({ userId: user.id, newPassword: 'Gm8kL2pX5wQz' })
  })
  
  data = await res.json()
  console.log('Resultado:', JSON.stringify(data, null, 2))
  
  if (data.success) {
    console.log('\n========================================')
    console.log('SENHA RESETADA COM SUCESSO!')
    console.log('Email: wevertonfcarvalho@hotmail.com')
    console.log('Senha: Gm8kL2pX5wQz')
    console.log('========================================')
  }
}

resetPassword().catch(console.error)
