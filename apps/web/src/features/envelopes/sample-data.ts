import { todayLong } from '@/lib/format'

/**
 * Cliente fictício que preenche o formulário de envio (BPC/LOAS). Nenhum dado real:
 * o CPF é um número de teste válido só no dígito verificador e o celular é inventado.
 */
export const SAMPLE_SIGNER = {
    name: 'Maria Aparecida dos Santos',
    cpf: '529.982.247-25',
    phone: '(47) 99999-0000',
    externalRef: 'lead-maria-aparecida-bpc',
}

/** Valores de exemplo para os campos dos modelos, por chave de variável. */
export function sampleValues(): Record<string, string> {
    return {
        nome_cliente: SAMPLE_SIGNER.name,
        cpf_cliente: SAMPLE_SIGNER.cpf,
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
