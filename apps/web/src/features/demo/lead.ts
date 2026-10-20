import { todayLong } from '@/lib/format'

/**
 * Lead fictício da demonstração (BPC/LOAS). Nenhum dado real: o CPF é um número de teste válido
 * só no dígito verificador e o celular é inventado.
 */
export const DEMO_LEAD = {
    name: 'Maria Aparecida dos Santos',
    cpf: '529.982.247-25',
    phone: '(47) 99999-0000',
    externalRef: 'lead-maria-aparecida-bpc',
    caseLabel: 'BPC/LOAS · idosa sem renda',
}

/** Valores que o agente da LíderHub já coletou na conversa, por chave de variável. */
export function leadValues(): Record<string, string> {
    return {
        nome_cliente: DEMO_LEAD.name,
        cpf_cliente: DEMO_LEAD.cpf,
        endereco_cliente: 'Rua das Palmeiras, 120, Centro, Joinville/SC',
        nacionalidade: 'brasileira',
        estado_civil: 'viúva',
        profissao: 'do lar',
        nome_escritorio: 'Escritório Demo Advocacia Previdenciária',
        nome_advogado: 'Ana Ribeiro',
        oab_advogado: 'OAB/SC 00.000',
        endereco_escritorio: 'Rua XV de Novembro, 500, sala 3, Joinville/SC',
        percentual_honorarios: '30%',
        finalidade:
            'requerer e acompanhar o Benefício de Prestação Continuada (BPC/LOAS) junto ao INSS e, se necessário, em juízo',
        cidade: 'Joinville',
        data: todayLong(),
    }
}

export type ChatLine = { from: 'lead' | 'agent' | 'system'; text: string; time: string }

export const DEMO_CHAT: ChatLine[] = [
    { from: 'lead', text: 'Boa tarde! Queria saber se tenho direito ao BPC. Tenho 67 anos e moro sozinha.', time: '14:02' },
    {
        from: 'agent',
        text: 'Boa tarde, Maria! Pelas suas respostas, você atende aos requisitos de idade e de renda do BPC/LOAS.',
        time: '14:02',
    },
    {
        from: 'agent',
        text: 'O escritório cuida de todo o pedido no INSS. Os honorários são de 30% sobre os valores atrasados, só se o benefício sair. Posso enviar o contrato para você assinar pelo celular?',
        time: '14:03',
    },
    { from: 'lead', text: 'Pode sim, pode mandar.', time: '14:05' },
]
