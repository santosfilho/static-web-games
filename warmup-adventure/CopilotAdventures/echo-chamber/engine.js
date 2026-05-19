'use strict';

/* ═══════════════════════════════════════════════════════════════
   engine.js — Motor de Análise de Sequências
   Suporta: Aritmética, Geométrica, Polinomial
   Otimizado para sequências grandes
   ═══════════════════════════════════════════════════════════════ */

/**
 * @typedef {'aritmetica'|'geometrica'|'polinomial'|'desconhecida'} TipoSequencia
 *
 * @typedef {Object} ResultadoAnalise
 * @property {boolean}       valida
 * @property {TipoSequencia} tipo
 * @property {string}        descricao
 * @property {number[]}      parametros
 * @property {number}        grau          - grau polinomial (1=arit, 2=quadrática, etc.)
 * @property {number|null}   razao         - razão para geométrica
 * @property {number|null}   diferenca     - diferença para aritmética
 * @property {string}        formula       - representação da fórmula
 *
 * @typedef {Object} RegistroHistorico
 * @property {number}         id
 * @property {number[]}       sequencia
 * @property {TipoSequencia}  tipo
 * @property {number}         previsao
 * @property {string}         formula
 * @property {number}         timestamp
 */

// ─── Constantes ───────────────────────────────────────────────────────────────

const EPSILON = 1e-9;
const MAX_GRAU_POLINOMIAL = 10;

// ─── Utilitários matemáticos otimizados ───────────────────────────────────────

/**
 * Verifica se dois números são aproximadamente iguais (para ponto flutuante).
 *
 * @param {number} a
 * @param {number} b
 * @returns {boolean}
 */
function aproxIgual(a, b) {
  if (a === b) return true;
  const diff = Math.abs(a - b);
  const max  = Math.max(Math.abs(a), Math.abs(b), 1);
  return diff / max < EPSILON;
}

/**
 * Calcula as diferenças finitas de um array (otimizado, in-place).
 * Retorna um novo array com (n-1) elementos.
 *
 * @param {number[]} arr
 * @returns {number[]}
 */
function diferencasFinitas(arr) {
  const n = arr.length;
  if (n < 2) return [];
  const result = new Array(n - 1);
  for (let i = 0; i < n - 1; i++) {
    result[i] = arr[i + 1] - arr[i];
  }
  return result;
}

/**
 * Verifica se todos os elementos de um array são aproximadamente iguais.
 *
 * @param {number[]} arr
 * @returns {{ constante: boolean, valor: number }}
 */
function todosIguais(arr) {
  if (arr.length === 0) return { constante: true, valor: 0 };
  const primeiro = arr[0];
  for (let i = 1; i < arr.length; i++) {
    if (!aproxIgual(arr[i], primeiro)) {
      return { constante: false, valor: NaN };
    }
  }
  return { constante: true, valor: primeiro };
}

/**
 * Calcula o fatorial de n (com cache para performance).
 *
 * @param {number} n
 * @returns {number}
 */
const _cacheFatorial = [1, 1];
function fatorial(n) {
  if (n < 0) return NaN;
  if (_cacheFatorial[n] !== undefined) return _cacheFatorial[n];
  let result = _cacheFatorial[_cacheFatorial.length - 1];
  for (let i = _cacheFatorial.length; i <= n; i++) {
    result *= i;
    _cacheFatorial[i] = result;
  }
  return result;
}

/**
 * Coeficiente binomial C(n, k).
 *
 * @param {number} n
 * @param {number} k
 * @returns {number}
 */
function binomial(n, k) {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  // Otimização: usa o menor k
  if (k > n - k) k = n - k;
  let result = 1;
  for (let i = 0; i < k; i++) {
    result = result * (n - i) / (i + 1);
  }
  return Math.round(result);
}

// ─── Detecção de Progressão Aritmética ────────────────────────────────────────

/**
 * Tenta detectar se a sequência é uma progressão aritmética.
 *
 * @param {number[]} seq
 * @returns {ResultadoAnalise|null}
 */
function detectarAritmetica(seq) {
  if (seq.length < 2) return null;

  const diffs = diferencasFinitas(seq);
  const { constante, valor } = todosIguais(diffs);

  if (!constante) return null;

  const a1 = seq[0];
  const d  = valor;

  return {
    valida:     true,
    tipo:       'aritmetica',
    descricao:  `Progressão Aritmética (PA) com a₁=${a1} e d=${d}`,
    parametros: [a1, d],
    grau:       1,
    razao:      null,
    diferenca:  d,
    formula:    `a(n) = ${a1} + (n-1)×${d}`,
  };
}

// ─── Detecção de Progressão Geométrica ────────────────────────────────────────

/**
 * Tenta detectar se a sequência é uma progressão geométrica.
 *
 * @param {number[]} seq
 * @returns {ResultadoAnalise|null}
 */
function detectarGeometrica(seq) {
  if (seq.length < 2) return null;

  // PG exige que nenhum termo seja zero (exceto se todos forem zero)
  for (let i = 0; i < seq.length - 1; i++) {
    if (seq[i] === 0) return null;
  }

  const razoes = new Array(seq.length - 1);
  for (let i = 0; i < seq.length - 1; i++) {
    razoes[i] = seq[i + 1] / seq[i];
  }

  const { constante, valor } = todosIguais(razoes);
  if (!constante) return null;

  const a1 = seq[0];
  const r  = valor;

  return {
    valida:     true,
    tipo:       'geometrica',
    descricao:  `Progressão Geométrica (PG) com a₁=${a1} e q=${r}`,
    parametros: [a1, r],
    grau:       NaN,
    razao:      r,
    diferenca:  null,
    formula:    `a(n) = ${a1} × ${r}^(n-1)`,
  };
}

// ─── Detecção de Sequência Polinomial ─────────────────────────────────────────

/**
 * Tenta detectar se a sequência é polinomial de grau ≤ MAX_GRAU_POLINOMIAL.
 * Utiliza diferenças finitas: se a k-ésima diferença é constante, o grau é k.
 *
 * @param {number[]} seq
 * @returns {ResultadoAnalise|null}
 */
function detectarPolinomial(seq) {
  if (seq.length < 3) return null;

  // Tabela de diferenças finitas (armazena apenas a primeira coluna de cada nível)
  let atual = [...seq];
  const primeirosDiffs = [seq[0]]; // Δ⁰[0], Δ¹[0], Δ²[0], ...

  for (let grau = 1; grau <= Math.min(MAX_GRAU_POLINOMIAL, seq.length - 1); grau++) {
    atual = diferencasFinitas(atual);
    primeirosDiffs.push(atual[0]);

    const { constante, valor } = todosIguais(atual);
    if (constante) {
      // Encontramos grau polinomial = grau
      const coefs = calcularCoeficientesNewton(primeirosDiffs);

      return {
        valida:     true,
        tipo:       'polinomial',
        descricao:  `Sequência Polinomial de grau ${grau}`,
        parametros: coefs,
        grau:       grau,
        razao:      null,
        diferenca:  null,
        formula:    gerarFormulaPolinomial(coefs),
      };
    }
  }

  return null;
}

/**
 * Calcula os coeficientes de Newton a partir dos primeiros valores das diferenças.
 * p(x) = Σ C(x, k) × Δᵏ[0]  (onde x começa em 0)
 *
 * @param {number[]} primeirosDiffs - [Δ⁰[0], Δ¹[0], Δ²[0], ...]
 * @returns {number[]}
 */
function calcularCoeficientesNewton(primeirosDiffs) {
  return [...primeirosDiffs];
}

/**
 * Gera a string da fórmula polinomial usando interpolação de Newton.
 *
 * @param {number[]} coefs
 * @returns {string}
 */
function gerarFormulaPolinomial(coefs) {
  const termos = [];
  for (let k = 0; k < coefs.length; k++) {
    if (Math.abs(coefs[k]) < EPSILON) continue;
    if (k === 0) {
      termos.push(`${coefs[k]}`);
    } else if (k === 1) {
      termos.push(`${coefs[k]}×n`);
    } else {
      termos.push(`${coefs[k]}×C(n,${k})`);
    }
  }
  return termos.length > 0 ? `p(n) = ${termos.join(' + ')}` : 'p(n) = 0';
}

/**
 * Avalia o polinômio de Newton no ponto x.
 * p(x) = Σ C(x, k) × coefs[k]
 *
 * @param {number[]} coefs - coeficientes de Newton
 * @param {number} x
 * @returns {number}
 */
function avaliarPolinomioNewton(coefs, x) {
  let resultado = 0;
  for (let k = 0; k < coefs.length; k++) {
    resultado += binomial(x, k) * coefs[k];
  }
  return resultado;
}

// ─── Motor Principal ──────────────────────────────────────────────────────────

/**
 * Analisa uma sequência e detecta automaticamente seu tipo.
 * Ordem de prioridade: Aritmética → Geométrica → Polinomial → Desconhecida.
 *
 * @param {number[]} seq
 * @returns {ResultadoAnalise}
 */
function analisarSequencia(seq) {
  // Validação de entrada
  if (!Array.isArray(seq) || seq.length < 2) {
    return {
      valida: false, tipo: 'desconhecida',
      descricao: 'Sequência inválida: necessário pelo menos 2 elementos.',
      parametros: [], grau: NaN, razao: null, diferenca: null, formula: '',
    };
  }

  for (const item of seq) {
    if (typeof item !== 'number' || !Number.isFinite(item)) {
      return {
        valida: false, tipo: 'desconhecida',
        descricao: `Elemento inválido encontrado: ${item}`,
        parametros: [], grau: NaN, razao: null, diferenca: null, formula: '',
      };
    }
  }

  // Detecção em ordem de prioridade
  const arit = detectarAritmetica(seq);
  if (arit) return arit;

  const geom = detectarGeometrica(seq);
  if (geom) return geom;

  const poli = detectarPolinomial(seq);
  if (poli) return poli;

  return {
    valida: false, tipo: 'desconhecida',
    descricao: 'Nenhum padrão reconhecido (aritmético, geométrico ou polinomial).',
    parametros: [], grau: NaN, razao: null, diferenca: null, formula: '',
  };
}

/**
 * Prevê o(s) próximo(s) valor(es) de uma sequência.
 *
 * @param {number[]} seq
 * @param {number}   quantidade - Quantos valores prever (padrão: 1)
 * @returns {{ valores: number[], analise: ResultadoAnalise }}
 */
function preverProximos(seq, quantidade = 1) {
  const analise = analisarSequencia(seq);

  if (!analise.valida) {
    return { valores: [], analise };
  }

  const valores = [];

  if (analise.tipo === 'aritmetica') {
    const [a1, d] = analise.parametros;
    for (let i = 1; i <= quantidade; i++) {
      valores.push(seq[seq.length - 1] + d * i);
    }
  } else if (analise.tipo === 'geometrica') {
    const [, r] = analise.parametros;
    let ultimo = seq[seq.length - 1];
    for (let i = 0; i < quantidade; i++) {
      ultimo *= r;
      valores.push(ultimo);
    }
  } else if (analise.tipo === 'polinomial') {
    const coefs = analise.parametros;
    const n = seq.length;
    for (let i = 0; i < quantidade; i++) {
      valores.push(avaliarPolinomioNewton(coefs, n + i));
    }
  }

  return { valores, analise };
}

/**
 * Gera uma sequência completa a partir dos parâmetros detectados.
 * Útil para visualização e validação.
 *
 * @param {ResultadoAnalise} analise
 * @param {number} comprimento
 * @returns {number[]}
 */
function gerarSequencia(analise, comprimento) {
  const result = [];

  if (analise.tipo === 'aritmetica') {
    const [a1, d] = analise.parametros;
    for (let i = 0; i < comprimento; i++) {
      result.push(a1 + d * i);
    }
  } else if (analise.tipo === 'geometrica') {
    const [a1, r] = analise.parametros;
    let val = a1;
    for (let i = 0; i < comprimento; i++) {
      result.push(val);
      val *= r;
    }
  } else if (analise.tipo === 'polinomial') {
    const coefs = analise.parametros;
    for (let i = 0; i < comprimento; i++) {
      result.push(avaliarPolinomioNewton(coefs, i));
    }
  }

  return result;
}

// ─── Histórico ────────────────────────────────────────────────────────────────

/** @type {RegistroHistorico[]} */
const historico = [];
let _proximoId = 1;

/**
 * Adiciona uma análise ao histórico.
 *
 * @param {number[]} sequencia
 * @param {ResultadoAnalise} analise
 * @param {number} previsao
 * @returns {RegistroHistorico}
 */
function registrarNoHistorico(sequencia, analise, previsao) {
  const registro = {
    id:        _proximoId++,
    sequencia: [...sequencia],
    tipo:      analise.tipo,
    previsao:  previsao,
    formula:   analise.formula,
    timestamp: Date.now(),
  };
  historico.push(registro);
  return registro;
}

/**
 * Retorna estatísticas do histórico.
 *
 * @returns {{ total: number, porTipo: Object, taxaAcerto: number }}
 */
function estatisticasHistorico() {
  const porTipo = { aritmetica: 0, geometrica: 0, polinomial: 0, desconhecida: 0 };
  for (const r of historico) {
    porTipo[r.tipo] = (porTipo[r.tipo] || 0) + 1;
  }
  return {
    total:      historico.length,
    porTipo,
    registros:  historico,
  };
}

/**
 * Limpa o histórico.
 */
function limparHistorico() {
  historico.length = 0;
  _proximoId = 1;
}

// ─── Exportação (funciona tanto em Node.js quanto em browser) ─────────────────

const EchoChamberEngine = {
  // Análise
  analisarSequencia,
  preverProximos,
  gerarSequencia,

  // Detecção individual
  detectarAritmetica,
  detectarGeometrica,
  detectarPolinomial,

  // Utilitários
  diferencasFinitas,
  aproxIgual,
  avaliarPolinomioNewton,
  binomial,
  fatorial,

  // Histórico
  registrarNoHistorico,
  estatisticasHistorico,
  limparHistorico,
  historico,
};

// Exporta para Node.js ou expõe como global no browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EchoChamberEngine;
} else if (typeof window !== 'undefined') {
  window.EchoChamberEngine = EchoChamberEngine;
}
