import { SIGNING_CHANNEL_LABEL, type ContactDto, type MessageDto } from '@lidersign/shared'
import {
    BellRing,
    Bot,
    ChevronDown,
    Download,
    FileSignature,
    Fingerprint,
    Hash,
    MapPin,
    MessageCircle,
    Phone,
    Smartphone,
    Tag,
    UserRound,
    X,
} from 'lucide-react'
import * as React from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { Button, cn, errorMessage, relativeTime } from '@lidersign/ui'

import { AssistantHint } from '@/features/assistant'
import { envelopesApi, StatusPill } from '@/features/envelopes'

import { inboxApi } from '../api'
import { Avatar } from './avatar'
import { ContractSteps } from './contract-steps'
import { PhoneSimulator } from './phone-simulator'

export type PanelTab = 'contato' | 'celular'

export function ContactPanel({
    contact,
    officeName,
    clientMessages,
    clientLoading,
    tab,
    onTab,
    onSendContract,
    onClose,
    closeClassName,
}: {
    contact: ContactDto | undefined
    officeName: string
    clientMessages: MessageDto[] | undefined
    clientLoading: boolean
    tab: PanelTab
    onTab: (tab: PanelTab) => void
    onSendContract: () => void
    onClose?: () => void
    closeClassName?: string
}) {
    if (!contact) return <aside className="border-l border-line" />
    return (
        <aside aria-label="Dados do contato" className="flex min-h-0 flex-col border-l border-line bg-white">
            <div
                role="tablist"
                aria-label="Painel do contato"
                className="flex h-12 shrink-0 items-end gap-1 border-b border-line px-3"
            >
                <TabButton
                    active={tab === 'contato'}
                    onClick={() => onTab('contato')}
                    label="Contato e contrato"
                >
                    <UserRound />
                </TabButton>
                <TabButton
                    active={tab === 'celular'}
                    onClick={() => onTab('celular')}
                    label="Celular do cliente (simulação)"
                >
                    <Smartphone />
                </TabButton>
                {onClose ? (
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Fechar painel"
                        className={cn(
                            'mb-2 ml-auto flex size-8 items-center justify-center rounded-lg text-muted hover:bg-surface',
                            closeClassName,
                        )}
                    >
                        <X className="size-4" aria-hidden />
                    </button>
                ) : null}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
                {tab === 'celular' ? (
                    <PhoneSimulator
                        contact={contact}
                        officeName={officeName}
                        messages={clientMessages}
                        loading={clientLoading}
                    />
                ) : (
                    <ContactDetails
                        contact={contact}
                        onSendContract={onSendContract}
                        onOpenPhone={() => onTab('celular')}
                    />
                )}
            </div>
        </aside>
    )
}

function TabButton({
    active,
    onClick,
    label,
    children,
}: {
    active: boolean
    onClick: () => void
    label: string
    children: React.ReactNode
}) {
    return (
        <button
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={label}
            title={label}
            onClick={onClick}
            className={cn(
                'flex h-11 w-12 items-center justify-center border-b-2 transition-colors [&_svg]:size-[18px]',
                active ? 'border-brand text-brand' : 'border-transparent text-muted hover:text-ink',
            )}
        >
            {children}
        </button>
    )
}

function ContactDetails({
    contact,
    onSendContract,
    onOpenPhone,
}: {
    contact: ContactDto
    onSendContract: () => void
    onOpenPhone: () => void
}) {
    const contract = contact.contract
    const open = contract?.status === 'SENT' || contract?.status === 'VIEWED'
    const [nudging, setNudging] = React.useState(false)

    async function nudge() {
        if (!contract) return
        setNudging(true)
        try {
            await inboxApi.nudge(contract.id)
            toast.success('Lembrete enviado na conversa, de acordo com a etapa em que o cliente parou')
        } catch (error) {
            toast.error(errorMessage(error))
        } finally {
            setNudging(false)
        }
    }

    return (
        <div className="px-4 pb-6">
            <div className="flex items-center gap-3 py-4">
                <Avatar initials={contact.initials} seed={contact.name} whatsapp />
                <p className="min-w-0 truncate text-[15px] font-semibold">{contact.name}</p>
            </div>

            <Section title="Contrato">
                {contract ? (
                    <div className="space-y-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium">{contract.title}</p>
                                <p className="mt-0.5 text-xs text-muted">
                                    {SIGNING_CHANNEL_LABEL[contract.channel]}
                                </p>
                            </div>
                            <StatusPill status={contract.status} className="shrink-0" />
                        </div>
                        <ContractSteps envelope={contract} />
                        {contract.remindedAt && open ? (
                            <p className="text-xs text-subtle">
                                Último lembrete {relativeTime(contract.remindedAt)}
                            </p>
                        ) : null}
                        <div className="grid gap-2">
                            {open ? (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    loading={nudging}
                                    onClick={() => void nudge()}
                                >
                                    <BellRing aria-hidden /> Lembrar agora
                                </Button>
                            ) : null}
                            {contract.status === 'COMPLETED' ? (
                                <Button asChild size="sm">
                                    <a href={envelopesApi.fileUrl(contract.id, 'signed')} download>
                                        <Download aria-hidden /> Baixar PDF assinado
                                    </a>
                                </Button>
                            ) : null}
                            <div className="grid grid-cols-2 gap-2">
                                <Button asChild variant="ghost" size="sm">
                                    <Link to={`/contratos/${contract.id}`}>Ver contrato</Link>
                                </Button>
                                {open ? (
                                    <Button variant="ghost" size="sm" onClick={onOpenPhone}>
                                        <Smartphone aria-hidden /> Ver celular
                                    </Button>
                                ) : (
                                    <Button variant="ghost" size="sm" onClick={onSendContract}>
                                        <FileSignature aria-hidden /> Enviar outro
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <p className="text-sm leading-relaxed text-muted">
                            Nenhum contrato ainda. Ele sai nesta conversa e o cliente assina sem sair do
                            WhatsApp.
                        </p>
                        <Button size="sm" className="w-full" onClick={onSendContract}>
                            <FileSignature aria-hidden /> Enviar contrato
                        </Button>
                    </div>
                )}
            </Section>

            <Section title="Atendimento">
                <Row icon={MessageCircle} label="Canal" value="WhatsApp" />
                <Row icon={Tag} label="Assunto" value={contact.topic} />
                <Row icon={Hash} label="Etapa" value={contact.stage} />
                <Row icon={Bot} label="Atendente" value="Agente de IA" />
            </Section>

            <Section title="Contato">
                <Row icon={UserRound} label="Nome" value={contact.name} />
                <Row icon={Phone} label="Telefone" value={contact.phoneMasked} mono />
                <Row icon={Fingerprint} label="CPF" value={contact.cpfMasked} mono />
                <Row icon={MapPin} label="Cidade" value={contact.city} />
            </Section>

            <AssistantHint className="mt-5" file cta="Criar modelo">
                Tem outro contrato em PDF ou Word? O Assistente cria o modelo com os campos marcados.
            </AssistantHint>
        </div>
    )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    const [open, setOpen] = React.useState(true)
    return (
        <section className="border-t border-line py-4 first-of-type:border-t-0">
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                className="mb-3 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted hover:text-ink"
            >
                <ChevronDown
                    className={cn('size-3.5 transition-transform', !open && '-rotate-90')}
                    aria-hidden
                />{' '}
                {title}
            </button>
            {open ? <div className="space-y-2.5">{children}</div> : null}
        </section>
    )
}

function Row({
    icon: Icon,
    label,
    value,
    mono,
}: {
    icon: typeof Phone
    label: string
    value: string
    mono?: boolean
}) {
    return (
        <div className="grid grid-cols-[20px_96px_1fr] items-center gap-2 text-sm">
            <Icon className="size-4 text-subtle" aria-hidden />
            <span className="text-muted">{label}</span>
            <span className={cn('truncate', mono && 'font-mono text-[13px] tabular')} title={value}>
                {value}
            </span>
        </div>
    )
}
