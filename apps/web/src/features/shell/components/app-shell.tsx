import type { OfficeMeDto } from '@lidersign/shared'
import {
    ChevronsUpDown,
    FileSignature,
    FileText,
    Inbox,
    LogOut,
    Menu,
    PanelLeft,
    RotateCcw,
    Settings,
    ShieldCheck,
    Sparkles,
    X,
} from 'lucide-react'
import * as React from 'react'
import { NavLink, useLocation } from 'react-router'
import { toast } from 'sonner'

import { cn, errorMessage, LogoMark, Tooltip } from '@lidersign/ui'

import { AssistantButton, AssistantPanel, useAssistant } from '@/features/assistant'
import { NotificationBell } from '@/features/notifications'
import { sessionApi } from '@/features/session'

type NavItem = { to: string; label: string; icon: typeof Inbox; badge?: string }

const SECTIONS: { title?: string; items: NavItem[] }[] = [
    { items: [{ to: '/atendimento', label: 'Caixa de entrada', icon: Inbox }] },
    {
        title: 'Contratos',
        items: [
            { to: '/contratos', label: 'Contratos', icon: FileSignature, badge: 'Novo' },
            { to: '/modelos', label: 'Modelos', icon: FileText },
        ],
    },
]

const NOTIFICATIONS_KEY = 'liderhub:notificacoes'

export function AppShell({ office, children }: { office: OfficeMeDto; children: React.ReactNode }) {
    const [collapsed, setCollapsed] = React.useState(false)
    const [drawer, setDrawer] = React.useState(false)
    const { pathname } = useLocation()

    React.useEffect(() => setDrawer(false), [pathname])

    return (
        <div className="flex h-dvh overflow-hidden bg-[#f7f7f8] text-ink">
            <aside className={cn('hidden w-[248px] shrink-0 flex-col', !collapsed && 'lg:flex')}>
                <Sidebar office={office} />
            </aside>

            {drawer ? (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <button
                        type="button"
                        aria-label="Fechar menu"
                        className="absolute inset-0 bg-ink/20"
                        onClick={() => setDrawer(false)}
                    />
                    <aside className="relative flex h-full w-[272px] flex-col bg-[#f7f7f8] animate-enter">
                        <button
                            type="button"
                            aria-label="Fechar menu"
                            onClick={() => setDrawer(false)}
                            className="absolute right-2 top-3 flex size-9 items-center justify-center rounded-lg text-muted hover:bg-white"
                        >
                            <X className="size-4" aria-hidden />
                        </button>
                        <Sidebar office={office} />
                    </aside>
                </div>
            ) : null}

            <div className={cn('flex min-w-0 flex-1 p-0 lg:p-2', !collapsed && 'lg:pl-0')}>
                <div className="flex min-w-0 flex-1 overflow-hidden bg-white lg:rounded-xl lg:border lg:border-line">
                    <div className="flex min-w-0 flex-1 flex-col">
                        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line px-3 sm:px-4">
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => setDrawer(true)}
                                    aria-label="Abrir menu"
                                    className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-surface lg:hidden"
                                >
                                    <Menu className="size-[18px]" aria-hidden />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCollapsed((value) => !value)}
                                    aria-label={collapsed ? 'Mostrar menu lateral' : 'Esconder menu lateral'}
                                    className="hidden size-9 items-center justify-center rounded-lg text-muted hover:bg-surface lg:flex"
                                >
                                    <PanelLeft className="size-[18px]" aria-hidden />
                                </button>
                                {office.demo ? (
                                    <Tooltip content="Contatos e telefones fictícios. O WhatsApp é simulado no celular da Caixa de entrada.">
                                        <span className="ml-1 hidden rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 sm:inline">
                                            Demonstração
                                        </span>
                                    </Tooltip>
                                ) : null}
                            </div>
                            <div className="flex items-center gap-1.5">
                                <AssistantButton />
                                <NotificationBell />
                                <span className="ml-1 hidden size-8 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand sm:flex">
                                    AP
                                </span>
                            </div>
                        </header>
                        <main id="conteudo" className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
                            {children}
                        </main>
                    </div>
                    <AssistantPanel />
                </div>
            </div>
        </div>
    )
}

function Sidebar({ office }: { office: OfficeMeDto }) {
    const assistant = useAssistant()
    return (
        <>
            <div className="flex h-14 items-center gap-2 px-4">
                <LogoMark className="size-6" />
                <span className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-[-0.02em]">
                    LíderHub
                </span>
                <ChevronsUpDown className="size-4 text-subtle" aria-hidden />
            </div>
            <nav aria-label="LíderHub" className="flex-1 space-y-5 overflow-y-auto px-2 pt-2">
                {SECTIONS.map((section, index) => (
                    <div key={section.title ?? index}>
                        {section.title ? (
                            <p className="px-2.5 pb-1.5 text-xs text-muted">{section.title}</p>
                        ) : null}
                        <div className="space-y-0.5">
                            {section.items.map((item) => (
                                <NavLink key={item.to} to={item.to} className={navClass}>
                                    <item.icon className="size-4" aria-hidden />
                                    {item.label}
                                    {item.badge ? (
                                        <span className="ml-auto rounded-md bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                                            {item.badge}
                                        </span>
                                    ) : null}
                                </NavLink>
                            ))}
                            {index === 0 ? (
                                <button
                                    type="button"
                                    onClick={() => assistant.setOpen(true)}
                                    className={cn(navClass({ isActive: assistant.open }), 'w-full')}
                                >
                                    <Sparkles className="size-4" aria-hidden />
                                    Assistente
                                </button>
                            ) : null}
                        </div>
                    </div>
                ))}
            </nav>
            <div className="space-y-0.5 px-2 pb-2">
                <NavLink to="/configuracoes" className={navClass}>
                    <Settings className="size-4" aria-hidden /> Configurações
                </NavLink>
                <NavLink to="/v" className={navClass}>
                    <ShieldCheck className="size-4" aria-hidden /> Verificar documento
                </NavLink>
            </div>
            <UserMenu office={office} />
        </>
    )
}

function navClass({ isActive }: { isActive: boolean }) {
    return cn(
        'flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors',
        isActive ? 'bg-[#ebebed] font-medium text-ink' : 'text-ink/80 hover:bg-[#efeff1]',
    )
}

function UserMenu({ office }: { office: OfficeMeDto }) {
    const [open, setOpen] = React.useState(false)
    const [busy, setBusy] = React.useState(false)
    const root = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
        if (!open) return
        const onDown = (event: MouseEvent) => {
            if (!root.current?.contains(event.target as Node)) setOpen(false)
        }
        const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
        document.addEventListener('mousedown', onDown)
        document.addEventListener('keydown', onKey)
        return () => {
            document.removeEventListener('mousedown', onDown)
            document.removeEventListener('keydown', onKey)
        }
    }, [open])

    async function run(action: 'reset' | 'logout') {
        setBusy(true)
        try {
            if (action === 'reset') await sessionApi.resetDemo()
            else await sessionApi.logout()
            try {
                localStorage.removeItem(NOTIFICATIONS_KEY)
            } catch {}
            window.location.assign(action === 'reset' ? '/atendimento' : '/entrar')
        } catch (error) {
            toast.error(errorMessage(error))
            setBusy(false)
        }
    }

    return (
        <div ref={root} className="relative border-t border-line px-2 py-2">
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left hover:bg-[#efeff1]"
            >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
                    AP
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">Ana Paula Souza</span>
                    <span className="block truncate text-xs text-muted">{office.tenant.name}</span>
                </span>
                <ChevronsUpDown className="size-4 shrink-0 text-subtle" aria-hidden />
            </button>
            {open ? (
                <div className="absolute bottom-[60px] left-2 right-2 z-40 overflow-hidden rounded-xl border border-line bg-white p-1 shadow-[0_8px_24px_rgba(11,18,32,0.08)] animate-pop">
                    {office.demo ? (
                        <MenuButton disabled={busy} onClick={() => void run('reset')}>
                            <RotateCcw className="size-4" aria-hidden /> Recomeçar a demonstração
                        </MenuButton>
                    ) : null}
                    <MenuButton disabled={busy} onClick={() => void run('logout')}>
                        <LogOut className="size-4" aria-hidden /> Sair
                    </MenuButton>
                </div>
            ) : null}
        </div>
    )
}

function MenuButton({
    children,
    onClick,
    disabled,
}: {
    children: React.ReactNode
    onClick: () => void
    disabled?: boolean
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink/85 hover:bg-surface disabled:opacity-50"
        >
            {children}
        </button>
    )
}
