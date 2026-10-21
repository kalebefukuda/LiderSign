import { firstName } from '../messaging/texts'

/** Textos da conversa de assinatura no WhatsApp. Frases curtas, para quem não tem prática com link. */

const spokenTitle = (title: string) => title.replace(/\s*·\s*/g, ', ')
const possessive = (title: string) => (/^(procura|declara|autoriza)/i.test(title) ? 'a sua' : 'o seu')

export const conversationText = {
    greeting: (name: string, office: string, title: string) =>
        `Oi, ${firstName(name)}! Aqui é do escritório ${office}. Preparamos ${possessive(title)} ${spokenTitle(title)} para você assinar aqui mesmo, pelo WhatsApp. É rápido.`,
    askCpf: () => 'Para começar e proteger os seus dados, digite o seu CPF (só os números).',
    cpfInvalid: () => 'Não entendi o CPF. Digite os 11 números, sem pontos, por favor.',
    cpfWrong: (left: number) =>
        `Esse CPF não confere com o do documento. Confira e digite de novo (${left === 1 ? 'resta 1 tentativa' : `restam ${left} tentativas`}).`,
    blocked: () =>
        'Não consegui confirmar o CPF. Por segurança, pausei esta assinatura. A equipe do escritório vai falar com você por aqui.',
    blockedAgain: () => 'A equipe do escritório já foi avisada e vai falar com você por aqui.',
    documentCaption: () => 'Este é o documento completo. Toque para abrir.',
    audioCaption: () => 'Resumo do documento em áudio',
    decision: () =>
        'Ouça o resumo ou abra o PDF. Quando estiver tudo certo, toque em *Assinar*.\n\nAo tocar em Assinar, você declara que leu e concorda com este documento e o assina eletronicamente.',
    decisionAgain: () => 'Quando quiser, toque em *Assinar*. Se ficou outra dúvida, é só escrever.',
    askQuestion: () => 'Claro! Escreva a sua dúvida que eu explico.',
    useButton: () => 'Para assinar, toque no botão *Assinar* logo abaixo.',
    browserLink: (url: string) =>
        `Aqui está o link para ler e assinar pelo navegador: ${url}\n\nSe preferir, continue por aqui mesmo.`,
    askSelfie: () =>
        'Último passo: como é uma procuração, precisamos de uma selfie. Toque no ícone da câmera e mande uma foto do seu rosto agora.',
    askSelfieAgain: () => 'Para concluir, mande uma selfie (foto do seu rosto) por aqui.',
    selfieInvalid: () => 'Não consegui usar essa foto. Mande outra selfie em JPG ou PNG, de até 5 MB.',
    signed: (name: string) =>
        `Pronto, ${firstName(name)}! Sua assinatura foi registrada. Em instantes eu mando aqui a sua via assinada.`,
    signedCopyCaption: () => 'Sua via assinada, com o selo de integridade.',
    signedCopy: (code: string, verifyUrl: string) =>
        `Qualquer pessoa pode conferir se este documento é autêntico pelo código ${code}: ${verifyUrl}`,
    alreadySigned: () => 'Seu documento já está assinado. Qualquer dúvida, é só chamar por aqui.',
    expired: () => 'Este pedido de assinatura expirou. A equipe do escritório vai mandar um novo por aqui.',
    nudge: {
        AWAITING_CPF: (name: string) =>
            `Oi, ${firstName(name)}! Seu documento ainda está esperando. Para continuar, é só digitar o seu CPF (só os números).`,
        AWAITING_DECISION: (name: string) =>
            `Oi, ${firstName(name)}! Ficou alguma dúvida no documento? Pode perguntar por aqui. Se estiver tudo certo, é só tocar em *Assinar*.`,
        AWAITING_SELFIE: (name: string) =>
            `Oi, ${firstName(name)}! Falta só a selfie para concluir. Toque no ícone da câmera e mande uma foto do seu rosto.`,
    },
}

export const BUTTON_TITLES = {
    sign: 'Assinar',
    question: 'Tenho uma dúvida',
    browser: 'Ver no navegador',
} as const
