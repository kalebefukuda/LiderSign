import { Check, Copy, ExternalLink, MonitorSmartphone, RefreshCw, Smartphone } from 'lucide-react'
import QRCode from 'qrcode'
import * as React from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Kicker, Skeleton } from '@/components/ui/primitives'
import { DEMO_HOST_BASE } from '@/lib/endpoints'
import { errorMessage } from '@/lib/http'
import { isLocalUrl } from '@/lib/url'
import { useResource } from '@/lib/use-resource'

import { envelopesApi } from '../api'
import { recallLink, rememberLink } from '../link-store'

type HostStatus = { whatsappProvider: 'simulator' | 'cloud_api'; whatsappConfigured: boolean }

/**
 * Como o link chega ao cliente. Em produção, pelo WhatsApp; aqui também por QR code,
 * para abrir a assinatura no seu celular sem depender de conta na Meta.
 */
export function SigningLinkCard({ envelopeId, signerFirstName }: { envelopeId: string; signerFirstName: string }) {
    const [url, setUrl] = React.useState<string | null>(() => recallLink(envelopeId))
    const [qr, setQr] = React.useState<string | null>(null)
    const [regenerating, setRegenerating] = React.useState(false)
    const [copied, setCopied] = React.useState(false)
    const host = useResource<HostStatus>(`${DEMO_HOST_BASE}/status`)

    React.useEffect(() => {
        let cancelled = false
        if (!url) {
            setQr(null)
            return
        }
        QRCode.toDataURL(url, { margin: 1, width: 440, color: { dark: '#0B1220', light: '#FFFFFF' } })
            .then((data) => {
                if (!cancelled) setQr(data)
            })
            .catch(() => setQr(null))
        return () => {
            cancelled = true
        }
    }, [url])

    async function regenerate() {
        setRegenerating(true)
        try {
            const envelope = await envelopesApi.resend(envelopeId)
            rememberLink(envelopeId, envelope.signingUrl)
            setUrl(envelope.signingUrl)
            toast.success('Novo link gerado. O anterior deixou de valer.')
        } catch (error) {
            toast.error(errorMessage(error))
        } finally {
            setRegenerating(false)
        }
    }

    const viaWhatsApp = host.data?.whatsappProvider === 'cloud_api'
    const local = url ? isLocalUrl(url) : false

    return (
        <section aria-labelledby="link-assinatura" className="rounded-2xl border border-brand/25 bg-brand-soft/30 p-5 sm:p-6">
            <Kicker id="link-assinatura">Link de assinatura</Kicker>
            <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-ink/85">
                {viaWhatsApp
                    ? `Enviado para o WhatsApp de ${signerFirstName}. Você também pode abrir pelo QR code.`
                    : `Para assinar como ${signerFirstName}, aponte a câmera do seu celular para o QR code.`}
            </p>

            {url ? (
                <div className="mt-5 grid gap-6 sm:grid-cols-[220px_1fr] sm:items-start">
                    <div className="flex aspect-square w-[220px] items-center justify-center rounded-xl border border-line bg-white p-2.5">
                        {qr ? (
                            <img src={qr} alt="QR code do link de assinatura" className="size-full" />
                        ) : (
                            <Skeleton className="size-full" />
                        )}
                    </div>
                    <div className="min-w-0 space-y-4">
                        <ol className="space-y-2.5 text-[14px] text-ink/85">
                            <li className="flex gap-2.5">
                                <Smartphone className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                                Escaneie com a câmera do celular e siga os passos da assinatura.
                            </li>
                            <li className="flex gap-2.5">
                                <MonitorSmartphone className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                                Sem celular por perto? Abra neste computador.
                            </li>
                        </ol>
                        <div className="flex flex-wrap gap-2">
                            <Button asChild size="sm">
                                <a href={url} target="_blank" rel="noreferrer">
                                    <ExternalLink aria-hidden /> Abrir neste computador
                                </a>
                            </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={async () => {
                                    try {
                                        await navigator.clipboard.writeText(url)
                                        setCopied(true)
                                        window.setTimeout(() => setCopied(false), 1600)
                                    } catch {
                                        toast.error('Não foi possível copiar. Selecione o link abaixo.')
                                    }
                                }}
                            >
                                {copied ? <Check aria-hidden /> : <Copy aria-hidden />} {copied ? 'Copiado' : 'Copiar link'}
                            </Button>
                        </div>
                        <p className="break-all font-mono text-[12px] text-subtle">{url}</p>
                        {local ? (
                            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-[13px] leading-relaxed text-amber-950/85">
                                Este link aponta para <span className="font-mono">localhost</span>, que só existe neste
                                computador: o celular não consegue abrir.{' '}
                                <Link to="/painel/configuracoes" className="font-medium text-amber-900 underline underline-offset-2">
                                    Veja como abrir no celular
                                </Link>
                                .
                            </div>
                        ) : null}
                    </div>
                </div>
            ) : (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                    <p className="text-[14px] text-muted">
                        Por segurança, o link só aparece na hora do envio. Gere um novo para mostrar o QR code.
                    </p>
                    <Button variant="secondary" size="sm" loading={regenerating} onClick={() => void regenerate()}>
                        <RefreshCw aria-hidden /> Gerar novo link
                    </Button>
                </div>
            )}
        </section>
    )
}
