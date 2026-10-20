import { ASSURANCE_LEVEL_LABEL, type PublicVerificationDto } from '@lidersign/shared'
import { CheckCircle2, Clock3, ShieldAlert } from 'lucide-react'

import { Kicker } from '@/components/ui/primitives'
import { CopyButton } from '@/components/ui/states'
import { cn } from '@/lib/cn'
import { formatDateTimeLong } from '@/lib/format'

const TIMESTAMP_LABEL = {
    OK: 'Emitido',
    PENDING: 'Aguardando',
    FAILED: 'Indisponível no momento da assinatura',
    SKIPPED: 'Não utilizado nesta instalação',
} as const

export function VerificationResult({ data }: { data: PublicVerificationDto }) {
    const completed = data.valid && data.status === 'COMPLETED'
    const pending = data.status === 'SENT' || data.status === 'VIEWED' || data.status === 'SIGNED'

    return (
        <div className="space-y-10">
            <div
                className={cn(
                    'rounded-2xl border p-6 sm:p-8',
                    completed ? 'border-emerald-200 bg-emerald-50/50' : pending ? 'border-amber-200 bg-amber-50/50' : 'border-line bg-surface',
                )}
            >
                <div className="flex items-start gap-4">
                    <span
                        className={cn(
                            'flex size-11 shrink-0 items-center justify-center rounded-full',
                            completed ? 'bg-emerald-100 text-emerald-700' : pending ? 'bg-amber-100 text-amber-700' : 'bg-white text-muted',
                        )}
                    >
                        {completed ? <CheckCircle2 className="size-6" aria-hidden /> : pending ? <Clock3 className="size-6" aria-hidden /> : <ShieldAlert className="size-6" aria-hidden />}
                    </span>
                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold tracking-[-0.03em] sm:text-[28px]">
                            {completed
                                ? 'Documento autêntico'
                                : pending
                                  ? 'Assinatura em andamento'
                                  : 'Documento sem assinatura válida'}
                        </h1>
                        <p className="mt-2 leading-relaxed text-ink/80">
                            <span className="font-medium text-ink">{data.title}</span>, enviado por {data.officeName}
                            {completed && data.completedAt ? (
                                <>
                                    , assinado por <span className="font-medium text-ink">{data.signer.nameMasked}</span> em{' '}
                                    <span className="tabular">{formatDateTimeLong(data.completedAt)}</span>.
                                </>
                            ) : pending ? (
                                <>, aguardando a assinatura de {data.signer.nameMasked}.</>
                            ) : (
                                <>. Este envelope foi cancelado ou expirou.</>
                            )}
                        </p>
                    </div>
                </div>
            </div>

            <dl className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
                <Item label="Signatário" value={data.signer.nameMasked} />
                <Item label="CPF" value={data.signer.cpfMasked} mono />
                <Item label="Telefone confirmado por código" value={data.signer.phoneVerified ? 'Sim' : 'Não'} />
                <Item label="Nível de garantia" value={ASSURANCE_LEVEL_LABEL[data.assuranceLevel]} />
                <Item label="Código de verificação" value={data.code} mono />
                <div>
                    <dt>
                        <Kicker>Carimbo do tempo</Kicker>
                    </dt>
                    <dd className="mt-1.5 text-[15px]">
                        {TIMESTAMP_LABEL[data.timestamp.status]}
                        {data.timestamp.genTime ? (
                            <span className="block text-sm text-muted tabular">{formatDateTimeLong(data.timestamp.genTime)}</span>
                        ) : null}
                        {data.timestamp.tsa ? <span className="block text-xs text-subtle">{data.timestamp.tsa}</span> : null}
                    </dd>
                </div>
                <Hash label="SHA-256 do documento original" value={data.originalSha256} />
                {data.signedSha256 ? <Hash label="SHA-256 do documento assinado" value={data.signedSha256} /> : null}
            </dl>

            {data.trail.length ? (
                <section aria-labelledby="trilha">
                    <h2 id="trilha" className="text-lg font-semibold tracking-[-0.02em]">
                        Trilha de auditoria
                    </h2>
                    <ol className="mt-4 divide-y divide-line rounded-2xl border border-line">
                        {data.trail.map((item, index) => (
                            <li key={`${item.label}-${index}`} className="flex flex-col gap-0.5 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                                <span className="text-[15px]">{item.label}</span>
                                <span className="text-sm text-muted tabular">{formatDateTimeLong(item.at)}</span>
                            </li>
                        ))}
                    </ol>
                </section>
            ) : null}
        </div>
    )
}

function Item({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <div>
            <dt>
                <Kicker>{label}</Kicker>
            </dt>
            <dd className={cn('mt-1.5 text-[15px]', mono && 'font-mono tabular')}>{value}</dd>
        </div>
    )
}

function Hash({ label, value }: { label: string; value: string }) {
    return (
        <div className="sm:col-span-2">
            <dt>
                <Kicker>{label}</Kicker>
            </dt>
            <dd className="mt-1.5 flex items-start gap-1">
                <span className="break-all font-mono text-[13px] leading-relaxed text-ink/80">{value}</span>
                <CopyButton value={value} label="Copiar hash" className="-mt-1 shrink-0" />
            </dd>
        </div>
    )
}
