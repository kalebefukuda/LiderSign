import { isReadableBrandColor, REMINDER_HOURS } from '@lidersign/shared'
import { ImagePlus, Trash2 } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'

import { Button, Field, Input, Kicker, NativeSelect, Switch, cn, errorMessage } from '@lidersign/ui'

import { officeApi, useOffice, useOfficeReload } from '@/features/office'

const DEFAULT_COLOR = '#2463eb'
const VALIDITY_OPTIONS = [3, 7, 15, 30]
const ACCEPTED = 'image/png,image/jpeg'

export function PreferencesForm() {
    const office = useOffice()
    const reload = useOfficeReload()
    const settings = office.settings
    const [color, setColor] = React.useState(settings.brandColor ?? DEFAULT_COLOR)
    const [validity, setValidity] = React.useState(settings.linkValidityDays)
    const [reminder, setReminder] = React.useState(settings.reminderEnabled)
    const [hours, setHours] = React.useState(settings.reminderAfterHours)
    const [saving, setSaving] = React.useState(false)

    const validHex = /^#[0-9a-fA-F]{6}$/.test(color)
    const readable = validHex && isReadableBrandColor(color)
    const savedColor = settings.brandColor ?? DEFAULT_COLOR
    const dirty =
        color.toLowerCase() !== savedColor ||
        validity !== settings.linkValidityDays ||
        reminder !== settings.reminderEnabled ||
        hours !== settings.reminderAfterHours

    async function save(event: React.FormEvent) {
        event.preventDefault()
        if (!readable) return
        setSaving(true)
        try {
            await officeApi.updateSettings({
                brandColor: color.toLowerCase() === DEFAULT_COLOR ? null : color,
                linkValidityDays: validity,
                reminderEnabled: reminder,
                reminderAfterHours: hours,
            })
            await reload()
            toast.success('Configurações salvas. Valem para os próximos envios.')
        } catch (error) {
            toast.error(errorMessage(error))
        } finally {
            setSaving(false)
        }
    }

    return (
        <form onSubmit={save} className="space-y-12">
            <section aria-labelledby="marca" className="space-y-4">
                <Kicker id="marca">Marca no link de assinatura</Kicker>
                <div className="grid gap-8 rounded-2xl border border-line p-5 sm:p-6 lg:grid-cols-[1fr_300px]">
                    <div className="space-y-6">
                        <p className="max-w-xl text-[15px] leading-relaxed text-ink/80">
                            O cliente vê o logo e a cor do escritório quando abre o link. Ajuda a confiar no
                            que recebeu pelo WhatsApp.
                        </p>
                        <LogoField />
                        <Field
                            label="Cor dos botões"
                            htmlFor="brand-color"
                            error={
                                validHex && !readable
                                    ? 'Cor clara demais: o texto branco do botão fica ilegível. Escolha um tom mais escuro.'
                                    : !validHex
                                      ? 'Use o formato #RRGGBB.'
                                      : undefined
                            }
                            hint="Escolha um tom escuro o bastante para o texto branco."
                        >
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    aria-label="Escolher cor"
                                    value={validHex ? color : DEFAULT_COLOR}
                                    onChange={(event) => setColor(event.target.value)}
                                    className="size-10 shrink-0 cursor-pointer rounded-lg border border-line bg-white p-1"
                                />
                                <Input
                                    id="brand-color"
                                    value={color}
                                    onChange={(event) => setColor(event.target.value.trim())}
                                    maxLength={7}
                                    spellCheck={false}
                                    className="w-32 font-mono tabular"
                                />
                                {color.toLowerCase() !== DEFAULT_COLOR ? (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setColor(DEFAULT_COLOR)}
                                    >
                                        Usar a padrão
                                    </Button>
                                ) : null}
                            </div>
                        </Field>
                    </div>
                    <Preview color={readable ? color : DEFAULT_COLOR} officeName={office.tenant.name} />
                </div>
            </section>

            <section aria-labelledby="prazo" className="space-y-4">
                <Kicker id="prazo">Prazo e lembrete</Kicker>
                <div className="space-y-6 rounded-2xl border border-line p-5 sm:p-6">
                    <Field
                        label="Validade do link"
                        htmlFor="validity"
                        hint="Depois disso o link expira e o documento precisa de um novo envio."
                        className="max-w-xs"
                    >
                        <NativeSelect
                            id="validity"
                            value={validity}
                            onChange={(event) => setValidity(Number(event.target.value))}
                        >
                            {VALIDITY_OPTIONS.map((days) => (
                                <option key={days} value={days}>
                                    {days} dias
                                </option>
                            ))}
                        </NativeSelect>
                    </Field>

                    <div className="flex items-start gap-3 border-t border-line pt-6">
                        <Switch
                            id="reminder"
                            checked={reminder}
                            onCheckedChange={setReminder}
                            aria-describedby="reminder-help"
                            className="mt-0.5"
                        />
                        <div className="space-y-3">
                            <label htmlFor="reminder" className="block font-medium">
                                Lembrete automático pelo WhatsApp
                            </label>
                            <p id="reminder-help" className="max-w-xl text-sm leading-relaxed text-muted">
                                Se o cliente não assinar, o LíderSign manda um lembrete uma vez, com um link
                                novo. O anterior deixa de valer.
                            </p>
                            <div className={cn('flex items-center gap-2 text-sm', !reminder && 'opacity-50')}>
                                <span>Enviar depois de</span>
                                <NativeSelect
                                    aria-label="Horas sem assinatura"
                                    value={hours}
                                    disabled={!reminder}
                                    onChange={(event) => setHours(Number(event.target.value))}
                                    className="w-28"
                                >
                                    {REMINDER_HOURS.map((value) => (
                                        <option key={value} value={value}>
                                            {value} horas
                                        </option>
                                    ))}
                                </NativeSelect>
                                <span>sem assinatura</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <div className="-mt-6 flex items-center justify-end gap-3">
                {dirty ? <span className="text-sm text-muted">Alterações não salvas</span> : null}
                <Button type="submit" loading={saving} disabled={!dirty || !readable}>
                    Salvar alterações
                </Button>
            </div>
        </form>
    )
}

function LogoField() {
    const office = useOffice()
    const reload = useOfficeReload()
    const input = React.useRef<HTMLInputElement>(null)
    const [busy, setBusy] = React.useState(false)
    const [version, setVersion] = React.useState(0)
    const hasLogo = office.settings.hasLogo

    async function upload(file: File | undefined) {
        if (!file) return
        if (file.size > 300 * 1024) {
            toast.error('Use uma imagem de até 300 KB.')
            return
        }
        setBusy(true)
        try {
            await officeApi.uploadLogo(file)
            await reload()
            setVersion((value) => value + 1)
            toast.success('Logo atualizado')
        } catch (error) {
            toast.error(errorMessage(error))
        } finally {
            setBusy(false)
            if (input.current) input.current.value = ''
        }
    }

    async function remove() {
        setBusy(true)
        try {
            await officeApi.removeLogo()
            await reload()
            toast('Logo removido')
        } catch (error) {
            toast.error(errorMessage(error))
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Logo do escritório</span>
            <div className="flex items-center gap-4">
                <span className="flex h-14 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-surface">
                    {hasLogo ? (
                        <img
                            src={`${officeApi.logoUrl}?v=${version}`}
                            alt="Logo atual do escritório"
                            className="max-h-10 max-w-24 object-contain"
                        />
                    ) : (
                        <ImagePlus className="size-5 text-subtle" aria-hidden />
                    )}
                </span>
                <div className="flex flex-wrap gap-2">
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        loading={busy}
                        onClick={() => input.current?.click()}
                    >
                        {hasLogo ? 'Trocar' : 'Enviar logo'}
                    </Button>
                    {hasLogo ? (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={busy}
                            onClick={() => void remove()}
                        >
                            <Trash2 aria-hidden /> Remover
                        </Button>
                    ) : null}
                </div>
                <input
                    ref={input}
                    type="file"
                    accept={ACCEPTED}
                    className="sr-only"
                    tabIndex={-1}
                    aria-label="Arquivo do logo"
                    onChange={(event) => void upload(event.target.files?.[0])}
                />
            </div>
            <p className="text-[13px] text-muted">PNG ou JPG, até 300 KB. Fundo transparente fica melhor.</p>
        </div>
    )
}

function Preview({ color, officeName }: { color: string; officeName: string }) {
    const office = useOffice()
    return (
        <div aria-hidden className="mx-auto w-full max-w-[300px]">
            <p className="mb-2 text-xs text-subtle">Como o cliente vê</p>
            <div className="overflow-hidden rounded-[22px] border border-line bg-white">
                <div className="flex items-center gap-2 border-b border-line px-4 py-3">
                    {office.settings.hasLogo ? (
                        <img src={officeApi.logoUrl} alt="" className="h-6 max-w-20 object-contain" />
                    ) : null}
                    <span className="truncate text-sm font-semibold">{officeName}</span>
                </div>
                <div className="space-y-2 px-4 py-5">
                    <p className="text-[15px] font-semibold tracking-[-0.01em]">Contrato de honorários</p>
                    <div className="h-2 w-full rounded bg-surface" />
                    <div className="h-2 w-5/6 rounded bg-surface" />
                    <div className="h-2 w-4/6 rounded bg-surface" />
                </div>
                <div className="border-t border-line px-4 py-3">
                    <div
                        className="flex h-10 items-center justify-center rounded-xl text-sm font-semibold text-white"
                        style={{ backgroundColor: color }}
                    >
                        Assinar
                    </div>
                </div>
            </div>
        </div>
    )
}
