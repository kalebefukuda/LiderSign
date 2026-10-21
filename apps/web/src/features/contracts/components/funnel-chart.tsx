import { FUNNEL_STAGE_LABEL, FUNNEL_STAGES, type FunnelSummary } from '@lidersign/shared'

import { Tooltip } from '@lidersign/ui'

const SERIES = [
    { key: 'liderhub', label: 'LíderHub · assinatura na conversa', color: '#2463eb' },
    { key: 'zapsign', label: 'ZapSign · link avulso (histórico de exemplo)', color: '#eb6834' },
] as const

function pct(part: number, total: number) {
    return total ? Math.round((part / total) * 100) : 0
}

/** Funil por etapa: quanto de quem recebeu chegou a cada passo, nos dois jeitos de mandar contrato. */
export function FunnelChart({ liderhub, zapsign }: { liderhub: FunnelSummary; zapsign: FunnelSummary }) {
    const data = { liderhub, zapsign }
    return (
        <figure className="space-y-5">
            <figcaption className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-muted">
                {SERIES.map((series) => (
                    <span key={series.key} className="inline-flex items-center gap-2">
                        <span
                            aria-hidden
                            className="h-2.5 w-4 rounded-sm"
                            style={{ backgroundColor: series.color }}
                        />
                        {series.label}
                    </span>
                ))}
            </figcaption>
            <div className="space-y-5" aria-hidden>
                {FUNNEL_STAGES.map((stage) => (
                    <div
                        key={stage}
                        className="grid grid-cols-[112px_1fr] items-center gap-4 sm:grid-cols-[140px_1fr]"
                    >
                        <span className="text-sm text-ink/80">{FUNNEL_STAGE_LABEL[stage]}</span>
                        <div className="space-y-[2px]">
                            {SERIES.map((series) => {
                                const summary = data[series.key]
                                const value = pct(summary.reached[stage], summary.total)
                                return (
                                    <Tooltip
                                        key={series.key}
                                        content={`${series.key === 'liderhub' ? 'LíderHub' : 'ZapSign'} · ${FUNNEL_STAGE_LABEL[stage]}: ${summary.reached[stage]} de ${summary.total} (${value}%)`}
                                    >
                                        <div className="flex h-5 cursor-default items-center gap-2">
                                            <div className="h-full flex-1">
                                                <div
                                                    className="h-3 rounded-r-[4px] transition-[width] duration-300 ease-out"
                                                    style={{
                                                        width: `${Math.max(value, summary.total ? 0.8 : 0)}%`,
                                                        backgroundColor: series.color,
                                                        marginTop: 4,
                                                    }}
                                                />
                                            </div>
                                            <span className="w-10 shrink-0 text-right text-xs font-medium text-ink/80 tabular">
                                                {summary.total ? `${value}%` : '–'}
                                            </span>
                                        </div>
                                    </Tooltip>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>
            <table className="sr-only">
                <caption>Funil de assinatura por etapa</caption>
                <thead>
                    <tr>
                        <th>Etapa</th>
                        <th>LíderHub</th>
                        <th>ZapSign (exemplo)</th>
                    </tr>
                </thead>
                <tbody>
                    {FUNNEL_STAGES.map((stage) => (
                        <tr key={stage}>
                            <td>{FUNNEL_STAGE_LABEL[stage]}</td>
                            <td>
                                {liderhub.reached[stage]} de {liderhub.total}
                            </td>
                            <td>
                                {zapsign.reached[stage]} de {zapsign.total}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </figure>
    )
}
