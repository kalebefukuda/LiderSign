import {
    ASSURANCE_LEVEL_LABEL,
    formatCpf,
    isValidBrPhone,
    isValidCpf,
    missingVariables,
    type TemplateDto,
} from '@lidersign/shared'
import { Send } from 'lucide-react'
import * as React from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'

import {
    Badge,
    Button,
    Field,
    Input,
    Kicker,
    NativeSelect,
    Skeleton,
    EmptyState,
    ErrorNotice,
    errorMessage,
    useResource,
} from '@lidersign/ui'

import { templatesApi } from '@/features/templates'
import { DEMO_HOST_BASE } from '@/lib/endpoints'

import { envelopesApi } from '../api'
import { rememberLink } from '../link-store'
import { SAMPLE_SIGNER, sampleValues } from '../sample-data'

const FROM_SIGNER: Record<string, 'name' | 'cpf'> = { nome_cliente: 'name', cpf_cliente: 'cpf' }

function pickDefault(templates: TemplateDto[]) {
    return templates.find((template) => /bpc|honor/i.test(template.name)) ?? templates[0]
}

export function SendForm() {
    const navigate = useNavigate()
    const { data: templates, error, loading, reload } = useResource<TemplateDto[]>(templatesApi.listUrl)
    const host = useResource<{ whatsappProvider: 'simulator' | 'cloud_api' }>(`${DEMO_HOST_BASE}/status`)
    const [templateId, setTemplateId] = React.useState('')
    const [values, setValues] = React.useState<Record<string, string>>({})
    const [signer, setSigner] = React.useState({
        name: SAMPLE_SIGNER.name,
        cpf: SAMPLE_SIGNER.cpf,
        phone: '',
    })
    const [sending, setSending] = React.useState(false)
    const [formError, setFormError] = React.useState<string | null>(null)

    const template = templates?.find((item) => item.id === templateId)
    const contractFields = template?.variables.filter((variable) => !(variable.key in FROM_SIGNER)) ?? []
    const viaWhatsApp = host.data?.whatsappProvider === 'cloud_api'

    React.useEffect(() => {
        if (!templates?.length || templateId) return
        const chosen = pickDefault(templates)
        if (chosen) setTemplateId(chosen.id)
    }, [templates, templateId])

    React.useEffect(() => {
        if (!template) return
        const sample = sampleValues()
        setValues(
            Object.fromEntries(
                template.variables.map((variable) => [
                    variable.key,
                    sample[variable.key] ?? variable.example ?? '',
                ]),
            ),
        )
    }, [template])

    if (loading && !templates) {
        return (
            <div className="space-y-4">
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
                description="Importe um contrato de exemplo e ele vira um modelo com campos para preencher."
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
        const filled = { ...values }
        for (const [key, field] of Object.entries(FROM_SIGNER)) {
            if (template.variables.some((variable) => variable.key === key)) {
                filled[key] = field === 'cpf' ? formatCpf(signer.cpf) : signer.name.trim()
            }
        }
        const missing = missingVariables(template.body, filled)
        if (missing.length) {
            setFormError(
                `Preencha: ${missing.map((key) => template.variables.find((v) => v.key === key)?.label ?? key).join(', ')}`,
            )
            return
        }
        if (!signer.phone.trim()) {
            setFormError('Informe o celular (WhatsApp) de quem assina.')
            return
        }
        if (cpfInvalid || phoneInvalid) {
            setFormError('Confira o CPF e o celular de quem assina.')
            return
        }
        setSending(true)
        try {
            const envelope = await envelopesApi.create({
                templateId: template.id,
                variables: filled,
                signer,
                externalRef: SAMPLE_SIGNER.externalRef,
                send: true,
            })
            rememberLink(envelope.id, envelope.signingUrl, signer.phone)
            toast.success(
                viaWhatsApp ? 'Enviado pelo WhatsApp' : 'Documento pronto. Agora é só mandar o link.',
            )
            navigate(`/painel/envelopes/${envelope.id}`)
        } catch (err) {
            setFormError(errorMessage(err))
        } finally {
            setSending(false)
        }
    }

    return (
        <form onSubmit={send} className="@container space-y-10">
            <section className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <Kicker>1 · Documento</Kicker>
                    {template ? (
                        <Badge tone={template.assuranceLevel === 'REFORCADO' ? 'brand' : 'neutral'}>
                            Nível {ASSURANCE_LEVEL_LABEL[template.assuranceLevel]}
                        </Badge>
                    ) : null}
                </div>
                <Field label="Modelo" htmlFor="send-template">
                    <NativeSelect
                        id="send-template"
                        value={templateId}
                        onChange={(event) => setTemplateId(event.target.value)}
                    >
                        {templates.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.name}
                            </option>
                        ))}
                    </NativeSelect>
                </Field>
                {template?.assuranceLevel === 'REFORCADO' ? (
                    <p className="text-[13px] text-muted">
                        Este modelo pede uma selfie de quem assina, além do código.
                    </p>
                ) : null}
            </section>

            <section className="space-y-4">
                <Kicker>2 · Quem assina</Kicker>
                <div className="grid gap-4 @md:grid-cols-2">
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
                            onBlur={() =>
                                setSigner((current) => ({ ...current, cpf: formatCpf(current.cpf) }))
                            }
                            className="tabular"
                        />
                    </Field>
                    <Field
                        label="Celular (WhatsApp)"
                        htmlFor="signer-phone"
                        error={phoneInvalid ? 'Informe DDD + número' : undefined}
                        hint="É para este WhatsApp que o link de assinatura vai."
                    >
                        <Input
                            id="signer-phone"
                            value={signer.phone}
                            aria-invalid={phoneInvalid}
                            inputMode="tel"
                            placeholder="(47) 99999-0000"
                            autoComplete="tel"
                            onChange={(event) => setSigner({ ...signer, phone: event.target.value })}
                            className="tabular"
                        />
                    </Field>
                </div>
            </section>

            {template ? (
                <section className="space-y-4">
                    <div className="flex items-baseline justify-between gap-4">
                        <Kicker>3 · Campos do contrato</Kicker>
                        <span className="text-xs text-subtle tabular">{contractFields.length} campos</span>
                    </div>
                    <div className="grid gap-4 @md:grid-cols-2">
                        {contractFields.map((variable) => (
                            <Field
                                key={variable.key}
                                label={variable.label}
                                htmlFor={`var-${variable.key}`}
                                className={
                                    variable.type === 'address' || variable.key === 'finalidade'
                                        ? '@md:col-span-2'
                                        : undefined
                                }
                            >
                                <Input
                                    id={`var-${variable.key}`}
                                    value={values[variable.key] ?? ''}
                                    onChange={(event) =>
                                        setValues({ ...values, [variable.key]: event.target.value })
                                    }
                                />
                            </Field>
                        ))}
                    </div>
                </section>
            ) : null}

            <div className="space-y-3 border-t border-line pt-6">
                {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
                <Button type="submit" size="lg" loading={sending}>
                    <Send aria-hidden /> Enviar para assinatura
                </Button>
            </div>
        </form>
    )
}
