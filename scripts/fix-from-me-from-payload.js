#!/usr/bin/env node

/**
 * Fix whatsapp_messages.from_me based on raw_payload.key.fromMe.
 * Also refresh whatsapp_contacts.last_message_from_me from latest message.
 */

const { readFileSync } = require('fs')
const { join } = require('path')

function loadEnv() {
  try {
    const envPath = join(__dirname, '..', '.env.local')
    const envContent = readFileSync(envPath, 'utf8')
    const lines = envContent.split('\n')

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const match = trimmed.match(/^([^=]+)=(.*)$/)
      if (!match) continue
      const key = match[1].trim()
      const value = match[2].trim().replace(/^['"]|['"]$/g, '')
      process.env[key] = value
    }
  } catch (error) {
    console.error('Failed to load .env.local:', error.message)
  }
}

loadEnv()

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
})

function normalizeFromMe(value) {
  return value === true || value === 'true' || value === 1 || value === '1'
}

async function fixMessages() {
  const batchSize = 500
  let offset = 0
  let totalChecked = 0
  let totalFixed = 0

  while (true) {
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('id, from_me, raw_payload')
      .order('timestamp', { ascending: false })
      .range(offset, offset + batchSize - 1)

    if (error) {
      throw new Error(`Failed to fetch messages: ${error.message}`)
    }

    if (!data || data.length === 0) {
      break
    }

    for (const message of data) {
      totalChecked += 1
      const rawFromMe = message?.raw_payload?.key?.fromMe
      if (rawFromMe === undefined || rawFromMe === null) {
        continue
      }

      const normalized = normalizeFromMe(rawFromMe)
      if (normalized === message.from_me) {
        continue
      }

      const { error: updateError } = await supabase
        .from('whatsapp_messages')
        .update({ from_me: normalized })
        .eq('id', message.id)

      if (updateError) {
        console.error(`Failed to update message ${message.id}:`, updateError.message)
        continue
      }

      totalFixed += 1
    }

    if (data.length < batchSize) {
      break
    }

    offset += batchSize
  }

  console.log(`Checked ${totalChecked} messages. Fixed ${totalFixed} rows.`)
}

async function refreshContacts() {
  const { data: contacts, error } = await supabase
    .from('whatsapp_contacts')
    .select('remote_jid')

  if (error) {
    throw new Error(`Failed to fetch contacts: ${error.message}`)
  }

  if (!contacts || contacts.length === 0) {
    console.log('No contacts found.')
    return
  }

  let updated = 0

  for (const contact of contacts) {
    const { data: lastMessage, error: lastError } = await supabase
      .from('whatsapp_messages')
      .select('from_me, content, caption, timestamp')
      .eq('remote_jid', contact.remote_jid)
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastError) {
      console.error(`Failed to fetch last message for ${contact.remote_jid}:`, lastError.message)
      continue
    }

    if (!lastMessage) {
      continue
    }

    const lastContent = lastMessage.content || lastMessage.caption || '[Midia]'

    const { error: updateError } = await supabase
      .from('whatsapp_contacts')
      .update({
        last_message_content: lastContent,
        last_message_timestamp: lastMessage.timestamp,
        last_message_from_me: lastMessage.from_me
      })
      .eq('remote_jid', contact.remote_jid)

    if (updateError) {
      console.error(`Failed to update contact ${contact.remote_jid}:`, updateError.message)
      continue
    }

    updated += 1
  }

  console.log(`Refreshed ${updated} contacts.`)
}

async function main() {
  console.log('Fixing from_me using raw_payload...')
  await fixMessages()
  console.log('Refreshing contact last message flags...')
  await refreshContacts()
  console.log('Done.')
}

main().catch((error) => {
  console.error('Fix failed:', error)
  process.exit(1)
})
