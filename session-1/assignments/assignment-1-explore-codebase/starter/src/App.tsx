import { useState, useEffect, useRef, useCallback } from 'react'
import TodoItem, { type Todo } from './components/TodoItem'

const STORAGE_KEY = 'todo.v1'
type Filter = 'all' | 'active' | 'done'

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

function seed(): Todo[] {
  const now = Date.now()
  return [
    { id: uid(), text: 'Welcome — click the circle to check this off', done: false, createdAt: now },
    { id: uid(), text: 'Press / anywhere to focus the input', done: false, createdAt: now - 1 },
    { id: uid(), text: 'Double-click a task to edit it', done: false, createdAt: now - 2 },
  ]
}

function loadTodos(): Todo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return seed()
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : seed()
  } catch {
    return seed()
  }
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 5) return 'Late night.'
  if (h < 12) return 'Good morning.'
  if (h < 18) return 'Good afternoon.'
  return 'Good evening.'
}

function getDateStr(): string {
  return new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
}

export default function App() {
  const [todos, setTodos] = useState<Todo[]>(loadTodos)
  const [filter, setFilter] = useState<Filter>('all')
  const [lastCleared, setLastCleared] = useState<Todo[] | null>(null)
  const [toastMsg, setToastMsg] = useState('')
  const [showToast, setShowToast] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
  }, [todos])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target === inputRef.current || target.isContentEditable) return
      if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const fireToast = useCallback((msg: string) => {
    setToastMsg(msg)
    setShowToast(true)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setShowToast(false), 4000)
  }, [])

  const add = useCallback((text: string) => {
    const v = text.trim()
    if (!v) return
    setTodos(prev => [{ id: uid(), text: v, done: false, createdAt: Date.now() }, ...prev])
  }, [])

  const toggle = useCallback((id: string) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }, [])

  const remove = useCallback((id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id))
  }, [])

  const edit = useCallback((id: string, text: string) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, text } : t))
  }, [])

  const clearCompleted = useCallback(() => {
    const cleared = todos.filter(t => t.done)
    if (!cleared.length) return
    setLastCleared(cleared)
    setTodos(prev => prev.filter(t => !t.done))
    fireToast(`Cleared ${cleared.length} completed`)
  }, [todos, fireToast])

  const undo = useCallback(() => {
    if (!lastCleared) return
    setTodos(prev => [...lastCleared, ...prev])
    setLastCleared(null)
    setShowToast(false)
  }, [lastCleared])

  const total = todos.length
  const done = todos.filter(t => t.done).length
  const active = total - done
  const pct = total === 0 ? 0 : (done / total) * 100

  const visible = todos.filter(t =>
    filter === 'all' ? true : filter === 'active' ? !t.done : t.done
  )

  const counterText = total === 0
    ? 'No tasks yet'
    : active === 0
      ? `All ${total} done`
      : `${active} ${active === 1 ? 'task' : 'tasks'} left`

  const emptyText = total === 0
    ? 'Nothing here yet.'
    : filter === 'active'
      ? 'All caught up.'
      : 'No completed tasks.'

  return (
    <>
      <div className="app">
        <div className="container">
          <header className="header">
            <div className="brand">
              <span className="brand-mark" />
              <h2 className="brand-title">Todo</h2>
            </div>
            <span className="date">{getDateStr()}</span>
          </header>

          <section className="greeting">
            <h1>{getGreeting()}</h1>
            <div className="meta">
              <span>{counterText}</span>
              <div className="progress-track" aria-hidden>
                <div
                  className={`progress-fill${total > 0 && done === total ? ' complete' : ''}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </section>

          <form
            className="composer"
            onSubmit={e => {
              e.preventDefault()
              add(inputRef.current?.value ?? '')
              if (inputRef.current) inputRef.current.value = ''
            }}
          >
            <svg className="plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              placeholder="What needs to be done?"
              autoComplete="off"
              autoFocus
            />
            <span className="kbd">⏎</span>
          </form>

          <div className="filters">
            <div className="filter-group" role="tablist">
              {(['all', 'active', 'done'] as Filter[]).map(f => (
                <button
                  key={f}
                  className={`filter-btn${filter === f ? ' active' : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}{' '}
                  <span>{f === 'all' ? total : f === 'active' ? active : done}</span>
                </button>
              ))}
            </div>
            <button className="clear-btn" onClick={clearCompleted} disabled={done === 0}>
              Clear completed
            </button>
          </div>

          {visible.length > 0 ? (
            <ul className="list">
              {visible.map(t => (
                <TodoItem key={t.id} todo={t} onToggle={toggle} onRemove={remove} onEdit={edit} />
              ))}
            </ul>
          ) : (
            <div className="empty">
              <div className="glyph" />
              <p>{emptyText}</p>
              <div className="hint">Press <kbd>/</kbd> to add a task</div>
            </div>
          )}

          <footer className="footer">
            <span>saved locally</span>
          </footer>
        </div>
      </div>

      <div className={`toast${showToast ? ' show' : ''}`} role="status">
        <span>{toastMsg}</span>
        <button onClick={undo}>Undo</button>
      </div>
    </>
  )
}
