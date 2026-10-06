import { NextResponse } from 'next/server'
import { getAdmin } from '@/lib/server/admin'
import { assinaturaValida, discord, PERM } from '@/lib/server/discord'

export const runtime = 'nodejs'

interface Time {
  tag: string
  captain_discord_id: string | null
}
interface Partida {
  id: number
  discord_channel_id: string | null
  ready_a: boolean
  ready_b: boolean
  a: Time | null
  b: Time | null
}

const efemera = (content: string) => NextResponse.json({ type: 4, data: { content, flags: 64 } })

export async function POST(req: Request) {
  const corpo = await req.text()
  if (!assinaturaValida(corpo, req.headers.get('x-signature-ed25519'), req.headers.get('x-signature-timestamp'))) {
    return new NextResponse('Assinatura inválida', { status: 401 })
  }

  const i = JSON.parse(corpo)

  // 1 = PING (verificação do endpoint no Developer Portal)
  if (i.type === 1) return NextResponse.json({ type: 1 })

  // 3 = clique em botão
  if (i.type === 3 && typeof i.data?.custom_id === 'string' && i.data.custom_id.startsWith('ready:')) {
    const matchId = Number(i.data.custom_id.split(':')[1])
    const userId: string | undefined = i.member?.user?.id
    const db = getAdmin()

    const { data } = await db
      .from('matches')
      .select(
        'id, discord_channel_id, ready_a, ready_b, a:teams!team_a_id(tag, captain_discord_id), b:teams!team_b_id(tag, captain_discord_id)'
      )
      .eq('id', matchId)
      .maybeSingle()
    const m = data as unknown as Partida | null
    if (!m || !m.a || !m.b) return efemera('Partida não encontrada.')

    const ehA = userId === m.a.captain_discord_id
    const ehB = userId === m.b.captain_discord_id
    if (!ehA && !ehB) return efemera('Só os capitães das duas equipes podem confirmar.')

    const readyA = m.ready_a || ehA
    const readyB = m.ready_b || ehB
    await db.from('matches').update({ ready_a: readyA, ready_b: readyB }).eq('id', m.id)

    if (readyA && readyB) {
      const liberar = (PERM.VIEW | PERM.HISTORY | PERM.SEND).toString()
      const canal = m.discord_channel_id || i.channel_id
      for (const cap of [m.a.captain_discord_id, m.b.captain_discord_id]) {
        await discord(`/channels/${canal}/permissions/${cap}`, {
          method: 'PUT',
          body: JSON.stringify({ type: 1, allow: liberar, deny: '0' }),
        }).catch((e) => console.error('Erro ao liberar chat:', e))
      }
      return NextResponse.json({
        type: 7,
        data: {
          content: `Os dois capitães confirmaram. Chat liberado para **[${m.a.tag}]** e **[${m.b.tag}]**. Boa partida!`,
          components: [],
        },
      })
    }

    return NextResponse.json({
      type: 7,
      data: {
        content:
          `**[${m.a.tag}]**: ${readyA ? 'pronto' : 'aguardando'}\n` +
          `**[${m.b.tag}]**: ${readyB ? 'pronto' : 'aguardando'}\n` +
          `O chat é liberado quando os dois capitães confirmarem.`,
        components: [
          { type: 1, components: [{ type: 2, style: 3, label: 'Estou pronto', custom_id: `ready:${m.id}` }] },
        ],
      },
    })
  }

  return efemera('Ação não reconhecida.')
}
