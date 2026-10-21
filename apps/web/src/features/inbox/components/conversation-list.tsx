import type { ContactDto } from '@lidersign/shared'
import { CheckCircle2, Clock3, Inbox, Search } from 'lucide-react'
import * as React from 'react'

import { cn, formatTime, relativeTime, Skeleton } from '@lidersign/ui'

import { Avatar } from './avatar'
import { ContractChip } from './contract-chip'

type Filter = 'todas' | 'aguardando' | 'assinados'

const waiting = (contact: ContactDto) =>
    contact.contract?.status === 'SENT' || contact.contract?.status === 'VIEWED'
const signed = (contact: ContactDto) =>
    contact.contract?.status === 'SIGNED' || contact.contract?.status === 'COMPLETED'

function when(iso: string) {
    const age = Date.now() - new Date(iso).getTime()
    return age < 24 * 60 * 60 * 1000 ? formatTime(iso) : relativeTime(iso)
}

export function ConversationList({
    contacts,
    loading,
    selected,
    onSelect,
}: {
    contacts: ContactDto[] | undefined
    loading: boolean
    selected: string | null
    onSelect: (id: string) => void
}) {
    const [filter, setFilter] = React.useState<Filter>('todas')
    const [query, setQuery] = React.useState('')
    const all = contacts ?? []
    const needle = query.trim().toLowerCase()
    const visible = all
        .filter((contact) =>
            filter === 'aguardando' ? waiting(contact) : filter === 'assinados' ? signed(contact) : true,
        )
        .filter((contact) => !needle || contact.name.toLowerCase().includes(needle))

    return (
        <section aria-label="Conversas" className="flex min-h-0 flex-col border-r border-line">
            <div className="space-y-3 border-b border-line p-3">
                <div className="flex rounded-lg bg-surface p-1 text-sm">
                    <span className="flex-1 rounded-md bg-white py-1.5 text-center font-medium shadow-[0_1px_2px_rgba(11,18,32,0.06)]">
                        Conversas
                    </span>
                    <span
                        className="flex-1 py-1.5 text-center text-subtle"
                        title="Fora do escopo da demonstração"
                    >
                        Ligações
                    </span>
                </div>
                <label className="flex h-9 items-center gap-2 rounded-lg border border-line px-3 text-sm focus-within:border-brand/50">
                    <Search className="size-4 text-subtle" aria-hidden />
                    <span className="sr-only">Buscar conversas</span>
                    <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Buscar conversas..."
                        className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-subtle"
                    />
                </label>
                <div className="flex gap-1.5" role="group" aria-label="Filtrar conversas">
                    <FilterChip active={filter === 'todas'} onClick={() => setFilter('todas')}>
                        <Inbox className="size-3.5" aria-hidden /> {all.length}
                    </FilterChip>
                    <FilterChip
                        active={filter === 'aguardando'}
                        onClick={() => setFilter('aguardando')}
                        tone="amber"
                        label="Aguardando assinatura"
                    >
                        <Clock3 className="size-3.5" aria-hidden /> {all.filter(waiting).length}
                    </FilterChip>
                    <FilterChip
                        active={filter === 'assinados'}
                        onClick={() => setFilter('assinados')}
                        tone="emerald"
                        label="Contrato assinado"
                    >
                        <CheckCircle2 className="size-3.5" aria-hidden /> {all.filter(signed).length}
                    </FilterChip>
                </div>
            </div>

            <ul className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
                {loading && !contacts
                    ? Array.from({ length: 4 }, (_, index) => (
                          <li key={index} className="flex gap-3 border-b border-line px-3 py-3.5">
                              <Skeleton className="size-10 rounded-full" />
                              <div className="flex-1 space-y-2">
                                  <Skeleton className="h-4 w-32" />
                                  <Skeleton className="h-3 w-44" />
                              </div>
                          </li>
                      ))
                    : visible.map((contact) => (
                          <li key={contact.id}>
                              <button
                                  type="button"
                                  onClick={() => onSelect(contact.id)}
                                  aria-current={selected === contact.id ? 'true' : undefined}
                                  className={cn(
                                      'flex w-full gap-3 border-b border-line px-3 py-3.5 text-left transition-colors',
                                      selected === contact.id ? 'bg-surface' : 'hover:bg-surface/60',
                                  )}
                              >
                                  <Avatar initials={contact.initials} seed={contact.name} whatsapp />
                                  <span className="min-w-0 flex-1">
                                      <span className="flex items-center justify-between gap-2">
                                          <span className="truncate text-sm font-semibold">
                                              {contact.name}
                                          </span>
                                          {contact.lastMessage ? (
                                              <span className="shrink-0 text-[11px] text-subtle tabular">
                                                  {when(contact.lastMessage.createdAt)}
                                              </span>
                                          ) : null}
                                      </span>
                                      <span className="mt-0.5 block truncate text-[13px] text-muted">
                                          {contact.lastMessage
                                              ? `${contact.lastMessage.direction === 'OUT' ? 'Agente: ' : ''}${contact.lastMessage.body.replace(/\*/g, '')}`
                                              : 'Sem mensagens'}
                                      </span>
                                      <ContractChip contact={contact} className="mt-1.5" />
                                  </span>
                              </button>
                          </li>
                      ))}
                {!loading && contacts && !visible.length ? (
                    <li className="flex flex-col items-center px-6 py-14 text-center">
                        <span className="flex size-11 items-center justify-center rounded-full bg-surface">
                            <Inbox className="size-5 text-subtle" aria-hidden />
                        </span>
                        <p className="mt-3 text-sm font-medium">Sem conversas por aqui</p>
                        <p className="mt-1 text-[13px] text-muted">
                            Mude o filtro ou a busca para ver as outras.
                        </p>
                    </li>
                ) : null}
            </ul>
        </section>
    )
}

function FilterChip({
    active,
    onClick,
    children,
    tone = 'neutral',
    label,
}: {
    active: boolean
    onClick: () => void
    children: React.ReactNode
    tone?: 'neutral' | 'amber' | 'emerald'
    label?: string
}) {
    const tones = {
        neutral: active ? 'border-ink/20 bg-surface text-ink' : 'border-line text-muted',
        amber: active ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-line text-amber-700',
        emerald: active
            ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
            : 'border-line text-emerald-700',
    }
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            title={label}
            className={cn(
                'inline-flex h-7 items-center gap-1 rounded-lg border px-2 text-xs font-medium tabular transition-colors hover:bg-surface',
                tones[tone],
            )}
        >
            {children}
            {label ? <span className="sr-only">{label}</span> : null}
        </button>
    )
}
