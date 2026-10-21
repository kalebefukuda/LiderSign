export {
    DEFAULT_TEMPLATE_MODEL,
    EXTRACTION_INSTRUCTIONS,
    extractTemplateWithAI,
    extractionSchema,
    normalizeExtraction,
    type ExtractTemplateInput,
    type ExtractedTemplate,
} from './extract-template.js'
export {
    LiderSignApiError,
    LiderSignClient,
    configFromEnv,
    normalizeApiUrl,
    type LiderSignClientConfig,
} from './lidersign-client.js'
export { createLiderSignMcpServer } from './mcp-server.js'
export {
    criarDocumentoParaAssinar,
    liderSignTools,
    listarModelos,
    setLiderSignClient,
    verCamposDoModelo,
    verStatusDoDocumento,
} from './tools.js'
