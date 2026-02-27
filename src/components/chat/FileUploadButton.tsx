'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Paperclip, Loader2, X, FileText, Image as ImageIcon, Film } from 'lucide-react'
import { MAX_FILE_SIZE, ALLOWED_FILE_TYPES } from '@/lib/utils/constants'
import { toast } from 'sonner'

export interface Attachment {
  path: string
  url: string
  name: string
  size: number
  type: string
}

interface FileUploadButtonProps {
  ticketId?: string
  accessToken?: string
  onUpload: (attachment: Attachment) => void
  disabled?: boolean
}

export function FileUploadButton({ ticketId, accessToken, onUpload, disabled }: FileUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset input
    if (inputRef.current) inputRef.current.value = ''

    if (file.size > MAX_FILE_SIZE) {
      toast.error('Arquivo muito grande (máximo 5MB)')
      return
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast.error('Tipo de arquivo não permitido')
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      if (ticketId) formData.append('ticket_id', ticketId)
      if (accessToken) formData.append('access_token', accessToken)

      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const json = await res.json()

      if (json.success) {
        onUpload(json.data)
        toast.success('Arquivo enviado')
      } else {
        toast.error(json.error || 'Erro ao enviar arquivo')
      }
    } catch {
      toast.error('Erro ao enviar arquivo')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={ALLOWED_FILE_TYPES.join(',')}
        onChange={handleFileChange}
        aria-label="Selecionar arquivo para anexar"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled || isUploading}
        onClick={() => inputRef.current?.click()}
        aria-label={isUploading ? 'Enviando arquivo...' : 'Anexar arquivo (máximo 5MB)'}
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        ) : (
          <Paperclip className="h-4 w-4" aria-hidden="true" />
        )}
      </Button>
    </>
  )
}

export function AttachmentPreview({
  attachment,
  onRemove,
}: {
  attachment: Attachment
  onRemove?: () => void
}) {
  const isImage = attachment.type.startsWith('image/')
  const isVideo = attachment.type.startsWith('video/')

  function getIcon() {
    if (isImage) return <ImageIcon className="h-4 w-4 text-blue-400" aria-hidden="true" />
    if (isVideo) return <Film className="h-4 w-4 text-purple-400" aria-hidden="true" />
    return <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2" role="listitem">
      {getIcon()}
      <span className="max-w-[150px] truncate text-xs">{attachment.name}</span>
      <span className="text-xs text-muted-foreground">{formatSize(attachment.size)}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 text-muted-foreground hover:text-foreground"
          aria-label={`Remover ${attachment.name}`}
        >
          <X className="h-3 w-3" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

export function MessageAttachments({ attachments }: { attachments: Attachment[] }) {
  if (!attachments || attachments.length === 0) return null

  return (
    <div className="mt-2 space-y-1">
      {attachments.map((att, i) => {
        const isImage = att.type?.startsWith('image/')

        if (isImage) {
          return (
            <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" aria-label={`Ver imagem: ${att.name}`}>
              <img
                src={att.url}
                alt={att.name}
                loading="lazy"
                className="max-h-48 rounded-lg border border-border"
              />
            </a>
          )
        }

        return (
          <a
            key={i}
            href={att.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs hover:bg-muted/50"
            aria-label={`Baixar arquivo: ${att.name}`}
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            <span className="truncate">{att.name}</span>
          </a>
        )
      })}
    </div>
  )
}
