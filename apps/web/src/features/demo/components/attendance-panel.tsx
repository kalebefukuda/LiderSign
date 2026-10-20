import {
    ASSURANCE_LEVEL_LABEL,
    formatCpf,
    isValidBrPhone,
    isValidCpf,
    missingVariables,
    type EnvelopeDto,
    type TemplateDto,
} from '@lidersign/shared'
import { CheckCircle2, PlugZap, Send } from 'lucide-react'
import * as React from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, Input, Kicker, NativeSelect, Skeleton } from '@/components/ui/primitives'
import { EmptyState, ErrorNotice } from '@/components/ui/states'
import { envelopesApi } from '@/features/envelopes'
import { templatesApi } from '@/features/templates'
import { cn } from '@/lib/cn'
import { firstName, formatTime } from '@/lib/format'
import { errorMessage } from '@/lib/http'
import { useResource } from '@/lib/use-resource'

import type { DemoStatus } from '../api'
import { DEMO_CHAT, DEMO_LEAD, leadValues, type ChatLine } from '../lead'

function pickDefault(templates: TemplateDto[]) {
    return templates.find((template) => /bpc|honor/i.test(template.name)) ?? templates[0]
}

export function AttendancePanel({
    status,
    onGoToIntegrations,
    onSent,
}: {
    status: DemoStatus | undefined
    onGoToIntegrations: () => void
    onSent: (envelope: EnvelopeDto) => void
}) {
    const active = Boolean(status?.active)
    const [sentLines, setSentLines] = React.useState<ChatLine[]>([])

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold tracking-[-0.03em]">Atendimento</h2>
                <p className="mt-1 text-[15px] text-muted">
                    O agente fez a triagem e a lead aceitou a proposta. Falta o contrato.
                </p>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
                <ConversationMock extra={sentLines} />

                <div className="min-w-0">
                    {active ? (
                        <ContractForm
                            whatsappProvider={status?.whatsappProvider ?? 'simulator'}
                            onSent={(envelope) => {
                                setSentLines((lines) => [
                                    ...lines,
                                    {
                                        from: 'system',
                                        text: `Contrato "${envelope.title}" enviado pelo LíderSign`,
                                        time: formatTime(new Date()),
                                    },
                                    {
                                        from: 'agent',
                                        text: `Prontinho, ${firstName(DEMO_LEAD.name)}! Enviei o contrato. É só tocar no link e seguir os passos.`,
                                        time: formatTime(new Date()),
                                    },
                                ])
                                onSent(envelope)
                            }}
                        />
                    ) : (
                        <EmptyState
                            icon={<PlugZap />}
                            title="Ative o LíderSign para enviar contratos"
                            description="Um clique em Integrações. Os modelos de honorários e de procuração já vêm prontos."
                            action={<Button onClick={onGoToIntegrations}>Ir para Integrações</Button>}
                            className="h-full min-h-[420px]"
                        />
                    )}
                </div>
            </div>
        </div>
    )
}

function ConversationMock({ extra }: { extra: ChatLine[] }) {
    const lines = [...DEMO_CHAT, ...extra]
    return (
        <div className="flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-line">
            <div className="flex items-center gap-3 border-b border-line px-4 py-3">
                <span
                    aria-hidden
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-sm font-semibold text-muted"
                >
                    MA
                </span>
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{DEMO_LEAD.name}</p>
                    <p className="truncate text-xs text-muted">{DEMO_LEAD.caseLabel}</p>
                </div>
            </div>
            <div className="flex flex-wrap gap-1.5 border-b border-line px-4 py-2.5">
                <Badge tone="success">Triagem concluída</Badge>
                <Badge tone="success">Proposta aceita</Badge>
                <Badge tone={extra.length ? 'success' : 'warning'}>{extra.length ? 'Contrato enviado' : 'Aguardando contrato'}</Badge>
            </div>
            <ol className="flex-1 space-y-2.5 bg-surface/60 px-3 py-4" aria-label="Conversa com a lead">
                {lines.map((line, index) =>
                    line.from === 'system' ? (
                        <li key={index} className="flex justify-center py-1 animate-enter">
                            <span className="rounded-full border border-brand/15 bg-brand-soft px-3 py-1 text-center text-xs font-medium text-brand">
                                {line.text}
                            </span>
                        </li>
                    ) : (
                        <li
                            key={index}
                            className={cn('flex animate-enter', line.from === 'agent' ? 'justify-end' : 'justify-start')}
                        >
                            <div
                                className={cn(
                                    'max-w-[86%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed',
                                    line.from === 'agent'
                                        ? 'rounded-br-md bg-brand text-white'
                                        : 'rounded-bl-md border border-line bg-white text-ink',
                                )}
                            >
                                {line.from === 'agent' ? (
                                    <p className="mb-0.5 text-[11px] font-semibold text-white/70">Agente de IA</p>
                                ) : null}
                                {line.text}
                                <span
                                    className={cn(
                                        'ml-2 inline-block text-[10px] tabular',
                                        line.from === 'agent' ? 'text-white/60' : 'text-subtle',
                                    )}
                                >
                                    {line.time}
                                </span>
                            </div>
                        </li>
                    ),
                )}
            </ol>
        </div>
    )
}

function ContractForm({
    whatsappProvider,
    onSent,
}: {
    whatsappProvider: DemoStatus['whatsappProvider']
    onSent: (envelope: EnvelopeDto) => void
}) {
    const { data: templates, error, loading, reload } = useResource<TemplateDto[]>(templatesApi.listUrl)
    const [templateId, setTemplateId] = React.useState<string>('')
    const [values, setValues] = React.useState<Record<string, string>>({})
    const [signer, setSigner] = React.useState({ name: DEMO_LEAD.name, cpf: DEMO_LEAD.cpf, phone: DEMO_LEAD.phone })
    const [sending, setSending] = React.useState(false)
    const [formError, setFormError] = React.useState<string | null>(null)
    const [lastSent, setLastSent] = React.useState<EnvelopeDto | null>(null)

    const template = templates?.find((item) => item.id === templateId)

    React.useEffect(() => {
        if (!templates?.length || templateId) return
        const chosen = pickDefault(templates)
        if (chosen) setTemplateId(chosen.id)
    }, [templates, templateId])

    React.useEffect(() => {
        if (!template) return
        const lead = leadValues()
        setValues(
            Object.fromEntries(template.variables.map((variable) => [variable.key, lead[variable.key] ?? variable.example ?? ''])),
        )
    }, [template])

    if (loading && !templates) {
        return (
            <div className="space-y-4 rounded-2xl border border-line p-5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-11 w-full" />
                <div className="grid gap-3 sm:grid-cols-2">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <Skeleton key={index} className="h-11 w-full" />
                    ))}
                </div>
            </div>
        )
    }

    if (error && !templates) {
        return (
            <ErrorNotice
                message={error.message}
                action={
                    <Button variant="secondary" size="sm" onClick={() => void reload()}>
                        Tentar de novo
                    </Button>
                }
            />
        )
    }

    if (!templates?.length) {
        return (
            <EmptyState
                title="Nenhum modelo neste escritório"
                description="Importe um contrato no painel e ele aparece aqui para o agente usar."
                action={
                    <Button asChild variant="secondary">
                        <Link to="/painel/modelos/novo">Importar contrato</Link>
                    </Button>
                }
            />
        )
    }

    const cpfInvalid = signer.cpf.length > 0 && !isValidCpf(signer.cpf)
    const phoneInvalid = signer.phone.length > 0 && !isValidBrPhone(signer.phone)

    async function send(event: React.FormEvent) {
        event.preventDefault()
        if (!template) return
        setFormError(null)
        const missing = missingVariables(template.body, values)
        if (missing.length) {
            setFormError(`Preencha: ${missing.map((key) => template.variables.find((v) => v.key === key)?.label ?? key).join(', ')}`)
            return
        }
        if (cpfInvalid || phoneInvalid) {
            setFormError('Confira o CPF e o celular do cliente.')
            return
        }
        setSending(true)
        try {
            const envelope = await envelopesApi.create({
                templateId: template.id,
                variables: values,
                signer,
                externalRef: DEMO_LEAD.externalRef,
                send: true,
            })
            setLastSent(envelope)
            toast.success('Contrato enviado pelo WhatsApp')
            onSent(envelope)
        } catch (err) {
            setFormError(errorMessage(err))
        } finally {
            setSending(false)
        }
    }

    return (
        <form onSubmit={send} className="@container space-y-6 rounded-2xl border border-line p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <Kicker>Gerar contrato</Kicker>
                    <p className="mt-1.5 text-sm text-muted">Campos preenchidos pelo agente a partir da conversa.</p>
                </div>
                {template ? (
                    <Badge tone={template.assuranceLevel === 'REFORCADO' ? 'brand' : 'neutral'}>
                        Nível {ASSURANCE_LEVEL_LABEL[template.assuranceLevel]}
                    </Badge>
                ) : null}
            </div>

            <Field label="Modelo" htmlFor="demo-template">
                <NativeSelect
                    id="demo-template"
                    value={templateId}
                    onChange={(event) => {
                        setTemplateId(event.target.value)
                        setLastSent(null)
                    }}
                >
                    {templates.map((item) => (
                        <option key={item.id} value={item.id}>
                            {item.name}
                        </option>
                    ))}
                </NativeSelect>
            </Field>

            <fieldset className="space-y-3">
                <legend className="text-sm font-medium">Quem assina</legend>
                <div className="grid gap-3 @md:grid-cols-2">
                    <Field label="Nome completo" htmlFor="signer-name" className="@md:col-span-2">
                        <Input
                            id="signer-name"
                            value={signer.name}
                            onChange={(event) => setSigner({ ...signer, name: event.target.value })}
                            autoComplete="off"
                        />
                    </Field>
                    <Field label="CPF" htmlFor="signer-cpf" error={cpfInvalid ? 'CPF inválido' : undefined}>
                        <Input
                            id="signer-cpf"
                            value={signer.cpf}
                            aria-invalid={cpfInvalid}
                            inputMode="numeric"
                            onChange={(event) => setSigner({ ...signer, cpf: event.target.value })}
                            onBlur={() => setSigner((current) => ({ ...current, cpf: formatCpf(current.cpf) }))}
                            className="tabular"
                        />
                    </Field>
                    <Field
                        label="Celular (WhatsApp)"
                        htmlFor="signer-phone"
                        error={phoneInvalid ? 'Informe DDD + número' : undefined}
                        hint={
                            whatsappProvider === 'cloud_api'
                                ? 'Use um número cadastrado no app da Meta.'
                                : 'Na demo, a mensagem chega no celular ao lado.'
                        }
                    >
                        <Input
                            id="signer-phone"
                            value={signer.phone}
                            aria-invalid={phoneInvalid}
                            inputMode="tel"
                            onChange={(event) => setSigner({ ...signer, phone: event.target.value })}
                            className="tabular"
                        />
                    </Field>
                </div>
            </fieldset>

            {template ? (
                <fieldset className="space-y-3">
                    <legend className="flex w-full items-baseline justify-between text-sm font-medium">
                        Campos do contrato
                        <span className="text-xs font-normal text-subtle tabular">{template.variables.length} campos</span>
                    </legend>
                    <div className="grid max-h-[340px] gap-3 overflow-y-auto pr-1 scrollbar-thin @md:grid-cols-2">
                        {template.variables.map((variable) => (
                            <Field
                                key={variable.key}
                                label={variable.label}
                                htmlFor={`var-${variable.key}`}
                                className={variable.type === 'address' || variable.key === 'finalidade' ? '@md:col-span-2' : undefined}
                            >
                                <Input
                                    id={`var-${variable.key}`}
                                    value={values[variable.key] ?? ''}
                                    onChange={(event) => setValues({ ...values, [variable.key]: event.target.value })}
                                />
                            </Field>
                        ))}
                    </div>
                </fieldset>
            ) : null}

            {formError ? <p className="text-sm text-red-600">{formError}</p> : null}

            {lastSent ? (
                <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm animate-enter">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
                    <div className="space-y-0.5">
                        <p className="font-medium text-emerald-900">Enviado para {firstName(lastSent.signer.name)}</p>
                        <p className="text-emerald-900/80">Toque no link no celular ao lado para assinar como o cliente.</p>
                    </div>
                </div>
            ) : null}

            <Button type="submit" size="lg" className="w-full" loading={sending}>
                <Send aria-hidden /> Enviar para assinatura
            </Button>
        </form>
    )
}
