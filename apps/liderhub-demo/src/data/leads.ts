export type Message = { from: 'lead' | 'agent'; text: string; time: string }

export type Lead = {
    id: string
    name: string
    initials: string
    topic: string
    cpf: string
    city: string
    stage: string
    interactive: boolean
    messages: Message[]
}

export const LEADS: Lead[] = [
    {
        id: 'maria',
        name: 'Maria Aparecida dos Santos',
        initials: 'MA',
        topic: 'BPC/LOAS',
        cpf: '***.982.247-**',
        city: 'Joinville/SC',
        stage: 'Qualificado',
        interactive: true,
        messages: [
            {
                from: 'lead',
                time: '10:02',
                text: 'Oi, boa tarde! Vi o anúncio sobre o BPC. Tenho 66 anos e nunca consegui o benefício.',
            },
            {
                from: 'agent',
                time: '10:03',
                text: 'Olá, Maria! Pelo que você contou, dá para pedir o BPC/LOAS. O escritório cuida de tudo e só cobra se der certo: 30% dos valores atrasados.',
            },
            { from: 'lead', time: '10:04', text: 'Pode mandar o contrato então.' },
        ],
    },
    {
        id: 'joao',
        name: 'João Batista Lima',
        initials: 'JB',
        topic: 'Aposentadoria por invalidez',
        cpf: '***.***.***-04',
        city: 'Blumenau/SC',
        stage: 'Novo',
        interactive: false,
        messages: [
            {
                from: 'lead',
                time: '09:41',
                text: 'Bom dia. Fui afastado pelo INSS e o benefício foi cortado.',
            },
            {
                from: 'agent',
                time: '09:42',
                text: 'Sinto muito, João. Você tem os laudos médicos dos últimos meses?',
            },
            { from: 'lead', time: '09:50', text: 'Tenho sim, consegui juntar os laudos.' },
        ],
    },
    {
        id: 'carla',
        name: 'Carla Mendes',
        initials: 'CM',
        topic: 'Salário-maternidade',
        cpf: '***.***.***-61',
        city: 'Itajaí/SC',
        stage: 'Novo',
        interactive: false,
        messages: [
            { from: 'lead', time: 'Ontem', text: 'Oi! Sou autônoma e tive bebê mês passado. Tenho direito?' },
            {
                from: 'agent',
                time: 'Ontem',
                text: 'Oi, Carla! Parabéns! Se você contribuiu ao INSS, provavelmente sim.',
            },
            { from: 'lead', time: 'Ontem', text: 'Qual documento preciso levar?' },
        ],
    },
]

export type SentContract = { envelopeId: string; url: string; phone: string; at: string }

const STORE_KEY = 'liderhub:sent-contract'

export function loadSent(): SentContract | null {
    try {
        const raw = sessionStorage.getItem(STORE_KEY)
        return raw ? (JSON.parse(raw) as SentContract) : null
    } catch {
        return null
    }
}

export function saveSent(value: SentContract | null) {
    try {
        if (value) sessionStorage.setItem(STORE_KEY, JSON.stringify(value))
        else sessionStorage.removeItem(STORE_KEY)
    } catch {}
}
