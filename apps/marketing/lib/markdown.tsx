import type { ReactNode } from 'react'

function isBlockStart(line: string): boolean {
  return (
    line.startsWith('# ') ||
    line.startsWith('## ') ||
    line.startsWith('### ') ||
    line.startsWith('- ') ||
    line.trim() === '---'
  )
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const pattern = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|\*[^*]+\*)/g
  let last = 0
  let key = 0
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index))
    const token = match[0]
    if (token.startsWith('**')) {
      nodes.push(<strong key={key++}>{token.slice(2, -2)}</strong>)
    } else if (token.startsWith('[')) {
      const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
      if (link) {
        const href = link[2]
        const external = /^https?:\/\//i.test(href)
        nodes.push(
          <a
            key={key++}
            href={href}
            {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          >
            {link[1]}
          </a>,
        )
      }
    } else {
      nodes.push(<em key={key++}>{token.slice(1, -1)}</em>)
    }
    last = match.index + token.length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

export function renderMarkdown(markdown: string): ReactNode {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]
    if (line.trim() === '') {
      i += 1
      continue
    }
    if (line.trim() === '---') {
      blocks.push(<hr key={key++} />)
      i += 1
      continue
    }
    if (line.startsWith('### ')) {
      blocks.push(<h3 key={key++}>{renderInline(line.slice(4))}</h3>)
      i += 1
      continue
    }
    if (line.startsWith('## ')) {
      blocks.push(<h2 key={key++}>{renderInline(line.slice(3))}</h2>)
      i += 1
      continue
    }
    if (line.startsWith('# ')) {
      blocks.push(<h1 key={key++}>{renderInline(line.slice(2))}</h1>)
      i += 1
      continue
    }
    if (line.startsWith('- ')) {
      const items: string[] = []
      while (i < lines.length && lines[i].startsWith('- ')) {
        items.push(lines[i].slice(2))
        i += 1
      }
      blocks.push(
        <ul key={key++}>
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item)}</li>
          ))}
        </ul>,
      )
      continue
    }

    const para = [line]
    i += 1
    while (i < lines.length && lines[i].trim() !== '' && !isBlockStart(lines[i])) {
      para.push(lines[i])
      i += 1
    }
    const text = para.join(' ')
    const sources = text.startsWith('*') && text.endsWith('*')
    blocks.push(
      <p key={key++} className={sources ? 'blog-sources' : undefined}>
        {renderInline(text)}
      </p>,
    )
  }

  return <div className="blog-prose">{blocks}</div>
}
