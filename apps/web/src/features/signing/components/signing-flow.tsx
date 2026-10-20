import type { SigningSessionDto } from '@lidersign/shared'
import { ArrowLeft, CheckCircle2, Download, FileText, Link2Off, Lock, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/primitives'
import { LogoMark } from '@/features/brand'
import { cn } from '@/lib/cn'
import { firstName } from '@/lib/format'
import { HttpError } from '@/lib/http'

import { signingApi } from '../api'
import { DocumentText } from './document-text'
import { OtpStep } from './otp-step'
import { ReadAloud } from './read-aloud'
import { SelfieStep } from './selfie-step'
import { SignStep } from './sign-step'

type StepId = 'confirm' | 'read' | 'otp' | 'selfie' | 'sign'

const STEP_LABEL: Record<StepId, string> = {
    confirm: 'Confirme seus dados',
    read: 'Leia ou ouça',
    otp: 'Código no WhatsApp',
    selfie: 'Selfie',
    sign: 'Assine',
}

type LoadState =
    | { kind: 'loading' }
    | { kind: 'error'; status: number; message: string }
    | { kind: 'ready'; session: SigningSessionDto }

function initialStep(session: SigningSessionDto): StepId | 'done' {
    if (session.status === 'SIGNED' || session.status === 'COMPLETED') return 'done'
    if (session.otpVerified) return session.requiresSelfie && !session.selfieCaptured ? 'selfie' : 'sign'
    return 'confirm'
}

export function SigningFlow({ token }: { token: string }) {
    const [state, setState] = React.useState<LoadState>({ kind: 'loading' })
    const [step, setStep] = React.useState<StepId | 'done'>('confirm')
    const [notMe, setNotMe] = React.useState(false)

    const load = React.useCallback(async () => {
        try {
            const session = await signingApi.session(token)
            setState({ kind: 'ready', session })
            return session
        } catch (error) {
            const status = error instanceof HttpError ? error.status : 0
            setState({ kind: 'error', status, message: error instanceof Error ? error.message : '' })
            return null
        }
    }, [token])

    React.useEffect(() => {
        void load().then((session) => {
            if (session) setStep(initialStep(session))
        })
    }, [load])

    React.useEffect(() => {
        window.scrollTo({ top: 0 })
    }, [step])

    if (state.kind === 'loading') {
        return (
            <Shell>
                <div className="space-y-5 pt-2">
                    <Skeleton className="h-2 w-full rounded-full" />
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-28 w-full rounded-2xl" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                </div>
            </Shell>
        )
    }

    if (state.kind === 'error') {
        const expired = state.status === 410
        return (
            <Shell>
                <div className="flex flex-col items-center gap-4 pt-10 text-center animate-enter">
                    <span className="flex size-14 items-center justify-center rounded-full bg-surface text-muted">
                        <Link2Off className="size-6" aria-hidden />
                    </span>
                    <h1 className="text-2xl font-bold tracking-[-0.03em]">
                        {expired ? 'Este link não está mais ativo' : state.status === 0 || state.status >= 500 ? 'Sem conexão agora' : 'Link inválido'}
                    </h1>
                    <p className="max-w-xs text-[15px] leading-relaxed text-muted">
                        {expired
                            ? 'Ele expirou ou foi cancelado pelo escritório. Peça um novo link ao escritório pelo WhatsApp.'
                            : state.status === 0 || state.status >= 500
                              ? 'Não conseguimos abrir o documento. Confira a internet e tente de novo.'
                              : 'Confira se o link foi copiado inteiro. Se continuar assim, peça um novo link ao escritório pelo WhatsApp.'}
                    </p>
                    {state.status === 0 || state.status >= 500 ? (
                        <Button size="lg" variant="secondary" onClick={() => void load()}>
                            Tentar de novo
                        </Button>
                    ) : null}
                </div>
            </Shell>
        )
    }

    const { session } = state
    const steps: StepId[] = ['confirm', 'read', 'otp', ...(session.requiresSelfie ? (['selfie'] as const) : []), 'sign']
    const go = (next: StepId | 'done') => setStep(next)
    const nextOf = (current: StepId) => steps[steps.indexOf(current) + 1] ?? 'done'
    const prevOf = (current: StepId) => steps[steps.indexOf(current) - 1]

    if (step === 'done') {
        return (
            <Shell>
                <DoneScreen token={token} initial={session} />
            </Shell>
        )
    }

    const index = steps.indexOf(step)
    const previous = prevOf(step)
    const canGoBack = previous && step !== 'sign' && step !== 'selfie' && !(step === 'otp' && session.otpVerified)

    return (
        <Shell>
            <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                    {canGoBack ? (
                        <button
                            type="button"
                            onClick={() => go(previous)}
                            className="-ml-1 inline-flex h-9 items-center gap-1 rounded-lg px-1 text-muted hover:text-ink"
                        >
                            <ArrowLeft className="size-4" aria-hidden /> Voltar
                        </button>
                    ) : (
                        <span />
                    )}
                    <span className="text-muted tabular">
                        Passo {index + 1} de {steps.length}
                    </span>
                </div>
                <div className="flex gap-1.5" aria-hidden>
                    {steps.map((item, itemIndex) => (
                        <span
                            key={item}
                            className={cn(
                                'h-1 flex-1 rounded-full transition-colors duration-200',
                                itemIndex <= index ? 'bg-brand' : 'bg-line',
                            )}
                        />
                    ))}
                </div>
            </div>

            <div key={step} className="mt-7 animate-enter">
                <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-subtle">{STEP_LABEL[step]}</p>

                {step === 'confirm' ? (
                    <div className="mt-3 space-y-6">
                        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.035em]">
                            Olá, {firstName(session.signer.name)}
                        </h1>
                        <p className="text-[17px] leading-relaxed text-ink/80">
                            <span className="font-semibold text-ink">{session.officeName}</span> enviou um documento
                            para você assinar pelo celular.
                        </p>
                        <div className="rounded-2xl border border-line">
                            <div className="flex items-center gap-3 border-b border-line px-4 py-4">
                                <FileText className="size-5 shrink-0 text-brand" aria-hidden />
                                <p className="font-medium leading-snug">{session.title}</p>
                            </div>
                            <dl className="divide-y divide-line">
                                <div className="flex items-center justify-between gap-4 px-4 py-3.5">
                                    <dt className="text-[15px] text-muted">Nome</dt>
                                    <dd className="text-right text-[15px] font-medium">{session.signer.name}</dd>
                                </div>
                                <div className="flex items-center justify-between gap-4 px-4 py-3.5">
                                    <dt className="text-[15px] text-muted">CPF</dt>
                                    <dd className="font-mono text-[15px] tabular">{session.signer.cpfMasked}</dd>
                                </div>
                            </dl>
                        </div>
                        {notMe ? (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-[15px] leading-relaxed text-amber-900">
                                Não assine. Responda no WhatsApp avisando o escritório que este documento chegou para a
                                pessoa errada. Você pode fechar esta página.
                            </div>
                        ) : null}
                        <div className="space-y-2 pt-2">
                            <Button size="lg" className="w-full" onClick={() => go('read')}>
                                Sou eu, continuar
                            </Button>
                            <Button variant="ghost" size="lg" className="w-full" onClick={() => setNotMe(true)}>
                                Não sou eu
                            </Button>
                        </div>
                    </div>
                ) : null}

                {step === 'read' ? (
                    <div className="mt-3 space-y-5">
                        <h1 className="text-[26px] font-bold leading-tight tracking-[-0.035em]">{session.title}</h1>
                        <ReadAloud text={session.plainText} />
                        <div
                            className="max-h-[52vh] overflow-y-auto rounded-2xl border border-line bg-surface/50 px-5 py-5 scrollbar-thin"
                            tabIndex={0}
                            aria-label="Texto do documento"
                        >
                            <DocumentText body={session.body} />
                        </div>
                        <a
                            href={signingApi.documentUrl(token)}
                            className="inline-flex items-center gap-2 text-[15px] font-medium text-brand underline-offset-4 hover:underline"
                        >
                            <Download className="size-4" aria-hidden /> Baixar PDF
                        </a>
                        <div className="sticky bottom-0 -mx-5 border-t border-line bg-white px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-4">
                            <Button size="lg" className="w-full" onClick={() => go('otp')}>
                                Li o documento, continuar
                            </Button>
                        </div>
                    </div>
                ) : null}

                {step === 'otp' ? (
                    <div className="mt-3 space-y-5">
                        <h1 className="text-[26px] font-bold leading-tight tracking-[-0.035em]">Confirme que é você</h1>
                        <OtpStep
                            token={token}
                            phoneMasked={session.signer.phoneMasked}
                            onVerified={() => go(nextOf('otp'))}
                        />
                    </div>
                ) : null}

                {step === 'selfie' ? (
                    <div className="mt-3 space-y-5">
                        <h1 className="text-[26px] font-bold leading-tight tracking-[-0.035em]">Uma selfie rápida</h1>
                        <SelfieStep token={token} onCaptured={() => go('sign')} />
                    </div>
                ) : null}

                {step === 'sign' ? (
                    <div className="mt-3 space-y-5">
                        <h1 className="text-[26px] font-bold leading-tight tracking-[-0.035em]">Faça sua assinatura</h1>
                        <SignStep token={token} signerName={session.signer.name} onSigned={() => go('done')} />
                    </div>
                ) : null}
            </div>
        </Shell>
    )
}

function DoneScreen({ token, initial }: { token: string; initial: SigningSessionDto }) {
    const [session, setSession] = React.useState(initial)
    const [waitedTooLong, setWaitedTooLong] = React.useState(false)
    const completed = session.status === 'COMPLETED'

    React.useEffect(() => {
        if (completed) return
        let attempts = 0
        const id = window.setInterval(async () => {
            attempts += 1
            try {
                const next = await signingApi.session(token)
                setSession(next)
            } catch {
                /* tenta de novo no próximo ciclo */
            }
            if (attempts >= 45) {
                setWaitedTooLong(true)
                window.clearInterval(id)
            }
        }, 2000)
        return () => window.clearInterval(id)
    }, [completed, token])

    return (
        <div className="flex flex-col items-center pt-8 text-center animate-enter">
            <span
                className={cn(
                    'flex size-16 items-center justify-center rounded-full',
                    completed ? 'bg-emerald-50 text-emerald-600' : 'bg-brand-soft text-brand',
                )}
            >
                <CheckCircle2 className="size-8" aria-hidden />
            </span>
            <h1 className="mt-6 text-[28px] font-bold leading-tight tracking-[-0.035em]">Pronto! Documento assinado</h1>
            <p className="mt-3 max-w-xs text-[17px] leading-relaxed text-ink/80">
                {completed ? 'Enviamos sua cópia no WhatsApp.' : 'Estamos selando o documento. Leva só alguns segundos.'}
            </p>

            <div className="mt-8 w-full space-y-3 text-left">
                {completed ? (
                    <a
                        href={signingApi.signedUrl(token)}
                        className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-brand text-base font-medium text-white transition-colors hover:bg-brand-hover"
                    >
                        <Download className="size-4" aria-hidden /> Baixar documento assinado
                    </a>
                ) : (
                    <div
                        className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-surface text-[15px] text-muted"
                        aria-live="polite"
                    >
                        <span className="size-2 animate-pulse rounded-full bg-brand" aria-hidden />
                        {waitedTooLong ? 'Ainda selando. A cópia chega no seu WhatsApp.' : 'Selando o PDF…'}
                    </div>
                )}
                <div className="rounded-2xl border border-line p-4">
                    <p className="flex items-center gap-2 text-sm font-medium">
                        <ShieldCheck className="size-4 text-brand" aria-hidden /> Código de verificação
                    </p>
                    <p className="mt-2 font-mono text-xl tracking-wider">{session.verificationCode}</p>
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                        Qualquer pessoa pode conferir a autenticidade deste documento com este código.
                    </p>
                    <Link
                        to={`/v/${encodeURIComponent(session.verificationCode)}`}
                        className="mt-3 inline-flex text-[15px] font-medium text-brand underline-offset-4 hover:underline"
                    >
                        Verificar agora
                    </Link>
                </div>
            </div>
        </div>
    )
}

function Shell({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-dvh bg-white">
            <header className="sticky top-0 z-10 border-b border-line bg-white/95 backdrop-blur-sm">
                <div className="mx-auto flex h-14 max-w-md items-center justify-between px-5">
                    <span className="inline-flex items-center gap-2">
                        <LogoMark className="size-6" />
                        <span className="text-[15px] font-semibold tracking-[-0.02em]">LíderSign</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[13px] text-muted">
                        <Lock className="size-3.5" aria-hidden /> Assinatura segura
                    </span>
                </div>
            </header>
            <main className="mx-auto max-w-md px-5 pb-10 pt-6">{children}</main>
        </div>
    )
}
