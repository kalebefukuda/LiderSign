import type { TemplateVariable } from '@lidersign/shared'

/**
 * Dados de demonstração do escritório e dos leads que chegaram pelo WhatsApp.
 * Na LíderHub de verdade, isso vem do CRM e da conversa com o agente de IA.
 * CPFs e telefones são fictícios (CPF com dígito verificador válido, número sem dono).
 */
export const OFFICE_PROFILE = {
    nome_escritorio: 'Souza Advocacia Previdenciária',
    nome_advogado: 'Dra. Ana Paula Souza',
    oab_advogado: 'OAB/SC 00000',
    endereco_escritorio: 'Rua XV de Novembro, 500, sala 3, Joinville/SC',
    cidade: 'Joinville/SC',
}

export type HistoryLine = { from: 'lead' | 'agent'; text: string; minutesAgo: number }

export type DemoContact = {
    id: string
    name: string
    cpf: string
    phone: string
    city: string
    topic: string
    stage: string
    fields: Record<string, string>
    history: HistoryLine[]
}

export const CONTACTS: DemoContact[] = [
    {
        id: 'maria',
        name: 'Maria Aparecida dos Santos',
        cpf: '529.982.247-25',
        phone: '5547900000001',
        city: 'Joinville/SC',
        topic: 'BPC/LOAS',
        stage: 'Qualificado',
        fields: {
            endereco_cliente: 'Rua das Palmeiras, 120, Centro, Joinville/SC',
            nacionalidade: 'brasileira',
            estado_civil: 'viúva',
            profissao: 'do lar',
            percentual_honorarios: '30%',
            finalidade:
                'requerer e acompanhar o Benefício de Prestação Continuada (BPC/LOAS) junto ao INSS e, se necessário, em juízo',
        },
        history: [
            {
                from: 'lead',
                minutesAgo: 14,
                text: 'Oi, boa tarde! Vi o anúncio sobre o BPC. Tenho 66 anos e nunca consegui o benefício.',
            },
            {
                from: 'agent',
                minutesAgo: 13,
                text: 'Olá, Maria! Pelo que você contou, dá para pedir o BPC/LOAS. O escritório cuida de tudo e só cobra se der certo: 30% dos valores atrasados.',
            },
            { from: 'lead', minutesAgo: 12, text: 'Pode mandar o contrato então.' },
        ],
    },
    {
        id: 'joao',
        name: 'João Batista Lima',
        cpf: '714.602.380-01',
        phone: '5547900000002',
        city: 'Blumenau/SC',
        topic: 'Aposentadoria por invalidez',
        stage: 'Qualificado',
        fields: {
            endereco_cliente: 'Rua Sete de Setembro, 88, Velha, Blumenau/SC',
            nacionalidade: 'brasileiro',
            estado_civil: 'casado',
            profissao: 'pedreiro',
            percentual_honorarios: '30%',
            finalidade: 'restabelecer o benefício por incapacidade junto ao INSS e, se necessário, em juízo',
        },
        history: [
            {
                from: 'lead',
                minutesAgo: 95,
                text: 'Bom dia. Fui afastado pelo INSS e o benefício foi cortado.',
            },
            {
                from: 'agent',
                minutesAgo: 94,
                text: 'Sinto muito, João. Você tem os laudos médicos dos últimos meses?',
            },
            { from: 'lead', minutesAgo: 80, text: 'Tenho sim, consegui juntar os laudos.' },
        ],
    },
    {
        id: 'carla',
        name: 'Carla Mendes',
        cpf: '385.112.960-18',
        phone: '5547900000003',
        city: 'Itajaí/SC',
        topic: 'Salário-maternidade',
        stage: 'Novo',
        fields: {
            endereco_cliente: 'Av. Joca Brandão, 410, Centro, Itajaí/SC',
            nacionalidade: 'brasileira',
            estado_civil: 'solteira',
            profissao: 'manicure autônoma',
            percentual_honorarios: '30%',
            finalidade: 'requerer o salário-maternidade junto ao INSS e, se necessário, em juízo',
        },
        history: [
            {
                from: 'lead',
                minutesAgo: 1_440,
                text: 'Oi! Sou autônoma e tive bebê mês passado. Tenho direito?',
            },
            {
                from: 'agent',
                minutesAgo: 1_439,
                text: 'Oi, Carla! Parabéns! Se você contribuiu ao INSS, provavelmente sim.',
            },
            { from: 'lead', minutesAgo: 1_430, text: 'Qual documento preciso levar?' },
        ],
    },
    {
        id: 'antonio',
        name: 'Antônio Carlos Pereira',
        cpf: '246.813.570-90',
        phone: '5547900000004',
        city: 'Jaraguá do Sul/SC',
        topic: 'Revisão da aposentadoria',
        stage: 'Qualificado',
        fields: {
            endereco_cliente: 'Rua Reinoldo Rau, 230, Centro, Jaraguá do Sul/SC',
            nacionalidade: 'brasileiro',
            estado_civil: 'casado',
            profissao: 'aposentado',
            percentual_honorarios: '25%',
            finalidade: 'pedir a revisão da aposentadoria junto ao INSS e, se necessário, em juízo',
        },
        history: [
            {
                from: 'lead',
                minutesAgo: 300,
                text: 'Boa tarde. Acho que calcularam errado a minha aposentadoria.',
            },
            {
                from: 'agent',
                minutesAgo: 299,
                text: 'Boa tarde, Antônio! Com a carta de concessão dá para conferir. Se houver diferença, o escritório pede a revisão e cobra 25% só do que você receber a mais.',
            },
            { from: 'lead', minutesAgo: 290, text: 'Combinado. Pode me mandar o que precisa assinar.' },
        ],
    },
]

export function findContact(id: string): DemoContact | undefined {
    return CONTACTS.find((contact) => contact.id === id)
}

export function contactRef(id: string) {
    return `contato:${id}`
}

function today() {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeZone: 'America/Sao_Paulo' }).format(
        new Date(),
    )
}

export function fillVariables(variables: TemplateVariable[], contact: DemoContact): Record<string, string> {
    const known: Record<string, string> = {
        ...OFFICE_PROFILE,
        ...contact.fields,
        nome_cliente: contact.name,
        cpf_cliente: contact.cpf,
        data: today(),
    }
    return Object.fromEntries(
        variables.map((variable) => [variable.key, known[variable.key] ?? variable.example ?? '']),
    )
}

export function initials(name: string) {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .filter((part) => part.length > 2)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('')
}
