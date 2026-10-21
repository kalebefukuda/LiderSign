import {
    ASSURANCE_LEVEL_LABEL,
    type ContactDto,
    type SigningChannel,
    type TemplateDto,
} from '@lidersign/shared'
import { FileSignature, Link2, MessageCircle } from 'lucide-react'
import * as React from 'react'
import { Link } from 'react-router'

import {
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
    Input,
    NativeSelect,
    cn,
    errorMessage,
    useResource,
} from '@lidersign/ui'

import { useOffice } from '@/features/office'
import { templatesApi } from '@/features/templates'

import { inboxApi } from '../api'

const CHANNELS: { value: SigningChannel; title: string; text: string; icon: typeof MessageCircle }[] = [
    {
        value: 'WHATSAPP',
        title: 'Na própria conversa',
        text: 'O cliente digita o CPF, recebe o PDF e um resumo em áudio e toca em Assinar. Sem abrir link.',
        icon: MessageCircle,
    },
    {
        value: 'LINK',
        title: 'Por link',
        text: 'O cliente abre uma página no navegador para ler e assinar.',
        icon: Link2,
    },
]

export function SendContractDialog({
    contact,
    open,
    onOpenChange,
    onSent,
}: {
    contact: ContactDto
    open: boolean
    onOpenChange: (open: boolean) => void
    onSent: () => void
}) {
    const office = useOffice()
    const templates = useResource<TemplateDto[]>(open ? templatesApi.listUrl : null)
    const [templateId, setTemplateId] = React.useState('')
    const [channel, setChannel] = React.useState<SigningChannel>('WHATSAPP')
    const [phone, setPhone] = React.useState('')
    const [sending, setSending] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)
    const first = contact.name.split(' ')[0]
    const template = templates.data?.find((item) => item.id === templateId)

    React.useEffect(() => {
        if (!open) return
        setError(null)
        if (templateId && templates.data?.some((item) => item.id === templateId)) return
        const preferred = templates.data?.find((item) => item.kind === 'CONTRATO') ?? templates.data?.[0]
        if (preferred) setTemplateId(preferred.id)
    }, [open, templates.data, templateId])

    async function send(event: React.FormEvent) {
        event.preventDefault()
        if (!templateId) return
        setSending(true)
        setError(null)
        try {
            await inboxApi.sendContract(contact.id, {
                templateId,
                channel,
                ...(phone.trim() ? { phone: phone.trim() } : {}),
            })
            onOpenChange(false)
            onSent()
        } catch (err) {
            setError(errorMessage(err))
        } finally {
            setSending(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[540px] p-0">
                <form onSubmit={send}>
                    <div className="px-6 pb-6 pt-6">
                        <DialogTitle className="pr-8 text-xl">Enviar contrato para {first}</DialogTitle>
                        <DialogDescription className="mt-1.5 pr-6">
                            Os campos vêm da ficha do contato: nome, CPF, endereço e o que o agente já
                            levantou na conversa.
                        </DialogDescription>

                        <div className="mt-6 space-y-5">
                            <div className="space-y-1.5">
                                <label htmlFor="modelo-contrato" className="text-sm font-medium">
                                    Modelo
                                </label>
                                <NativeSelect
                                    id="modelo-contrato"
                                    value={templateId}
                                    disabled={!templates.data?.length}
                                    onChange={(event) => setTemplateId(event.target.value)}
                                >
                                    {templates.loading && !templates.data ? (
                                        <option>Carregando…</option>
                                    ) : null}
                                    {(templates.data ?? []).map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.name}
                                        </option>
                                    ))}
                                </NativeSelect>
                                {template ? (
                                    <p className="text-[13px] text-muted">
                                        Nível {ASSURANCE_LEVEL_LABEL[template.assuranceLevel].toLowerCase()}
                                        {template.assuranceLevel === 'REFORCADO'
                                            ? ': além do CPF, o cliente manda uma selfie pela câmera do WhatsApp.'
                                            : ': o cliente confirma o CPF e assina.'}
                                    </p>
                                ) : null}
                                {templates.data && !templates.data.length ? (
                                    <p className="text-[13px] text-muted">
                                        Nenhum modelo ainda.{' '}
                                        <Link to="/modelos/novo" className="text-brand hover:underline">
                                            Importar um contrato
                                        </Link>
                                    </p>
                                ) : null}
                            </div>

                            <fieldset className="space-y-2">
                                <legend className="mb-1.5 text-sm font-medium">Como o cliente assina</legend>
                                {CHANNELS.map((item) => (
                                    <label
                                        key={item.value}
                                        className={cn(
                                            'flex cursor-pointer gap-3 rounded-xl border px-4 py-3 transition-colors',
                                            channel === item.value
                                                ? 'border-brand/50 bg-brand-soft/50'
                                                : 'border-line hover:bg-surface/60',
                                        )}
                                    >
                                        <input
                                            type="radio"
                                            name="canal"
                                            value={item.value}
                                            checked={channel === item.value}
                                            onChange={() => setChannel(item.value)}
                                            className="mt-1 accent-[#2463eb]"
                                        />
                                        <span>
                                            <span className="flex items-center gap-1.5 text-[15px] font-medium">
                                                <item.icon className="size-4 text-brand" aria-hidden />{' '}
                                                {item.title}
                                                {item.value === 'WHATSAPP' ? (
                                                    <span className="rounded-md bg-white px-1.5 py-0.5 text-[11px] font-semibold text-brand ring-1 ring-brand/20">
                                                        Recomendado
                                                    </span>
                                                ) : null}
                                            </span>
                                            <span className="mt-0.5 block text-[13px] leading-relaxed text-muted">
                                                {item.text}
                                            </span>
                                        </span>
                                    </label>
                                ))}
                            </fieldset>

                            {office.whatsappConfigured ? (
                                <div className="space-y-1.5">
                                    <label htmlFor="outro-numero" className="text-sm font-medium">
                                        Outro número de WhatsApp{' '}
                                        <span className="font-normal text-muted">(opcional)</span>
                                    </label>
                                    <Input
                                        id="outro-numero"
                                        value={phone}
                                        onChange={(event) => setPhone(event.target.value)}
                                        inputMode="tel"
                                        placeholder="(47) 99999-0000"
                                        className="tabular"
                                    />
                                    <p className="text-[13px] text-muted">
                                        Para testar com o WhatsApp de verdade, use o seu número.
                                    </p>
                                </div>
                            ) : null}

                            {error ? (
                                <p role="alert" className="text-sm text-red-700">
                                    {error}
                                </p>
                            ) : null}
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 border-t border-line bg-surface/60 px-6 py-4">
                        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" loading={sending} disabled={!templateId}>
                            <FileSignature aria-hidden /> Enviar na conversa
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
