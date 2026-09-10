import { useEffect, useRef, useState } from 'react'
import { chatApi } from '../api'

interface Props {
  token: string
  /** Shown in the empty state, e.g. "Ask about labs, faculty, events…" */
  placeholder?: string
}

interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
  grounded?: boolean
  pending?: boolean
}

/**
 * A fully self-contained chat box for the department AI agent.
 *
 * Deliberately styled with inline styles rather than a stylesheet: this
 * component gets dropped into three different dashboards (Student,
 * Faculty, HOD), each with its own CSS classes that don't overlap. Rather
 * than guess which classnames exist in each host page — the exact mistake
 * that caused the landing-page crash earlier in this project — it carries
 * its own look everywhere it's used.
 */
function AiChat({ token, placeholder }: Props) {
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [question, setQuestion] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [conversationId, setConversationId] = useState<number | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [turns])

  async function send() {
    const q = question.trim()
    if (!q || sending) return

    setError('')
    setQuestion('')
    setTurns((t) => [...t, { role: 'user', content: q }, { role: 'assistant', content: '', pending: true }])
    setSending(true)

    try {
      const res = await chatApi.ask(token, q, conversationId)
      setConversationId(res.conversation_id)
      setTurns((t) => {
        const next = [...t]
        next[next.length - 1] = {
          role: 'assistant',
          content: res.answer,
          sources: res.sources,
          grounded: res.grounded,
        }
        return next
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong asking the AI agent.'
      setError(msg)
      // Drop the pending placeholder rather than leave a blank bubble.
      setTurns((t) => t.slice(0, -1))
    } finally {
      setSending(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        maxWidth: 720,
        height: 520,
        border: '1px solid #e5e7eb',
        borderRadius: 14,
        background: '#ffffff',
        overflow: 'hidden',
        fontFamily: 'Inter, Arial, sans-serif',
      }}
    >
      {/* message list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {turns.length === 0 && (
          <p style={{ margin: 'auto', color: '#9ca3af', fontSize: 13, textAlign: 'center', maxWidth: 320 }}>
            {placeholder ?? 'Ask the department AI agent about faculty, labs, events, achievements, or academics.'}
          </p>
        )}

        {turns.map((turn, i) => (
          <div
            key={i}
            style={{
              alignSelf: turn.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '82%',
              padding: '10px 14px',
              borderRadius: 12,
              fontSize: 13.5,
              lineHeight: 1.55,
              whiteSpace: 'pre-wrap',
              background: turn.role === 'user' ? '#111827' : '#f3f4f6',
              color: turn.role === 'user' ? '#ffffff' : '#111827',
            }}
          >
            {turn.pending ? (
              <span style={{ color: '#9ca3af' }}>Thinking…</span>
            ) : (
              <>
                {turn.content}
                {turn.role === 'assistant' && turn.grounded && turn.sources && turn.sources.length > 0 && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #e5e7eb', fontSize: 11, color: '#6b7280' }}>
                    Source{turn.sources.length > 1 ? 's' : ''}: {turn.sources.join(' · ')}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div style={{ padding: '8px 20px', fontSize: 12, color: '#b91c1c', background: '#fef2f2', borderTop: '1px solid #fecaca' }}>
          {error}
        </div>
      )}

      {/* input row */}
      <div style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid #e5e7eb', background: '#f9fafb' }}>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type a question and press Enter…"
          rows={1}
          disabled={sending}
          style={{
            flex: 1,
            resize: 'none',
            padding: '10px 12px',
            borderRadius: 9,
            border: '1px solid #e5e7eb',
            fontFamily: 'inherit',
            fontSize: 13.5,
            outline: 'none',
            background: '#ffffff',
          }}
        />
        <button
          onClick={send}
          disabled={sending || !question.trim()}
          style={{
            padding: '0 18px',
            border: 'none',
            borderRadius: 9,
            background: sending || !question.trim() ? '#9ca3af' : '#111827',
            color: '#ffffff',
            fontFamily: 'inherit',
            fontSize: 13,
            fontWeight: 600,
            cursor: sending || !question.trim() ? 'default' : 'pointer',
          }}
        >
          {sending ? '…' : 'Ask'}
        </button>
      </div>
    </div>
  )
}

export default AiChat
