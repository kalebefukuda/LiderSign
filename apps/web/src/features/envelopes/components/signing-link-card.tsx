import { Check, Copy, MessageCircle, RefreshCw, Smartphone } from 'lucide-react'
import QRCode from 'qrcode'
import * as React from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/primitives'
import { DEMO_HOST_BASE } from '@/lib/endpoints'
import { errorMessage } from '@/lib/http'
import { isLocalUrl } from '@/lib/url'
import { useResource } from '@/lib/use-resource'

import { envelopesApi } from '../api'
import { recallLink, rememberLink, whatsappShareUrl, type StoredLink } from '../link-store'

type HostStatus = { whatsappProvider: 'simulator' | 'cloud_api'; tenant: { name: string } | null }

type Props = { envelopeId: string; signerFirstName: string; documentTitle: string; phoneMasked: string }

/** Próximo passo depois do envio: fazer o link chegar ao cliente. */
export function SigningLinkCard({ envelopeId, signerFirstName, documentTitle, phoneMasked }: Props) {
    const [link, setLink] = React.useState<StoredLink | null>(() => recallLink(envelopeId))
    const [qr, setQr] = React.useState<string | null>(null)
    const [regenerating, setRegenerating] = React.useState(false)
    const [copied, setCopied] = React.useState(false)
    const host = useResource<HostStatus>(`${DEMO_HOST_BASE}/status`)
    const url = link?.url ?? null

    React.useEffect(() => {
        let cancelled = false
        if (!url) {
            setQr(null)
            return
        }
        QRCode.toDataURL(url, { margin: 1, width: 360, color: { dark: '#0B1220', light: '#FFFFFF' } })
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
            setLink(recallLink(envelopeId))
            toast.success('Novo link pronto. O anterior deixou de valer.')
        } catch (error) {
            toast.error(errorMessage(error))
        } finally {
            setRegenerating(false)
        }
    }

    async function copy() {
        if (!url) return
        try {
            await navigator.clipboard.writeText(url)
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1600)
        } catch {
            toast.error('Não foi possível copiar. Selecione o link e copie.')
        }
    }

    const sentByPlatform = host.data?.whatsappProvider === 'cloud_api'
    const office = host.data?.tenant?.name ?? 'O escritório'
    const message = url
        ? `Olá, ${signerFirstName}! ${office} enviou "${documentTitle}" para você assinar pelo celular. É rápido: ${url}`
        : ''

    return (
        <section
            aria-labelledby="proximo-passo"
            className="overflow-hidden rounded-2xl border border-brand/25 bg-brand-soft/40"
        >
            <div className="grid gap-6 p-5 sm:p-7 md:grid-cols-[1fr_auto] md:items-center">
                <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">Próximo passo</p>
                    <h2 id="proximo-passo" className="mt-2 text-xl font-bold tracking-[-0.02em]">
                        {sentByPlatform ? `Enviado no WhatsApp de ${signerFirstName}` : `Envie o link para ${signerFirstName}`}
                    </h2>
                    <p className="mt-2 max-w-[52ch] text-[15px] leading-relaxed text-ink/80">
                        {sentByPlatform
                            ? `A mensagem foi para ${phoneMasked}. ${signerFirstName} abre no celular, confere o contrato e assina. O andamento aparece aqui sozinho.`
                            : `${signerFirstName} abre no celular, confere o contrato e assina. O andamento aparece aqui sozinho.`}
                    </p>

                    {url ? (
                        <div className="mt-5 flex flex-wrap gap-2">
                            <Button asChild variant={sentByPlatform ? 'secondary' : 'primary'}>
                                <a href={whatsappShareUrl(message, link?.phone)} target="_blank" rel="noreferrer">
                                    <MessageCircle aria-hidden />
                                    {sentByPlatform ? 'Mandar de novo pelo meu WhatsApp' : 'Enviar pelo WhatsApp'}
                                </a>
                            </Button>
                            <Button variant="secondary" onClick={() => void copy()}>
                                {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
                                {copied ? 'Link copiado' : 'Copiar link'}
                            </Button>
                        </div>
                    ) : (
                        <div className="mt-5 flex flex-wrap items-center gap-3">
                            <Button loading={regenerating} onClick={() => void regenerate()}>
                                <RefreshCw aria-hidden /> Gerar o link de novo
                            </Button>
                            <p className="text-sm text-muted">Por segurança, o link só fica disponível na tela em que foi criado.</p>
                        </div>
                    )}
                    {url && isLocalUrl(url) ? (
                        <p className="mt-4 text-[13px] text-amber-800">
                            Este link só abre neste computador. Suba com o Docker para ter um endereço que abre no celular.
                        </p>
                    ) : null}
                </div>

                {url ? (
                    <div className="flex items-center gap-4 md:flex-col md:items-center md:gap-2">
                        <div className="size-[132px] shrink-0 rounded-xl border border-line bg-white p-2 md:size-[150px]">
                            {qr ? (
                                <img src={qr} alt="QR code do link de assinatura" className="size-full" />
                            ) : (
                                <Skeleton className="size-full" />
                            )}
                        </div>
                        <p className="flex max-w-[150px] items-start gap-1.5 text-[12px] leading-snug text-muted md:text-center">
                            <Smartphone className="mt-px size-3.5 shrink-0 md:hidden" aria-hidden />
                            Ou aponte a câmera do celular para abrir aqui
                        </p>
                    </div>
                ) : null}
            </div>
        </section>
    )
}
