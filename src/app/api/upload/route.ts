import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { MAX_FILE_SIZE, ALLOWED_FILE_TYPES } from '@/lib/utils/constants'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

// Validate file content matches claimed MIME type by checking magic bytes
async function validateFileContent(file: File): Promise<boolean> {
  const buffer = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  if (buffer.length < 4) return false

  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return true
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return true
  // GIF: 47 49 46
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return true
  // PDF: 25 50 44 46
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) return true
  // ZIP/DOCX: 50 4B 03 04
  if (buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04) return true
  // MP4: has 'ftyp' at offset 4
  if (buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) return true
  // DOC (OLE): D0 CF 11 E0
  if (buffer[0] === 0xD0 && buffer[1] === 0xCF && buffer[2] === 0x11 && buffer[3] === 0xE0) return true

  return false
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const { allowed } = rateLimit(`upload:${ip}`, { limit: 10, windowSeconds: 60 })
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Muitas requisicoes. Aguarde um momento.' },
        { status: 429 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const ticketId = formData.get('ticket_id') as string | null
    const accessToken = formData.get('access_token') as string | null

    // Authorization: either a valid access_token or an authenticated admin session
    let authorized = false

    if (accessToken && ticketId) {
      const admin = createAdminClient()
      const { data: ticket } = await admin
        .from('tickets')
        .select('id')
        .eq('id', ticketId)
        .eq('access_token', accessToken)
        .single()
      authorized = !!ticket
    } else {
      const supabase = await createServerSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user ?? null
      authorized = !!user
    }

    if (!authorized) {
      return NextResponse.json(
        { success: false, error: 'Nao autorizado' },
        { status: 403 }
      )
    }

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Nenhum arquivo enviado' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'Arquivo muito grande (maximo 5MB)' },
        { status: 400 }
      )
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Tipo de arquivo nao permitido' },
        { status: 400 }
      )
    }

    // Validate actual file content matches declared type
    if (!(await validateFileContent(file))) {
      return NextResponse.json(
        { success: false, error: 'Conteudo do arquivo nao corresponde ao tipo declarado' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Generate unique file path
    const ext = file.name.split('.').pop() || 'bin'
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 10)
    const folder = ticketId || 'general'
    const filePath = `${folder}/${timestamp}-${randomId}.${ext}`

    // Upload to Supabase Storage
    const buffer = Buffer.from(await file.arrayBuffer())
    const { data, error } = await supabase.storage
      .from('attachments')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (error) throw error

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('attachments')
      .getPublicUrl(data.path)

    return NextResponse.json({
      success: true,
      data: {
        path: data.path,
        url: urlData.publicUrl,
        name: file.name,
        size: file.size,
        type: file.type,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erro ao fazer upload' },
      { status: 500 }
    )
  }
}
