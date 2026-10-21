import {
    ASSURANCE_LEVELS,
    ASSURANCE_LEVEL_LABEL,
    TEMPLATE_KINDS,
    TEMPLATE_KIND_LABEL,
    VARIABLE_TYPES,
    type AssuranceLevel,
    type TemplateImportResponse,
    type TemplateKind,
    type TemplateVariable,
} from '@lidersign/shared'
import { AlertTriangle, Sparkles, Wand2 } from 'lucide-react'
import { useNavigate } from 'react-router'
import * as React from 'react'
import { toast } from 'sonner'

import {
    Badge,
    Button,
    Card,
    Field,
    Input,
    Kicker,
    NativeSelect,
    Textarea,
    cn,
    errorMessage,
} from '@lidersign/ui'

import { templatesApi } from '../api'
import { syncVariables, VARIABLE_TYPE_LABEL } from '../utils'
import { TemplatePreview } from './template-preview'

export type TemplateDraft = {
    name: string
    kind: TemplateKind
    assuranceLevel: AssuranceLevel
    body: string
    variables: TemplateVariable[]
}

const ASSURANCE_HELP: Record<AssuranceLevel, string> = {
    PADRAO: 'O cliente confirma o CPF e assina. Para contratos de honorários.',
    REFORCADO:
        'Também pede um código no WhatsApp e uma selfie. Para procurações em ações de massa, em que juízes têm cobrado prova mais forte de quem assinou.',
}

export function TemplateEditor({
    initial,
    templateId,
    origin,
}: {
    initial: TemplateDraft
    templateId?: string
    origin?: Pick<TemplateImportResponse, 'engine' | 'warnings'>
}) {
    const navigate = useNavigate()
    const [draft, setDraft] = React.useState<TemplateDraft>(() => ({
        ...initial,
        variables: syncVariables(initial.body, initial.variables),
    }))
    const [saving, setSaving] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    const variables = React.useMemo(
        () => syncVariables(draft.body, draft.variables),
        [draft.body, draft.variables],
    )

    function update<K extends keyof TemplateDraft>(key: K, value: TemplateDraft[K]) {
        setDraft((current) => ({ ...current, [key]: value }))
    }

    function updateVariable(key: string, patch: Partial<TemplateVariable>) {
        setDraft((current) => ({
            ...current,
            variables: syncVariables(current.body, current.variables).map((variable) =>
                variable.key === key ? { ...variable, ...patch } : variable,
            ),
        }))
    }

    async function save() {
        setSaving(true)
        setError(null)
        try {
            const payload = { ...draft, variables }
            const saved = await templatesApi.save(payload, templateId)
            toast.success(templateId ? `Modelo salvo · versão ${saved.version}` : 'Modelo criado')
            navigate('/modelos')
        } catch (err) {
            setError(errorMessage(err))
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-8">
            {origin ? (
                <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface/70 p-4 sm:flex-row sm:items-start">
                    <Badge tone={origin.engine === 'ai' ? 'brand' : 'neutral'} className="self-start">
                        {origin.engine === 'ai' ? (
                            <Sparkles className="size-3.5" />
                        ) : (
                            <Wand2 className="size-3.5" />
                        )}
                        {origin.engine === 'ai' ? 'Sugerido pela IA' : 'Sugerido por regras locais'}
                    </Badge>
                    <div className="text-sm leading-relaxed text-muted">
                        <p>
                            Confira os campos marcados antes de salvar. Você pode renomear, mudar o tipo ou
                            editar o texto.
                        </p>
                        {origin.warnings.length ? (
                            <ul className="mt-2 space-y-1">
                                {origin.warnings.map((warning) => (
                                    <li key={warning} className="flex gap-2 text-amber-800">
                                        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                                        {warning}
                                    </li>
                                ))}
                            </ul>
                        ) : null}
                    </div>
                </div>
            ) : null}

            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
                <div className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
                        <Field label="Nome do modelo" htmlFor="tpl-name">
                            <Input
                                id="tpl-name"
                                value={draft.name}
                                onChange={(event) => update('name', event.target.value)}
                                placeholder="Contrato de honorários · BPC/LOAS"
                            />
                        </Field>
                        <Field label="Tipo" htmlFor="tpl-kind">
                            <NativeSelect
                                id="tpl-kind"
                                value={draft.kind}
                                onChange={(event) => update('kind', event.target.value as TemplateKind)}
                            >
                                {TEMPLATE_KINDS.map((kind) => (
                                    <option key={kind} value={kind}>
                                        {TEMPLATE_KIND_LABEL[kind]}
                                    </option>
                                ))}
                            </NativeSelect>
                        </Field>
                    </div>

                    <fieldset>
                        <legend className="text-sm font-medium">Como o cliente confirma quem é</legend>
                        <div className="mt-2 grid gap-3 sm:grid-cols-2">
                            {ASSURANCE_LEVELS.map((level) => (
                                <label
                                    key={level}
                                    className={cn(
                                        'flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors duration-150',
                                        draft.assuranceLevel === level
                                            ? 'border-brand bg-brand-soft/60'
                                            : 'border-line-strong hover:bg-surface',
                                    )}
                                >
                                    <input
                                        type="radio"
                                        name="assurance"
                                        value={level}
                                        checked={draft.assuranceLevel === level}
                                        onChange={() => update('assuranceLevel', level)}
                                        className="mt-1 size-4 accent-[#2463EB]"
                                    />
                                    <span>
                                        <span className="block text-sm font-semibold">
                                            {ASSURANCE_LEVEL_LABEL[level]}
                                        </span>
                                        <span className="mt-0.5 block text-[13px] leading-relaxed text-muted">
                                            {ASSURANCE_HELP[level]}
                                        </span>
                                    </span>
                                </label>
                            ))}
                        </div>
                    </fieldset>

                    <Field
                        label="Texto do modelo"
                        htmlFor="tpl-body"
                        hint="Use {{nome_do_campo}} para os dados do cliente. # título, ## seção, **negrito**, - item."
                    >
                        <Textarea
                            id="tpl-body"
                            value={draft.body}
                            onChange={(event) => update('body', event.target.value)}
                            rows={22}
                            spellCheck={false}
                            className="font-mono text-[13px] leading-6"
                        />
                    </Field>
                </div>

                <div className="lg:sticky lg:top-6 lg:self-start">
                    <Kicker>Pré-visualização</Kicker>
                    <Card className="mt-3 max-h-[640px] overflow-y-auto p-7 scrollbar-thin shadow-[0_1px_2px_rgba(11,18,32,0.04)]">
                        <TemplatePreview body={draft.body} variables={variables} />
                    </Card>
                </div>
            </div>

            <section aria-labelledby="campos">
                <div className="mb-3 flex items-baseline justify-between gap-4">
                    <h2 id="campos" className="text-lg font-semibold tracking-[-0.02em]">
                        Campos do modelo
                    </h2>
                    <p className="text-sm text-muted tabular">{variables.length} campos</p>
                </div>
                {variables.length ? (
                    <div className="overflow-x-auto rounded-2xl border border-line">
                        <table className="w-full min-w-[640px] text-left text-sm">
                            <thead className="border-b border-line bg-surface/70">
                                <tr className="text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle">
                                    <th className="px-4 py-3 font-semibold">Chave</th>
                                    <th className="px-4 py-3 font-semibold">Nome exibido</th>
                                    <th className="px-4 py-3 font-semibold">Tipo</th>
                                    <th className="px-4 py-3 font-semibold">Exemplo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {variables.map((variable) => (
                                    <tr key={variable.key} className="border-b border-line last:border-0">
                                        <td className="px-4 py-2.5 font-mono text-[13px] text-muted">
                                            {variable.key}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <Input
                                                aria-label={`Nome exibido de ${variable.key}`}
                                                value={variable.label}
                                                onChange={(event) =>
                                                    updateVariable(variable.key, {
                                                        label: event.target.value,
                                                    })
                                                }
                                                className="h-9"
                                            />
                                        </td>
                                        <td className="w-44 px-4 py-2.5">
                                            <NativeSelect
                                                aria-label={`Tipo de ${variable.key}`}
                                                value={variable.type}
                                                onChange={(event) =>
                                                    updateVariable(variable.key, {
                                                        type: event.target.value as TemplateVariable['type'],
                                                    })
                                                }
                                                className="h-9"
                                            >
                                                {VARIABLE_TYPES.map((type) => (
                                                    <option key={type} value={type}>
                                                        {VARIABLE_TYPE_LABEL[type]}
                                                    </option>
                                                ))}
                                            </NativeSelect>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <Input
                                                aria-label={`Exemplo de ${variable.key}`}
                                                value={variable.example ?? ''}
                                                onChange={(event) =>
                                                    updateVariable(variable.key, {
                                                        example: event.target.value || undefined,
                                                    })
                                                }
                                                placeholder="Opcional"
                                                className="h-9"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="rounded-2xl border border-dashed border-line-strong px-5 py-6 text-sm text-muted">
                        Nenhum campo ainda. Escreva {'{{nome_cliente}}'} no texto e ele aparece aqui.
                    </p>
                )}
            </section>

            <div className="flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-end">
                {error ? <p className="text-sm text-red-600 sm:mr-auto">{error}</p> : null}
                <Button variant="ghost" onClick={() => navigate('/modelos')}>
                    Cancelar
                </Button>
                <Button onClick={save} loading={saving}>
                    {templateId ? 'Salvar nova versão' : 'Salvar modelo'}
                </Button>
            </div>
        </div>
    )
}
