import type { StreamEvent, WebhookDeliveryDto, WebhookEvent } from '@lidersign/shared'
import { Bot, ExternalLink, KeyRound, RefreshCw, Webhook } from 'lucide-react'
import * as React from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import {
    Badge,
    Button,
    CopyButton,
    Kicker,
    Skeleton,
    errorMessage,
    formatDateTime,
    useDocumentTitle,
    useResource,
} from '@lidersign/ui'

import { officeApi, useOffice } from '@/features/office'
import { ChannelSettings } from '@/features/settings'
import { useLiveEvents } from '@/features/realtime'

const SPEC_URL = 'https://github.com/kalebefukuda/LiderSign/blob/HEAD/docs/spec.md'

const EVENT_LABEL: Record<WebhookEvent, string> = {
    'envelope.sent': 'Enviado',
    'envelope.viewed': 'Aberto',
    'envelope.signed': 'Assinado',
    'envelope.completed': 'Concluído',
    'envelope.canceled': 'Cancelado',
    'envelope.expired': 'Expirado',
}

const ROUTES: { group: string; items: [string, string, string][] }[] = [
    {
        group: 'Parceiro',
        items: [
            ['POST', '/v1/partner/tenants', 'Ativa o escritório, com modelos de exemplo'],
            ['POST', '/v1/partner/tenants/:id/sessions', 'Link de uso único para abrir o painel'],
            ['DELETE', '/v1/partner/tenants/:id', 'Desativa o escritório'],
        ],
    },
    {
        group: 'Escritório',
        items: [
            ['GET', '/v1/templates', 'Modelos e os campos de cada um'],
            ['POST', '/v1/envelopes', 'Gera o PDF e o link de assinatura'],
            ['GET', '/v1/envelopes/:id', 'Status, trilha de auditoria e webhooks'],
            ['GET', '/v1/envelopes/:id/files/signed', 'PDF selado'],
            ['GET', '/v1/events', 'Tempo real (SSE)'],
        ],
    },
    {
        group: 'Público',
        items: [
            ['GET', '/v1/public/verify/:code', 'Verificação pelo código'],
            ['POST', '/v1/public/verify/file', 'Verificação pelo arquivo'],
        ],
    },
]

const MCP_TOOLS = [
    'Listar modelos',
    'Ver campos do modelo',
    'Criar documento para assinar',
    'Ver status do documento',
]

export default function DevelopersRoute() {
    useDocumentTitle('Desenvolvedores')
    const office = useOffice()

    return (
        <div className="space-y-12 animate-enter">
            <div>
                <h1 className="text-[28px] font-bold tracking-[-0.03em]">Desenvolvedores</h1>
                <p className="mt-1.5 max-w-[62ch] text-muted">
                    Como este escritório está conectado e cada aviso que o LíderSign mandou para os sistemas
                    dele.
                </p>
            </div>

            <section aria-labelledby="conexao" className="space-y-4">
                <Kicker id="conexao">Conexão</Kicker>
                <dl className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
                    <Item label="Conectado por" value={office.partner.name} />
                    <Item label="Desde" value={formatDateTime(office.tenant.createdAt)} />
                    <Item label="ID do escritório" value={office.tenant.externalId} mono copy />
                    <Item
                        label="Endereço dos webhooks"
                        value={office.tenant.webhookUrl ?? 'Nenhum configurado'}
                        mono={Boolean(office.tenant.webhookUrl)}
                    />
                </dl>
                <p className="flex max-w-2xl items-start gap-2 text-sm leading-relaxed text-muted">
                    <KeyRound className="mt-0.5 size-4 shrink-0" aria-hidden />A {office.partner.name} fala
                    com o LíderSign usando uma chave de parceiro guardada no servidor dela. A chave não
                    aparece aqui, e o escritório nunca precisa copiar token.
                </p>
            </section>

            <Deliveries />

            <ChannelSettings />

            <section aria-labelledby="api" className="space-y-4">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <Kicker id="api">API</Kicker>
                    <a
                        href={SPEC_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-brand hover:underline"
                    >
                        Especificação completa <ExternalLink className="size-3.5" aria-hidden />
                    </a>
                </div>
                <div className="overflow-hidden rounded-2xl border border-line">
                    {ROUTES.map((group) => (
                        <div key={group.group} className="border-b border-line last:border-0">
                            <p className="bg-surface/70 px-5 py-2 text-xs font-medium text-muted">
                                {group.group}
                            </p>
                            <ul className="divide-y divide-line">
                                {group.items.map(([method, path, text]) => (
                                    <li
                                        key={`${method} ${path}`}
                                        className="grid gap-1 px-5 py-3 sm:grid-cols-[64px_minmax(0,320px)_1fr] sm:items-center sm:gap-4"
                                    >
                                        <span className="font-mono text-xs font-semibold text-brand">
                                            {method}
                                        </span>
                                        <span className="truncate font-mono text-[13px]">{path}</span>
                                        <span className="text-sm text-muted">{text}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
                <p className="flex max-w-2xl items-start gap-2 text-sm leading-relaxed text-muted">
                    <Bot className="mt-0.5 size-4 shrink-0" aria-hidden />
                    Os agentes de IA usam as mesmas operações por MCP: {MCP_TOOLS.join(' · ')}.
                </p>
            </section>
        </div>
    )
}

function Item({
    label,
    value,
    mono,
    copy,
}: {
    label: string
    value: string
    mono?: boolean
    copy?: boolean
}) {
    return (
        <div className="bg-white px-5 py-4">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="mt-1 flex items-center gap-1">
                <span className={mono ? 'truncate font-mono text-[13px]' : 'truncate text-[15px]'}>
                    {value}
                </span>
                {copy ? (
                    <CopyButton value={value} label={`Copiar ${label.toLowerCase()}`} className="shrink-0" />
                ) : null}
            </dd>
        </div>
    )
}

function Deliveries() {
    const deliveries = useResource<WebhookDeliveryDto[]>(officeApi.webhooksUrl, { refreshMs: 15000 })
    const { reload } = deliveries
    const [retrying, setRetrying] = React.useState<string | null>(null)

    useLiveEvents((event: StreamEvent) => {
        if (event.type === 'webhook.delivered') void reload()
    })

    async function retry(id: string) {
        setRetrying(id)
        try {
            await officeApi.retryWebhook(id)
            toast.success('Reenvio na fila. O resultado aparece aqui em instantes.')
            window.setTimeout(() => void reload(), 1500)
        } catch (error) {
            toast.error(errorMessage(error))
        } finally {
            setRetrying(null)
        }
    }

    const items = deliveries.data ?? []

    return (
        <section aria-labelledby="entregas" className="space-y-4">
            <div className="flex items-baseline justify-between gap-3">
                <Kicker id="entregas">Webhooks enviados</Kicker>
                <span className="text-xs text-subtle">assinados com HMAC-SHA256</span>
            </div>
            {deliveries.loading && !deliveries.data ? (
                <Skeleton className="h-48 w-full rounded-2xl" />
            ) : !items.length ? (
                <div className="flex flex-col items-center rounded-2xl border border-line px-5 py-12 text-center">
                    <Webhook className="size-5 text-subtle" aria-hidden />
                    <p className="mt-3 font-medium">Nenhum aviso enviado ainda</p>
                    <p className="mt-1 max-w-sm text-sm text-muted">
                        Cada etapa de um documento (enviado, aberto, assinado, concluído) gera um aviso aqui.
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-2xl border border-line">
                    <table className="w-full min-w-[680px] text-left text-sm">
                        <thead className="border-b border-line bg-surface/70 text-xs text-muted">
                            <tr>
                                <th className="px-5 py-3 font-medium">Evento</th>
                                <th className="px-5 py-3 font-medium">Resposta</th>
                                <th className="px-5 py-3 font-medium">Tentativas</th>
                                <th className="px-5 py-3 font-medium">Quando</th>
                                <th className="px-5 py-3 text-right font-medium">
                                    <span className="sr-only">Ações</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item) => (
                                <tr key={item.id} className="border-b border-line last:border-0">
                                    <td className="px-5 py-3">
                                        <p className="font-medium">{EVENT_LABEL[item.event] ?? item.event}</p>
                                        {item.envelopeId ? (
                                            <Link
                                                to={`/painel/envelopes/${item.envelopeId}`}
                                                className="font-mono text-xs text-subtle hover:text-ink"
                                            >
                                                {item.event}
                                            </Link>
                                        ) : (
                                            <p className="font-mono text-xs text-subtle">{item.event}</p>
                                        )}
                                    </td>
                                    <td className="px-5 py-3">
                                        {item.ok ? (
                                            <Badge tone="success" dot>
                                                {item.statusCode ?? 200}
                                            </Badge>
                                        ) : (
                                            <span className="flex flex-col gap-0.5">
                                                <Badge tone="danger" dot>
                                                    {item.statusCode ?? 'Falhou'}
                                                </Badge>
                                                {item.error ? (
                                                    <span
                                                        className="max-w-[220px] truncate text-xs text-muted"
                                                        title={item.error}
                                                    >
                                                        {item.error}
                                                    </span>
                                                ) : null}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3 text-muted tabular">{item.attempts}</td>
                                    <td className="px-5 py-3 text-muted tabular">
                                        {formatDateTime(item.createdAt)}
                                    </td>
                                    <td className="px-5 py-3 text-right">
                                        {item.ok ? (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                aria-label="Reenviar este aviso"
                                                title="Reenviar este aviso"
                                                loading={retrying === item.id}
                                                onClick={() => void retry(item.id)}
                                            >
                                                <RefreshCw aria-hidden />
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                loading={retrying === item.id}
                                                onClick={() => void retry(item.id)}
                                            >
                                                <RefreshCw aria-hidden /> Reenviar
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    )
}
