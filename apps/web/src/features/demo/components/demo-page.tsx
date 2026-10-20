import { ExternalLink, LayoutDashboard, MessagesSquare, PlugZap, RotateCcw, Settings, Bot, FileSignature } from 'lucide-react'
import * as React from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/primitives'
import { ErrorNotice } from '@/components/ui/states'
import { Logo } from '@/features/brand'
import { cn } from '@/lib/cn'
import { errorMessage } from '@/lib/http'
import { useResource } from '@/lib/use-resource'

import { demoApi, type DemoStatus } from '../api'
import { AttendancePanel } from './attendance-panel'
import { EnvelopesPanel } from './envelopes-panel'
import { IntegrationsPanel } from './integrations-panel'
import { PhoneSimulator } from './phone-simulator'

type Tab = 'integracoes' | 'atendimento' | 'envelopes'

const TABS: { id: Tab; step: number; label: string; crumb: string; icon: typeof PlugZap }[] = [
    { id: 'integracoes', step: 1, label: 'Integrações', crumb: 'Configurações › Integrações', icon: PlugZap },
    { id: 'atendimento', step: 2, label: 'Atendimento', crumb: 'Conversas › Maria Aparecida', icon: MessagesSquare },
    { id: 'envelopes', step: 3, label: 'Envelopes', crumb: 'LíderSign › Envelopes', icon: FileSignature },
]

const INERT = [
    { label: 'Painel', icon: LayoutDashboard },
    { label: 'Agentes', icon: Bot },
    { label: 'Configurações', icon: Settings },
]

export function DemoPage() {
    const [tab, setTab] = React.useState<Tab>('integracoes')
    const [confirmReset, setConfirmReset] = React.useState(false)
    const [resetting, setResetting] = React.useState(false)
    const [resetKey, setResetKey] = React.useState(0)
    const status = useResource<DemoStatus>(demoApi.statusUrl)
    const active = Boolean(status.data?.active)
    const current = TABS.find((item) => item.id === tab) ?? TABS[0]

    async function reset() {
        setResetting(true)
        try {
            await demoApi.reset()
            await status.reload()
            setTab('integracoes')
            setResetKey((key) => key + 1)
            toast('Demonstração reiniciada. O LíderSign voltou a ficar desligado.')
        } catch (error) {
            toast.error(errorMessage(error))
        } finally {
            setResetting(false)
            setConfirmReset(false)
        }
    }

    return (
        <div className="min-h-dvh bg-surface/60">
            <header className="border-b border-line bg-white">
                <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6">
                    <div className="flex min-w-0 items-center gap-4">
                        <Logo />
                        <span aria-hidden className="hidden h-5 w-px bg-line sm:block" />
                        <Badge tone="neutral" className="hidden sm:inline-flex">
                            Simulação da LíderHub para demonstração
                        </Badge>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                        <Button asChild variant="ghost" size="sm">
                            <Link to="/painel" target="_blank">
                                Painel do escritório <ExternalLink aria-hidden />
                            </Link>
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => setConfirmReset(true)}>
                            <RotateCcw aria-hidden /> <span className="hidden sm:inline">Reiniciar demo</span>
                        </Button>
                    </div>
                </div>
            </header>

            <main className="mx-auto grid max-w-[1400px] gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,1fr)_360px]">
                <section
                    aria-label="LíderHub (simulação)"
                    className="min-w-0 overflow-hidden rounded-2xl border border-line bg-white md:grid md:grid-cols-[208px_minmax(0,1fr)]"
                >
                    <aside className="flex flex-col bg-navy text-white md:min-h-[780px]">
                        <div className="flex h-14 items-center gap-2 px-5">
                            <span className="text-[15px] font-semibold tracking-[-0.02em]">LíderHub</span>
                            <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-white/60">
                                demo
                            </span>
                        </div>
                        <div className="mx-3 mb-4 rounded-lg border border-navy-line bg-navy-2 px-3 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">Escritório</p>
                            <p className="mt-0.5 truncate text-[13px] text-white/85">
                                {status.data?.tenant?.name ?? 'Escritório Demo'}
                            </p>
                        </div>
                        <nav aria-label="Roteiro da demonstração" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
                            {TABS.map((item) => {
                                const Icon = item.icon
                                const selected = item.id === tab
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setTab(item.id)}
                                        aria-current={selected ? 'page' : undefined}
                                        className={cn(
                                            'flex h-10 shrink-0 items-center gap-2.5 rounded-lg px-3 text-left text-sm font-medium transition-colors duration-150',
                                            selected ? 'bg-white/10 text-white' : 'text-white/65 hover:bg-white/5 hover:text-white',
                                        )}
                                    >
                                        <Icon className="size-4 shrink-0" aria-hidden />
                                        <span className="flex-1">{item.label}</span>
                                        <span
                                            className={cn(
                                                'hidden size-5 items-center justify-center rounded-full text-[11px] tabular md:flex',
                                                selected ? 'bg-brand text-white' : 'bg-white/10 text-white/60',
                                            )}
                                        >
                                            {item.step}
                                        </span>
                                    </button>
                                )
                            })}
                            <div aria-hidden className="my-3 hidden h-px bg-navy-line md:block" />
                            {INERT.map((item) => {
                                const Icon = item.icon
                                return (
                                    <span
                                        key={item.label}
                                        aria-hidden
                                        className="hidden h-10 items-center gap-2.5 px-3 text-sm text-white/30 md:flex"
                                    >
                                        <Icon className="size-4" />
                                        {item.label}
                                    </span>
                                )
                            })}
                        </nav>
                        <p className="mt-auto hidden px-5 py-5 text-[11px] leading-relaxed text-white/35 md:block">
                            Siga os passos 1, 2 e 3. O celular ao lado é o do cliente.
                        </p>
                    </aside>

                    <div className="min-w-0">
                        <div className="flex h-14 items-center justify-between gap-3 border-b border-line px-5 sm:px-8">
                            <p className="truncate text-sm text-muted">{current.crumb}</p>
                            {status.data ? (
                                <Badge tone={active ? 'success' : 'neutral'} dot>
                                    {active ? 'LíderSign ativo' : 'LíderSign desligado'}
                                </Badge>
                            ) : null}
                        </div>
                        <div className="px-5 py-8 sm:px-8 sm:py-10">
                            {status.loading && !status.data ? (
                                <div className="space-y-4">
                                    <Skeleton className="h-8 w-48" />
                                    <Skeleton className="h-4 w-80" />
                                    <Skeleton className="mt-6 h-40 w-full rounded-2xl" />
                                </div>
                            ) : status.error && !status.data ? (
                                <ErrorNotice
                                    message="Não foi possível falar com o LíderSign. Confira se a API está rodando (porta 4000 em desenvolvimento) e tente de novo."
                                    action={
                                        <Button variant="secondary" size="sm" onClick={() => void status.reload()}>
                                            Tentar de novo
                                        </Button>
                                    }
                                />
                            ) : (
                                <div key={`${tab}-${resetKey}`} className="animate-enter">
                                    {tab === 'integracoes' ? (
                                        <IntegrationsPanel
                                            status={status.data}
                                            onChanged={status.reload}
                                            onNext={() => setTab('atendimento')}
                                        />
                                    ) : tab === 'atendimento' ? (
                                        <AttendancePanel
                                            status={status.data}
                                            onGoToIntegrations={() => setTab('integracoes')}
                                            onSent={() => undefined}
                                        />
                                    ) : (
                                        <EnvelopesPanel status={status.data} onGoToAttendance={() => setTab('atendimento')} />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                <aside className="lg:sticky lg:top-6 lg:self-start">
                    <PhoneSimulator
                        key={resetKey}
                        active={active}
                        whatsappProvider={status.data?.whatsappProvider ?? 'simulator'}
                    />
                </aside>
            </main>

            <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
                <DialogContent className="p-6">
                    <DialogTitle>Reiniciar a demonstração?</DialogTitle>
                    <DialogDescription className="mt-2">
                        Apaga o escritório de demonstração, os modelos, os envelopes e as mensagens. Bom para gravar o
                        "Ativar" de novo.
                    </DialogDescription>
                    <div className="mt-6 flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setConfirmReset(false)}>
                            Manter
                        </Button>
                        <Button variant="dark" loading={resetting} onClick={() => void reset()}>
                            Reiniciar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
