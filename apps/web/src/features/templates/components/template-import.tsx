import type { TemplateImportResponse } from '@lidersign/shared'
import { FileUp, PenLine } from 'lucide-react'
import * as React from 'react'

import { Button, Skeleton, ErrorNotice, cn, formatBytes, errorMessage } from '@lidersign/ui'

import { templatesApi } from '../api'
import { BLANK_TEMPLATE_BODY } from '../utils'
import { TemplateEditor, type TemplateDraft } from './template-editor'

const ACCEPT =
    '.pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain'
const MAX_BYTES = 5 * 1024 * 1024

type State =
    | { step: 'choose' }
    | { step: 'reading'; fileName: string; size: number }
    | { step: 'edit'; draft: TemplateDraft; origin?: Pick<TemplateImportResponse, 'engine' | 'warnings'> }

export function TemplateImport() {
    const [state, setState] = React.useState<State>({ step: 'choose' })
    const [error, setError] = React.useState<string | null>(null)
    const [dragging, setDragging] = React.useState(false)
    const inputRef = React.useRef<HTMLInputElement>(null)

    async function upload(file: File) {
        setError(null)
        if (file.size > MAX_BYTES) {
            setError(`O arquivo tem ${formatBytes(file.size)}. Envie um arquivo de até 5 MB.`)
            return
        }
        if (!/\.(pdf|docx|txt|md)$/i.test(file.name)) {
            setError('Envie um PDF, DOCX ou TXT. Arquivos .doc antigos: salve como .docx antes.')
            return
        }
        setState({ step: 'reading', fileName: file.name, size: file.size })
        try {
            const result = await templatesApi.importFile(file)
            setState({
                step: 'edit',
                draft: {
                    name: result.suggestedName,
                    kind: result.kind,
                    assuranceLevel: result.kind === 'PROCURACAO' ? 'REFORCADO' : 'PADRAO',
                    body: result.body,
                    variables: result.variables,
                },
                origin: { engine: result.engine, warnings: result.warnings },
            })
        } catch (err) {
            setState({ step: 'choose' })
            setError(errorMessage(err))
        }
    }

    if (state.step === 'edit') {
        return <TemplateEditor initial={state.draft} origin={state.origin} />
    }

    if (state.step === 'reading') {
        return (
            <div className="space-y-6 animate-enter" aria-live="polite">
                <div className="rounded-2xl border border-line p-6">
                    <p className="font-medium">Lendo {state.fileName}</p>
                    <p className="mt-1 text-sm text-muted">
                        Separando o texto e marcando os dados do cliente como campos. Leva alguns segundos.
                    </p>
                    <div className="mt-6 space-y-3">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-4 w-1/2" />
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {error ? <ErrorNotice message={error} /> : null}
            <div
                role="button"
                tabIndex={0}
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
                    if (file) void upload(file)
                }}
                className={cn(
                    'flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border border-dashed px-6 py-16 text-center transition-colors duration-150',
                    dragging ? 'border-brand bg-brand-soft/60' : 'border-line-strong hover:bg-surface/70',
                )}
            >
                <div className="flex size-12 items-center justify-center rounded-xl border border-line bg-white text-brand">
                    <FileUp className="size-5" aria-hidden />
                </div>
                <div className="space-y-1">
                    <p className="text-[15px] font-semibold">
                        Arraste o contrato de exemplo ou clique para escolher
                    </p>
                    <p className="text-sm text-muted">
                        PDF, DOCX ou TXT, até 5 MB. Mesmo sem nenhum campo marcado, o LíderSign encontra os
                        dados do cliente e transforma em modelo.
                    </p>
                </div>
                <input
                    ref={inputRef}
                    type="file"
                    accept={ACCEPT}
                    className="sr-only"
                    onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) void upload(file)
                        event.target.value = ''
                    }}
                />
            </div>
            <div className="flex items-center justify-center gap-3 text-sm text-muted">
                <span>ou</span>
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                        setState({
                            step: 'edit',
                            draft: {
                                name: '',
                                kind: 'CONTRATO',
                                assuranceLevel: 'PADRAO',
                                body: BLANK_TEMPLATE_BODY,
                                variables: [],
                            },
                        })
                    }
                >
                    <PenLine aria-hidden /> Começar do zero
                </Button>
            </div>
        </div>
    )
}
