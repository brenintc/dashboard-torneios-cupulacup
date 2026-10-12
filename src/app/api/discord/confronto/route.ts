import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { exigirAdmin } from '@/lib/server/admin'
import { discord, PERM } from '@/lib/server/discord'

export const runtime = 'nodejs'

interface Time {
  name: string
  tag: string
  captain_discord_id: string | null
}
interface Partida {
  id: number
  stage: string
  group_name: string | null
  round: number
  discord_channel_id: string | null
  a: Time | null
  b: Time | null
}

const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export async function POST(req: Request) {
  let db: SupabaseClient
  try {
    ;({ sb: db } = await exigirAdmin())
  } catch {
    return NextResponse.json({ erro: 'Apenas administradores' }, { status: 403 })
  }

  const { match_id, acao } = await req.json().catch(() => ({}))
  const { data } = await db
    .from('matches')
    .select(
      'id, stage, group_name, round, discord_channel_id, a:teams!team_a_id(name, tag, captain_discord_id), b:teams!team_b_id(name, tag, captain_discord_id)'
    )
    .eq('id', match_id)
    .maybeSingle()
  const m = data as unknown as Partida | null
  if (!m) return NextResponse.json({ erro: 'Partida não encontrada' }, { status: 404 })

  const guild = process.env.DISCORD_GUILD_ID
  const botId = process.env.DISCORD_APP_ID
  if (!process.env.DISCORD_BOT_TOKEN || !guild || !botId) {
    return NextResponse.json({ erro: 'Bot do Discord não configurado no servidor' }, { status: 500 })
  }

  try {
    if (acao === 'encerrar') {
      if (m.discord_channel_id) {
        await discord(`/channels/${m.discord_channel_id}`, { method: 'DELETE' }).catch(() => null)
      }
      await db.from('matches').update({ discord_channel_id: null, ready_a: false, ready_b: false }).eq('id', m.id)
      return NextResponse.json({ ok: true })
    }

    if (m.discord_channel_id) return NextResponse.json({ erro: 'O canal deste confronto já existe' }, { status: 400 })
    if (!m.a || !m.b) return NextResponse.json({ erro: 'O confronto ainda não tem as duas equipes' }, { status: 400 })
    if (!m.a.captain_discord_id || !m.b.captain_discord_id) {
      return NextResponse.json({ erro: 'Uma das equipes não tem o Discord do capitão cadastrado' }, { status: 400 })
    }

    const ver = (PERM.VIEW | PERM.HISTORY).toString()
    const tudo = (PERM.VIEW | PERM.HISTORY | PERM.SEND).toString()
    const overwrites: object[] = [
      { id: guild, type: 0, allow: '0', deny: PERM.VIEW.toString() },
      { id: botId, type: 1, allow: (PERM.VIEW | PERM.HISTORY | PERM.SEND | PERM.MANAGE_CHANNELS).toString(), deny: '0' },
      { id: m.a.captain_discord_id, type: 1, allow: ver, deny: PERM.SEND.toString() },
      { id: m.b.captain_discord_id, type: 1, allow: ver, deny: PERM.SEND.toString() },
    ]
    if (process.env.DISCORD_STAFF_ROLE_ID) {
      overwrites.push({ id: process.env.DISCORD_STAFF_ROLE_ID, type: 0, allow: tudo, deny: '0' })
    }

    const fase = m.stage === 'grupos' ? `grupo-${(m.group_name || '').toLowerCase()}` : 'mata-mata'
    const canal = await discord<{ id: string }>(`/guilds/${guild}/channels`, {
      method: 'POST',
      body: JSON.stringify({
        name: `${fase}-${slug(m.a.tag)}-x-${slug(m.b.tag)}`.slice(0, 100),
        type: 0,
        parent_id: process.env.DISCORD_CATEGORY_ID || undefined,
        permission_overwrites: overwrites,
      }),
    })
    if (!canal) throw new Error('Canal não criado')

    await discord(`/channels/${canal.id}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        content:
          `<@${m.a.captain_discord_id}> <@${m.b.captain_discord_id}>\n` +
          `**[${m.a.tag}] ${m.a.name}** x **[${m.b.tag}] ${m.b.name}**\n` +
          `Os dois capitães precisam clicar em "Estou pronto". O chat é liberado quando ambos confirmarem.`,
        components: [
          { type: 1, components: [{ type: 2, style: 3, label: 'Estou pronto', custom_id: `ready:${m.id}` }] },
        ],
      }),
    })

    await db.from('matches').update({ discord_channel_id: canal.id, ready_a: false, ready_b: false }).eq('id', m.id)
    return NextResponse.json({ ok: true, channel_id: canal.id })
  } catch (e) {
    console.error('Erro Discord:', e)
    return NextResponse.json(
      {
        erro: 'Não foi possível criar o canal. Confira se o bot tem permissão e se os dois capitães estão no servidor do Discord.',
      },
      { status: 502 }
    )
  }
}
