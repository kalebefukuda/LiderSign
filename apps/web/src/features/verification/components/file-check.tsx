import type { FileCheckResponse } from '@lidersign/shared'
import { CheckCircle2, FileSearch, XCircle } from 'lucide-react'
import { Link } from 'react-router'
import * as React from 'react'

import { cn, errorMessage } from '@lidersign/ui'

import { verificationApi } from '../api'

type Result =
    | { kind: 'match'; data: FileCheckResponse; fileName: string }
    | { kind: 'mismatch'; data: FileCheckResponse; fileName: string }

export function FileCheck({ expectedCode }: { expectedCode?: string }) {
    const [checking, setChecking] = React.useState(false)
    const [result, setResult] = React.useState<Result | null>(null)
    const [error, setError] = React.useState<string | null>(null)
    const [dragging, setDragging] = React.useState(false)
    const inputRef = React.useRef<HTMLInputElement>(null)

    async function check(file: File) {
        setError(null)
        setResult(null)
        if (file.size > 20 * 1024 * 1024) {
            setError('Envie um PDF de até 20 MB.')
            return
        }
        setChecking(true)
        try {
            const data = await verificationApi.checkFile(file)
            const sameDocument = data.match && (!expectedCode || data.verification?.code === expectedCode)
            setResult({ kind: sameDocument ? 'match' : 'mismatch', data, fileName: file.name })
        } catch (err) {
            setError(errorMessage(err))
        } finally {
            setChecking(false)
        }
    }

    return (
        <div className="space-y-4">
            <div
                role="button"
                tabIndex={0}
                aria-busy={checking}
                onClick={() => inputRef.current?.click()}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        inputRef.current?.click()
                    }
                }}
                onDragOver={(event) => {
                    event.preventDefault()
                    setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                    event.preventDefault()
                    setDragging(false)
                    const file = event.dataTransfer.files?.[0]
                    if (file) void check(file)
                }}
                className={cn(
                    'flex cursor-pointer items-center gap-4 rounded-2xl border border-dashed px-5 py-6 transition-colors duration-150',
                    dragging ? 'border-brand bg-brand-soft/60' : 'border-line-strong hover:bg-surface/70',
                )}
            >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-muted">
                    <FileSearch className="size-5" aria-hidden />
                </span>
                <div>
                    <p className="font-medium">
                        {checking ? 'Conferindo o arquivo…' : 'Arraste o PDF aqui ou clique para escolher'}
                    </p>
                    <p className="mt-0.5 text-sm text-muted">
                        O arquivo é comparado pelo hash e não fica guardado.
                    </p>
                </div>
                <input
                    ref={inputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    className="sr-only"
                    onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) void check(file)
                        event.target.value = ''
                    }}
                />
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            {result ? (
                <div
                    role="status"
                    className={cn(
                        'flex gap-3 rounded-2xl border p-5 animate-enter',
                        result.kind === 'match'
                            ? 'border-emerald-200 bg-emerald-50/60'
                            : 'border-red-200 bg-red-50/60',
                    )}
                >
                    {result.kind === 'match' ? (
                        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden />
                    ) : (
                        <XCircle className="mt-0.5 size-5 shrink-0 text-red-600" aria-hidden />
                    )}
                    <div className="min-w-0 space-y-1">
                        <p
                            className={cn(
                                'font-semibold',
                                result.kind === 'match' ? 'text-emerald-800' : 'text-red-800',
                            )}
                        >
                            {result.kind === 'match'
                                ? 'Arquivo idêntico ao assinado'
                                : 'Este arquivo não confere: ele foi alterado ou não foi assinado pelo LíderSign'}
                        </p>
                        <p className="truncate text-sm text-muted">{result.fileName}</p>
                        <p className="break-all font-mono text-xs text-muted">SHA-256 {result.data.sha256}</p>
                        {result.kind === 'match' && result.data.verification && !expectedCode ? (
                            <Link
                                to={`/v/${encodeURIComponent(result.data.verification.code)}`}
                                className="inline-flex pt-1 text-sm font-medium text-brand hover:underline"
                            >
                                Ver detalhes da assinatura
                            </Link>
                        ) : null}
                    </div>
                </div>
            ) : null}
        </div>
    )
}
