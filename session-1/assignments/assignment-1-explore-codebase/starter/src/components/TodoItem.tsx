import { useState, useRef } from 'react'

export interface Todo {
  id: string
  text: string
  done: boolean
  createdAt: number
}

interface Props {
  todo: Todo
  onToggle: (id: string) => void
  onRemove: (id: string) => void
  onEdit: (id: string, text: string) => void
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return Math.floor(s / 60) + 'm'
  if (s < 86400) return Math.floor(s / 3600) + 'h'
  return Math.floor(s / 86400) + 'd'
}

export default function TodoItem({ todo, onToggle, onRemove, onEdit }: Props) {
  const [removing, setRemoving] = useState(false)
  const labelRef = useRef<HTMLDivElement>(null)

  const handleRemove = () => {
    setRemoving(true)
    setTimeout(() => onRemove(todo.id), 220)
  }

  const beginEdit = () => {
    const el = labelRef.current
    if (!el) return
    el.contentEditable = 'true'
    el.focus()
    const range = document.createRange()
    range.selectNodeContents(el)
    range.collapse(false)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
  }

  const handleBlur = () => {
    const el = labelRef.current
    if (!el) return
    el.contentEditable = 'false'
    const v = el.textContent?.trim() ?? ''
    if (!v) { handleRemove(); return }
    if (v !== todo.text) onEdit(todo.id, v)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); labelRef.current?.blur() }
    if (e.key === 'Escape') {
      if (labelRef.current) labelRef.current.textContent = todo.text
      labelRef.current?.blur()
    }
  }

  return (
    <li className={`item${todo.done ? ' done' : ''}${removing ? ' removing' : ''}`}>
      <input
        type="checkbox"
        className="check"
        checked={todo.done}
        aria-label="Mark complete"
        onChange={() => onToggle(todo.id)}
      />
      <div
        ref={labelRef}
        className="label"
        role="textbox"
        onDoubleClick={beginEdit}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        suppressContentEditableWarning
      >
        {todo.text}
      </div>
      <span className="stamp">{timeAgo(todo.createdAt)}</span>
      <button className="delete" aria-label="Delete" onClick={handleRemove}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </li>
  )
}
