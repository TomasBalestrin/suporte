'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Props {
  content: string
  className?: string
}

/**
 * Renderiza conteudo de mensagem com suporte a markdown basico:
 * - Links [texto](url) viram clicaveis (abrem em nova aba)
 * - URLs soltas (https://...) auto-linkam via remark-gfm
 * - **negrito**, *italico*, listas
 * - Preserva quebras de linha
 */
export function MessageContent({ content, className }: Props) {
  return (
    <div className={`text-sm prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_a]:text-primary [&_a]:underline [&_a]:break-all ${className || ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all">
              {children}
            </a>
          ),
          p: ({ children }) => <p className="whitespace-pre-wrap my-1">{children}</p>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
