'use client'
// components/ia-panel/IAPanel.tsx
// Panel lateral de retroalimentación de IA.
// Muestra preguntas socráticas, sugerencias y validaciones.

import { useState } from 'react'
import { SparklesIcon, XMarkIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

interface IAPanelProps {
  title?: string
  messages: IAPanelMessage[]
  isLoading?: boolean
  className?: string
  collapsible?: boolean
}

export interface IAPanelMessage {
  id: string
  type: 'suggestion' | 'warning' | 'success' | 'question' | 'info'
  content: string
  action?: {
    label: string
    onClick: () => void
  }
  dismissible?: boolean
}

const TYPE_STYLES = {
  suggestion: { bg: 'bg-teal-50',   border: 'border-teal-200', icon: '💡', text: 'text-teal-800' },
  warning:    { bg: 'bg-amber-50',  border: 'border-amber-200', icon: '⚠️', text: 'text-amber-800' },
  success:    { bg: 'bg-green-50',  border: 'border-green-200', icon: '✓',  text: 'text-green-800' },
  question:   { bg: 'bg-indigo-50', border: 'border-indigo-200', icon: '?', text: 'text-indigo-800' },
  info:       { bg: 'bg-stone-50',  border: 'border-stone-200', icon: 'ℹ', text: 'text-stone-700' },
}

export function IAPanel({ title = 'Asistente IA', messages, isLoading, className, collapsible }: IAPanelProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const visibleMessages = messages.filter(m => !dismissed.has(m.id))

  if (visibleMessages.length === 0 && !isLoading) return null

  return (
    <aside className={cn('ia-panel p-4 space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SparklesIcon className="w-4 h-4 text-teal-600" />
          <span className="text-xs font-bold uppercase tracking-widest text-teal-700">
            {title}
          </span>
        </div>
        {collapsible && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-teal-600 hover:text-teal-800 transition-colors"
          >
            {collapsed
              ? <ChevronDownIcon className="w-4 h-4" />
              : <ChevronUpIcon className="w-4 h-4" />
            }
          </button>
        )}
      </div>

      {/* Loading state */}
      {isLoading && !collapsed && (
        <div className="flex items-center gap-3 py-2">
          <div className="flex gap-1">
            {[0,1,2].map(i => (
              <span
                key={i}
                className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <span className="text-xs text-teal-700">Analizando tu respuesta…</span>
        </div>
      )}

      {/* Messages */}
      {!collapsed && visibleMessages.map(msg => {
        const style = TYPE_STYLES[msg.type]
        return (
          <div
            key={msg.id}
            className={cn(
              'rounded-lg border p-3 text-sm animate-fade-in-up',
              style.bg, style.border, style.text
            )}
          >
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-sm leading-none flex-shrink-0">{style.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="leading-snug">{msg.content}</p>
                {msg.action && (
                  <button
                    onClick={msg.action.onClick}
                    className="mt-2 text-xs font-semibold underline underline-offset-2 hover:opacity-70 transition-opacity"
                  >
                    {msg.action.label}
                  </button>
                )}
              </div>
              {msg.dismissible && (
                <button
                  onClick={() => setDismissed(prev => new Set([...prev, msg.id]))}
                  className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
                >
                  <XMarkIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )
      })}
    </aside>
  )
}
