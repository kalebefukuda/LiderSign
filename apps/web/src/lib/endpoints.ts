/**
 * Rotas que o navegador usa, sempre na mesma origem (o Nest serve o site e a API).
 * O navegador nunca guarda a chave de parceiro: tudo que é do escritório passa pelo
 * "back da LíderHub" simulado (/demo-host), que adiciona a chave no servidor.
 */
export const PARTNER_BASE = '/demo-host/v1'
export const DEMO_HOST_BASE = '/demo-host'
export const SIGN_BASE = '/v1/sign'
export const VERIFY_BASE = '/v1/public/verify'
export const EVENTS_URL = `${PARTNER_BASE}/events`

export const enc = (value: string) => encodeURIComponent(value)
