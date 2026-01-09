/**
 * Utilitário para carregar e processar templates HTML
 */
import * as fs from 'fs';
import * as path from 'path';

/**
 * Cache de templates carregados
 */
const templateCache: Map<string, string> = new Map();

/**
 * Carrega um template HTML do disco
 */
function loadTemplate(templateName: string): string {
  // Verificar cache primeiro
  if (templateCache.has(templateName)) {
    return templateCache.get(templateName)!;
  }

  // Resolver caminho do template (funciona tanto em desenvolvimento quanto em produção)
  // Em desenvolvimento: __dirname = backend/src/templates
  // Em produção: __dirname = backend/dist/templates
  // Os templates HTML devem estar em backend/src/templates/emails (não são compilados)
  const isProduction = __dirname.includes('dist');
  const baseDir = isProduction 
    ? path.resolve(__dirname, '..', 'src', 'templates')
    : __dirname;
  
  const templatePath = path.join(baseDir, 'emails', `${templateName}.html`);
  
  try {
    const template = fs.readFileSync(templatePath, 'utf-8');
    templateCache.set(templateName, template);
    return template;
  } catch (error) {
    console.error(`Erro ao carregar template ${templateName}:`, error);
    console.error(`Caminho tentado: ${templatePath}`);
    throw new Error(`Template ${templateName} não encontrado em ${templatePath}`);
  }
}

/**
 * Processa condicionais {{#if variable}}...{{/if}}
 */
function processConditionals(template: string, data: Record<string, any>): string {
  // Processar blocos condicionais {{#if variable}}...{{/if}}
  const conditionalRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
  
  return template.replace(conditionalRegex, (match, variable, content) => {
    const value = data[variable];
    // Se a variável existe e tem valor (não é null, undefined, ou string vazia), mostrar conteúdo
    if (value !== null && value !== undefined && value !== '') {
      return content;
    }
    return '';
  });
}

/**
 * Substitui placeholders {{variable}} pelos valores
 */
function replacePlaceholders(template: string, data: Record<string, any>): string {
  let result = template;
  
  // Substituir todos os placeholders {{variable}}
  const placeholderRegex = /\{\{(\w+)\}\}/g;
  
  result = result.replace(placeholderRegex, (match, variable) => {
    const value = data[variable];
    // Se o valor for null ou undefined, retornar string vazia
    if (value === null || value === undefined) {
      return '';
    }
    // Escapar HTML para segurança (mas manter tags HTML se já estiverem no template)
    return String(value);
  });
  
  return result;
}

/**
 * Carrega e processa um template HTML com os dados fornecidos
 */
export function renderTemplate(templateName: string, data: Record<string, any>): string {
  // Carregar template
  let template = loadTemplate(templateName);
  
  // Processar condicionais primeiro
  template = processConditionals(template, data);
  
  // Substituir placeholders
  template = replacePlaceholders(template, data);
  
  return template.trim();
}
