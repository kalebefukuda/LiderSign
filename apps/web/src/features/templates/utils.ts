import { extractVariableKeys, humanizeKey, type TemplateVariable, type VariableType } from '@lidersign/shared'

export const VARIABLE_TYPE_LABEL: Record<VariableType, string> = {
    text: 'Texto',
    cpf: 'CPF',
    cnpj: 'CNPJ',
    date: 'Data',
    money: 'Valor (R$)',
    phone: 'Telefone',
    email: 'E-mail',
    address: 'Endereço',
    number: 'Número',
}

export function guessVariableType(key: string): VariableType {
    if (key.includes('cpf')) return 'cpf'
    if (key.includes('cnpj')) return 'cnpj'
    if (key.includes('email')) return 'email'
    if (key.includes('telefone') || key.includes('celular') || key.includes('whatsapp')) return 'phone'
    if (key.includes('endereco')) return 'address'
    if (key.startsWith('data') || key.endsWith('_data')) return 'date'
    if (key.includes('valor')) return 'money'
    if (key.includes('percentual') || key.includes('numero') || key.includes('quantidade')) return 'number'
    return 'text'
}

export function syncVariables(body: string, current: TemplateVariable[]): TemplateVariable[] {
    return extractVariableKeys(body).map(
        (key) =>
            current.find((variable) => variable.key === key) ?? {
                key,
                label: humanizeKey(key),
                type: guessVariableType(key),
            },
    )
}

export const BLANK_TEMPLATE_BODY = `# CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS

Pelo presente instrumento, **{{nome_cliente}}**, inscrito(a) no CPF sob o nº {{cpf_cliente}}, residente em {{endereco_cliente}}, contrata o escritório **{{nome_escritorio}}** para atuar no caso descrito abaixo.

## Cláusula 1 · Objeto

Descreva aqui o serviço contratado.

## Cláusula 2 · Honorários

Os honorários correspondem a {{percentual_honorarios}} do proveito econômico obtido.

{{cidade}}, {{data}}.
`
