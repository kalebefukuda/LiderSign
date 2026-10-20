import { ASSURANCE_LEVEL_LABEL, type PublicVerificationDto } from '@lidersign/shared'
import type * as React from 'react'
import { Check, CheckCircle2, ChevronDown, Clock3, ShieldAlert } from 'lucide-react'

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

/** Resposta direta primeiro (vale ou não vale, quem e quando); o técnico fica recolhido. */
export function VerificationResult({ data, children }: { data: PublicVerificationDto; children?: React.ReactNode }) {
    const completed = data.valid && data.status === 'COMPLETED'
    const pending = data.status === 'SENT' || data.status === 'VIEWED' || data.status === 'SIGNED'
    const tampered = completed && !data.trailIntact
    const ok = completed && !tampered

    const checks = ok
        ? [
              `Assinado por ${data.signer.nameMasked}${data.signer.cpfConfirmed ? `, que confirmou o CPF ${data.signer.cpfMasked}` : ''}${data.signer.phoneVerified ? ' e o celular por código' : ''}.`,
              'O documento não mudou desde a assinatura: o PDF tem selo digital.',
              data.timestamp.status === 'OK'
                  ? 'Data e hora da assinatura registradas por um carimbo do tempo independente.'
                  : 'Data e hora da assinatura registradas na trilha de auditoria.',
          ]
        : []

    return (
        <div className="space-y-10">
            <div
                className={cn(
                    'rounded-2xl border p-6 sm:p-8',
                    ok
                        ? 'border-emerald-200 bg-emerald-50/50'
                        : pending
                          ? 'border-amber-200 bg-amber-50/50'
                          : tampered
                            ? 'border-red-200 bg-red-50/50'
                            : 'border-line bg-surface',
                )}
            >
                <div className="flex items-start gap-4">
                    <span
                        className={cn(
                            'flex size-11 shrink-0 items-center justify-center rounded-full',
                            ok
                                ? 'bg-emerald-100 text-emerald-700'
                                : pending
                                  ? 'bg-amber-100 text-amber-700'
                                  : tampered
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-white text-muted',
                        )}
                    >
                        {ok ? (
                            <CheckCircle2 className="size-6" aria-hidden />
                        ) : pending ? (
                            <Clock3 className="size-6" aria-hidden />
                        ) : (
                            <ShieldAlert className="size-6" aria-hidden />
                        )}
                    </span>
                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold tracking-[-0.03em] sm:text-[28px]">
                            {ok
                                ? 'Documento válido'
                                : pending
                                  ? 'Ainda não foi assinado'
                                  : tampered
                                    ? 'Atenção: os registros não conferem'
                                    : 'Documento sem assinatura válida'}
                        </h1>
                        <p className="mt-2 leading-relaxed text-ink/80">
                            <span className="font-medium text-ink">{data.title}</span>, de {data.officeName}
                            {completed && data.completedAt ? (
                                <>
                                    , assinado em <span className="tabular">{formatDateTimeLong(data.completedAt)}</span>.
                                </>
                            ) : pending ? (
                                <>, aguardando a assinatura de {data.signer.nameMasked}.</>
                            ) : (
                                <>. Este envio foi cancelado ou expirou.</>
                            )}
                        </p>
                    </div>
                </div>
                {checks.length ? (
                    <ul className="mt-6 space-y-2.5 border-t border-emerald-200/70 pt-5">
                        {checks.map((text) => (
                            <li key={text} className="flex gap-2.5 text-[15px] leading-relaxed text-ink/85">
                                <Check className="mt-1 size-4 shrink-0 text-emerald-600" aria-hidden />
                                {text}
                            </li>
                        ))}
                    </ul>
                ) : null}
            </div>

            {children}

            <details className="group rounded-2xl border border-line">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 text-sm font-medium text-muted transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
                    Detalhes técnicos e trilha de auditoria
                    <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <div className="space-y-8 border-t border-line px-6 py-6">
                    <dl className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
                        <Item label="Código de verificação" value={data.code} mono />
                        <Item label="Nível de garantia" value={ASSURANCE_LEVEL_LABEL[data.assuranceLevel]} />
                        <div>
                            <dt>
                                <Kicker>Carimbo do tempo</Kicker>
                            </dt>
                            <dd className="mt-1.5 text-[15px]">
                                {TIMESTAMP_LABEL[data.timestamp.status]}
                                {data.timestamp.genTime ? (
                                    <span className="block text-sm text-muted tabular">
                                        {formatDateTimeLong(data.timestamp.genTime)}
                                    </span>
                                ) : null}
                            </dd>
                        </div>
                        <Item label="CPF" value={data.signer.cpfMasked} mono />
                        <Hash label="SHA-256 do documento original" value={data.originalSha256} />
                        {data.signedSha256 ? <Hash label="SHA-256 do documento assinado" value={data.signedSha256} /> : null}
                    </dl>

                    {data.trail.length ? (
                        <section aria-labelledby="trilha">
                            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                                <h2 id="trilha" className="text-base font-semibold tracking-[-0.02em]">
                                    Trilha de auditoria
                                </h2>
                                <p className={data.trailIntact ? 'text-sm text-emerald-700' : 'text-sm text-red-600'}>
                                    {data.trailIntact
                                        ? 'Íntegra: cada evento confere com o anterior'
                                        : 'Atenção: a trilha não confere'}
                                </p>
                            </div>
                            <ol className="mt-4 divide-y divide-line rounded-xl border border-line">
                                {data.trail.map((item, index) => (
                                    <li
                                        key={`${item.label}-${index}`}
                                        className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <span className="text-[15px]">{item.label}</span>
                                        <span className="text-sm text-muted tabular">{formatDateTimeLong(item.at)}</span>
                                    </li>
                                ))}
                            </ol>
                        </section>
                    ) : null}
                </div>
            </details>
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
