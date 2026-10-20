import { Check, ExternalLink, Info } from 'lucide-react'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input, Label, NativeSelect } from '@/components/ui/primitives'

const PROMISES = ['Listar modelos', 'Ver campos do modelo', 'Criar documento para assinar', 'Ver status do documento']

/**
 * Réplica da tela atual de conexão da ZapSign na LíderHub (V3). Serve para mostrar a dor:
 * token de API, ambiente e plano pago, tudo fora da plataforma.
 */
export function ZapSignDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const [token, setToken] = React.useState('')

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[560px] overflow-hidden p-0">
                <div className="px-6 pb-5 pt-6">
                    <DialogTitle className="text-xl">Conectar ZapSign</DialogTitle>
                    <DialogDescription className="mt-1.5 pr-6">
                        Documentos para assinar a partir dos seus modelos. O token é testado no ZapSign antes de ser
                        guardado.
                    </DialogDescription>

                    <div className="mt-6 space-y-5">
                        <div className="space-y-1.5">
                            <Label htmlFor="zapsign-token">
                                Token de API <span className="text-red-600">*</span>
                            </Label>
                            <Input
                                id="zapsign-token"
                                value={token}
                                onChange={(event) => setToken(event.target.value)}
                                placeholder="Cole aqui o token"
                                autoComplete="off"
                                spellCheck={false}
                            />
                            <p className="text-[13px] leading-relaxed text-muted">
                                No ZapSign, abra Configurações › Integrações › API ZapSign, ative a integração e copie o
                                token.{' '}
                                <span className="inline-flex items-center gap-1 font-medium text-brand">
                                    Como obter o token <ExternalLink className="size-3" aria-hidden />
                                </span>
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="zapsign-env">
                                Ambiente <span className="text-red-600">*</span>
                            </Label>
                            <NativeSelect id="zapsign-env" defaultValue="prod">
                                <option value="prod">Produção</option>
                                <option value="sandbox">Sandbox</option>
                            </NativeSelect>
                        </div>

                        <p className="flex items-center gap-2 text-[13px] text-muted">
                            <Info className="size-4 shrink-0" aria-hidden /> Requer o plano Equipe ou Enterprise no
                            ZapSign.
                        </p>

                        <div>
                            <p className="text-[13px] font-medium text-ink">
                                Em breve, as automações e o agente vão usar a conexão para:
                            </p>
                            <ul className="mt-2 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                                {PROMISES.map((item) => (
                                    <li key={item} className="flex items-center gap-2 text-[13px] text-muted">
                                        <Check className="size-3.5 shrink-0 text-subtle" aria-hidden />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-line bg-surface/60 px-6 py-4">
                    <Button variant="secondary" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button disabled title="Na demonstração, a conexão com a ZapSign fica desligada">
                        Conectar
                    </Button>
                </div>

                <div className="border-t border-brand/15 bg-brand-soft px-6 py-3.5 text-[13px] leading-relaxed text-ink/80">
                    <span className="font-semibold text-brand">Nota da demonstração · </span>
                    réplica da tela atual. Antes de enviar o primeiro contrato, o advogado precisa saber o que é uma API,
                    onde fica o token e qual plano contratar, tudo fora da LíderHub.
                </div>
            </DialogContent>
        </Dialog>
    )
}
