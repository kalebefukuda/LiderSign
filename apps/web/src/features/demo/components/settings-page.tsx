import { isValidBrPhone } from '@lidersign/shared'
import { MessageCircle, RotateCcw, Smartphone } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Field, Input, Kicker, Skeleton } from '@/components/ui/primitives'
import { CopyButton } from '@/components/ui/states'
import { errorMessage } from '@/lib/http'
import { isLocalUrl } from '@/lib/url'
import { useResource } from '@/lib/use-resource'

import { demoApi, type DemoStatus } from '../api'

function Code({ children }: { children: string }) {
    return (
        <div className="flex items-start justify-between gap-3 rounded-xl bg-ink px-4 py-3">
            <pre className="overflow-x-auto font-mono text-[12px] leading-relaxed text-white/90">
                {children}
            </pre>
            <CopyButton
                value={children}
                label="Copiar"
                className="shrink-0 text-white/80 hover:bg-white/10 hover:text-white"
            />
        </div>
    )
}

/** Como as mensagens saem (WhatsApp) e como abrir os links no celular. */
export function SettingsPage() {
    const status = useResource<DemoStatus>(demoApi.statusUrl)
    const [phone, setPhone] = React.useState('')
    const [testing, setTesting] = React.useState(false)
    const [result, setResult] = React.useState<{ ok: boolean; text: string } | null>(null)
    const [confirmReset, setConfirmReset] = React.useState(false)
    const [resetting, setResetting] = React.useState(false)

    if (status.loading && !status.data) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-56" />
                <Skeleton className="h-48 w-full rounded-2xl" />
                <Skeleton className="h-48 w-full rounded-2xl" />
            </div>
        )
    }

    const data = status.data
    const official = data?.whatsappProvider === 'cloud_api'
    const configured = Boolean(data?.whatsappConfigured)
    const publicUrl = data?.webPublicUrl ?? window.location.origin
    const local = isLocalUrl(publicUrl)
    const tunnel = Boolean(data?.tunnel)
    const port = window.location.port || '3000'

    async function sendTest(event: React.FormEvent) {
        event.preventDefault()
        if (!isValidBrPhone(phone)) {
            setResult({ ok: false, text: 'Informe o celular com DDD.' })
            return
        }
        setTesting(true)
        setResult(null)
        try {
            const response = await demoApi.whatsappTest(phone)
            setResult(
                response.status === 'FAILED'
                    ? { ok: false, text: response.error ?? 'A Meta recusou a mensagem.' }
                    : { ok: true, text: 'Mensagem enviada. Confira o seu WhatsApp.' },
            )
        } catch (error) {
            setResult({ ok: false, text: errorMessage(error) })
        } finally {
            setTesting(false)
        }
    }

    async function reset() {
        setResetting(true)
        try {
            await demoApi.reset()
            toast.success('Demonstração reiniciada')
            setConfirmReset(false)
            await status.reload()
        } catch (error) {
            toast.error(errorMessage(error))
        } finally {
            setResetting(false)
        }
    }

    return (
        <div className="space-y-12">
            <section aria-labelledby="whatsapp" className="space-y-4">
                <Kicker id="whatsapp">WhatsApp</Kicker>
                <div className="space-y-5 rounded-2xl border border-line p-5 sm:p-6">
                    <div className="flex flex-wrap items-center gap-3">
                        <MessageCircle className="size-5 text-brand" aria-hidden />
                        <p className="font-semibold">
                            {official
                                ? 'WhatsApp oficial (Meta Cloud API)'
                                : 'Modo demonstração, sem WhatsApp'}
                        </p>
                        {official ? (
                            configured ? (
                                <Badge tone="success" dot>
                                    Configurado
                                </Badge>
                            ) : (
                                <Badge tone="warning">Faltam dados no .env</Badge>
                            )
                        ) : (
                            <Badge>Padrão</Badge>
                        )}
                    </div>

                    {official ? (
                        <>
                            <p className="max-w-2xl text-[15px] leading-relaxed text-ink/80">
                                O link, o código e a cópia assinada saem pelo número da Meta. Envie um teste
                                para conferir a conexão antes de mandar um contrato.
                            </p>
                            <form onSubmit={sendTest} className="flex max-w-lg flex-wrap items-end gap-3">
                                <Field
                                    label="Seu celular (cadastrado na Meta)"
                                    htmlFor="test-phone"
                                    className="min-w-[220px] flex-1"
                                >
                                    <Input
                                        id="test-phone"
                                        value={phone}
                                        inputMode="tel"
                                        placeholder="(47) 99999-0000"
                                        onChange={(event) => setPhone(event.target.value)}
                                        className="tabular"
                                    />
                                </Field>
                                <Button type="submit" loading={testing} disabled={!configured}>
                                    Enviar mensagem de teste
                                </Button>
                            </form>
                            {result ? (
                                <p
                                    className={
                                        result.ok ? 'text-sm text-emerald-700' : 'text-sm text-red-600'
                                    }
                                >
                                    {result.text}
                                </p>
                            ) : null}
                        </>
                    ) : (
                        <>
                            <p className="max-w-2xl text-[15px] leading-relaxed text-ink/80">
                                Nenhuma mensagem sai daqui. Depois de enviar, o escritório manda o link pelo
                                próprio WhatsApp, no botão "Enviar pelo WhatsApp". Na LíderHub, quem envia é o
                                WhatsApp oficial dela. O código por WhatsApp só é pedido nos modelos com
                                selfie; sem a Meta configurada, ele aparece na tela de assinatura.
                            </p>
                            <div className="space-y-2">
                                <p className="text-sm font-medium">
                                    Para usar um número de teste da Meta, no .env:
                                </p>
                                <Code>{`WHATSAPP_PROVIDER=cloud_api
WHATSAPP_PHONE_NUMBER_ID=<Phone number ID>
WHATSAPP_ACCESS_TOKEN=<token da Meta>`}</Code>
                                <p className="text-[13px] text-muted">
                                    Depois rode{' '}
                                    <span className="whitespace-nowrap font-mono">docker compose up -d</span>.
                                    Passo a passo em <span className="font-mono">infra/tunnel.md</span>.
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </section>

            <section aria-labelledby="celular" className="space-y-4">
                <Kicker id="celular">Endereço dos links</Kicker>
                <div className="space-y-5 rounded-2xl border border-line p-5 sm:p-6">
                    <div className="flex flex-wrap items-center gap-3">
                        <Smartphone className="size-5 text-brand" aria-hidden />
                        <p className="font-semibold">Endereço dos links</p>
                        <span className="break-all font-mono text-[13px] text-muted">{publicUrl}</span>
                        {tunnel ? (
                            <Badge tone="success" dot>
                                Túnel HTTPS ativo
                            </Badge>
                        ) : local ? (
                            <Badge tone="warning">Só abre neste computador</Badge>
                        ) : (
                            <Badge tone="success">Abre no celular</Badge>
                        )}
                    </div>
                    {local ? (
                        <div className="space-y-5">
                            <p className="max-w-2xl text-[15px] leading-relaxed text-ink/80">
                                <span className="font-mono">localhost</span> é o próprio computador, então o
                                celular não consegue abrir o link. Escolha uma das opções, coloque o endereço
                                em <span className="font-mono">WEB_PUBLIC_URL</span> no .env e rode{' '}
                                <span className="whitespace-nowrap font-mono">docker compose up -d</span>.
                            </p>
                            <div className="grid gap-5 lg:grid-cols-2">
                                <div className="space-y-2">
                                    <p className="text-sm font-medium">
                                        Celular no mesmo Wi-Fi (mais simples)
                                    </p>
                                    <p className="text-[13px] text-muted">
                                        Descubra o IP do computador (no Mac):
                                    </p>
                                    <Code>ipconfig getifaddr en0</Code>
                                    <p className="text-[13px] text-muted">E use no .env:</p>
                                    <Code>{`WEB_PUBLIC_URL=http://<esse IP>:${port}`}</Code>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-sm font-medium">
                                        Qualquer rede, com HTTPS (túnel, sem conta)
                                    </p>
                                    <Code>{`brew install cloudflared
cloudflared tunnel --url http://localhost:${port}`}</Code>
                                    <p className="text-[13px] text-muted">
                                        Use a URL{' '}
                                        <span className="font-mono">https://….trycloudflare.com</span> no .env
                                        e feche o túnel depois da demonstração.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="max-w-2xl text-[15px] leading-relaxed text-ink/80">
                            {tunnel
                                ? 'O docker compose subiu um túnel da Cloudflare: os links abrem em qualquer celular, em qualquer rede. O endereço é público enquanto o túnel estiver no ar e muda a cada vez que ele sobe. Para desligar: docker compose stop tunnel.'
                                : 'Os links abrem em qualquer celular que alcance esse endereço.'}
                        </p>
                    )}
                </div>
            </section>

            <section aria-labelledby="demo" className="space-y-4">
                <Kicker id="demo">Demonstração</Kicker>
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line p-5 sm:p-6">
                    <p className="max-w-xl text-[15px] leading-relaxed text-ink/80">
                        Apaga o escritório de demonstração, os documentos e o registro, para começar do zero.
                    </p>
                    <Button variant="secondary" onClick={() => setConfirmReset(true)}>
                        <RotateCcw aria-hidden /> Reiniciar demonstração
                    </Button>
                </div>
            </section>

            <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
                <DialogContent>
                    <DialogTitle>Reiniciar a demonstração?</DialogTitle>
                    <DialogDescription>
                        Os documentos enviados e o escritório de demonstração serão apagados. Depois é só
                        ativar de novo.
                    </DialogDescription>
                    <div className="mt-6 flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setConfirmReset(false)}>
                            Cancelar
                        </Button>
                        <Button variant="danger" loading={resetting} onClick={() => void reset()}>
                            Reiniciar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
