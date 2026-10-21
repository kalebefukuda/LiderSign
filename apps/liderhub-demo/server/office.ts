import type { TemplateDto } from '@lidersign/shared'

export const OFFICE_PROFILE = {
    nome_escritorio: 'Souza Advocacia Previdenciária',
    nome_advogado: 'Dra. Ana Paula Souza',
    oab_advogado: 'OAB/SC 00000',
    endereco_escritorio: 'Rua XV de Novembro, 500, sala 3, Joinville/SC',
    cidade: 'Joinville',
}

type Contact = {
    id: string
    name: string
    cpf: string
    externalRef: string
    fields: Record<string, string>
}

export const CONTACTS: Contact[] = [
    {
        id: 'maria',
        name: 'Maria Aparecida dos Santos',
        cpf: '529.982.247-25',
        externalRef: 'lead-maria-aparecida-bpc',
        fields: {
            endereco_cliente: 'Rua das Palmeiras, 120, Centro, Joinville/SC',
            nacionalidade: 'brasileira',
            estado_civil: 'viúva',
            profissao: 'do lar',
            percentual_honorarios: '30%',
            finalidade:
                'requerer e acompanhar o Benefício de Prestação Continuada (BPC/LOAS) junto ao INSS e, se necessário, em juízo',
        },
    },
]

function today() {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeZone: 'America/Sao_Paulo' }).format(
        new Date(),
    )
}

export function fillVariables(template: TemplateDto, contact: Contact): Record<string, string> {
    const known: Record<string, string> = {
        ...OFFICE_PROFILE,
        ...contact.fields,
        nome_cliente: contact.name,
        cpf_cliente: contact.cpf,
        data: today(),
    }
    return Object.fromEntries(
        template.variables.map((variable) => [variable.key, known[variable.key] ?? variable.example ?? '']),
    )
}
