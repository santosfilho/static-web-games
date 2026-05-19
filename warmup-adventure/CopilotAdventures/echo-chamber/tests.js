'use strict';

/* ═══════════════════════════════════════════════════════════════
   tests.js — Suíte de Testes Abrangente
   Execute com: node tests.js
   ═══════════════════════════════════════════════════════════════ */

const Engine = require('./engine.js');
const { performance } = require('perf_hooks');

// ─── Framework de testes simples ──────────────────────────────────────────────

let _totalTestes  = 0;
let _testesOk     = 0;
let _testesFalha  = 0;
const _falhas     = [];

function assert(condicao, mensagem) {
  _totalTestes++;
  if (condicao) {
    _testesOk++;
  } else {
    _testesFalha++;
    _falhas.push(mensagem);
    console.log(`  ❌ FALHA: ${mensagem}`);
  }
}

function assertIgual(real, esperado, mensagem) {
  const ok = Engine.aproxIgual(real, esperado);
  assert(ok, `${mensagem} — esperado: ${esperado}, obtido: ${real}`);
}

function grupo(nome, fn) {
  console.log(`\n🔹 ${nome}`);
  fn();
}

// ─── Testes ───────────────────────────────────────────────────────────────────

grupo('Progressão Aritmética (PA)', () => {
  // Caso básico
  const r1 = Engine.preverProximos([3, 6, 9, 12]);
  assertIgual(r1.valores[0], 15, 'PA básica [3,6,9,12] → 15');
  assert(r1.analise.tipo === 'aritmetica', 'Tipo detectado como aritmética');
  assertIgual(r1.analise.diferenca, 3, 'Diferença comum = 3');

  // Diferença negativa
  const r2 = Engine.preverProximos([20, 15, 10, 5]);
  assertIgual(r2.valores[0], 0, 'PA negativa [20,15,10,5] → 0');

  // Decimais
  const r3 = Engine.preverProximos([1.5, 3, 4.5, 6]);
  assertIgual(r3.valores[0], 7.5, 'PA decimal [1.5,3,4.5,6] → 7.5');

  // Sequência constante (d=0)
  const r4 = Engine.preverProximos([5, 5, 5, 5]);
  assertIgual(r4.valores[0], 5, 'PA constante [5,5,5,5] → 5');

  // Dois elementos apenas
  const r5 = Engine.preverProximos([7, 14]);
  assertIgual(r5.valores[0], 21, 'PA dois elementos [7,14] → 21');

  // Números negativos
  const r6 = Engine.preverProximos([-15, -10, -5, 0]);
  assertIgual(r6.valores[0], 5, 'PA negativa [-15,-10,-5,0] → 5');

  // Previsão múltipla
  const r7 = Engine.preverProximos([2, 4, 6], 5);
  assertIgual(r7.valores.length, 5, 'PA previsão de 5 valores');
  assertIgual(r7.valores[4], 16, 'PA [2,4,6] → 5° valor = 16');
});

grupo('Progressão Geométrica (PG)', () => {
  // Caso básico
  const r1 = Engine.preverProximos([2, 6, 18, 54]);
  assertIgual(r1.valores[0], 162, 'PG básica [2,6,18,54] → 162');
  assert(r1.analise.tipo === 'geometrica', 'Tipo detectado como geométrica');
  assertIgual(r1.analise.razao, 3, 'Razão = 3');

  // Razão fracionária
  const r2 = Engine.preverProximos([64, 32, 16, 8]);
  assertIgual(r2.valores[0], 4, 'PG decrescente [64,32,16,8] → 4');
  assertIgual(r2.analise.razao, 0.5, 'Razão = 0.5');

  // Razão negativa
  const r3 = Engine.preverProximos([1, -2, 4, -8]);
  assertIgual(r3.valores[0], 16, 'PG razão negativa [1,-2,4,-8] → 16');

  // Razão = 1 deve ser detectada como PA (diferença 0)
  const r4 = Engine.preverProximos([3, 3, 3, 3]);
  assert(r4.analise.tipo === 'aritmetica', 'Constante detectada como PA, não PG');

  // Previsão múltipla
  const r5 = Engine.preverProximos([1, 2, 4, 8], 3);
  assertIgual(r5.valores[0], 16, 'PG [1,2,4,8] → 16');
  assertIgual(r5.valores[1], 32, 'PG [1,2,4,8] → 32');
  assertIgual(r5.valores[2], 64, 'PG [1,2,4,8] → 64');
});

grupo('Sequência Polinomial', () => {
  // Quadrática: n² → 1, 4, 9, 16, 25...
  const r1 = Engine.preverProximos([1, 4, 9, 16, 25]);
  assertIgual(r1.valores[0], 36, 'Quadrática n² [1,4,9,16,25] → 36');
  assert(r1.analise.tipo === 'polinomial', 'Tipo detectado como polinomial');
  assertIgual(r1.analise.grau, 2, 'Grau = 2');

  // Cúbica: n³ → 1, 8, 27, 64, 125
  const r2 = Engine.preverProximos([1, 8, 27, 64, 125]);
  assertIgual(r2.valores[0], 216, 'Cúbica n³ [1,8,27,64,125] → 216');
  assertIgual(r2.analise.grau, 3, 'Grau = 3');

  // Triangulares: 1, 3, 6, 10, 15 (grau 2)
  const r3 = Engine.preverProximos([1, 3, 6, 10, 15]);
  assertIgual(r3.valores[0], 21, 'Triangulares [1,3,6,10,15] → 21');

  // Quadrática com termos grandes
  const r4 = Engine.preverProximos([0, 1, 4, 9, 16, 25, 36, 49]);
  assertIgual(r4.valores[0], 64, 'Quadrática longa → 64');

  // Previsão múltipla polinomial
  const r5 = Engine.preverProximos([1, 4, 9, 16], 3);
  assertIgual(r5.valores[0], 25, 'n² → 25');
  assertIgual(r5.valores[1], 36, 'n² → 36');
  assertIgual(r5.valores[2], 49, 'n² → 49');
});

grupo('Validação e Casos Extremos', () => {
  // Array vazio
  const r1 = Engine.preverProximos([]);
  assert(!r1.analise.valida, 'Array vazio → inválido');

  // Elemento único
  const r2 = Engine.preverProximos([42]);
  assert(!r2.analise.valida, 'Elemento único → inválido');

  // Contém NaN
  const r3 = Engine.preverProximos([1, NaN, 3]);
  assert(!r3.analise.valida, 'Contém NaN → inválido');

  // Contém Infinity
  const r4 = Engine.preverProximos([1, 2, Infinity]);
  assert(!r4.analise.valida, 'Contém Infinity → inválido');

  // Não é array
  const r5 = Engine.analisarSequencia('abc');
  assert(!r5.valida, 'String → inválido');

  const r6 = Engine.analisarSequencia(null);
  assert(!r6.valida, 'null → inválido');

  // Contém zero no meio de PG potencial
  const r7 = Engine.preverProximos([0, 0, 0]);
  assert(r7.analise.tipo === 'aritmetica', '[0,0,0] detectado como PA');

  // Sequência sem padrão reconhecível (aleatória)
  const r8 = Engine.preverProximos([1, 3, 2, 7, 1, 9, 4]);
  assert(!r8.analise.valida || r8.analise.tipo === 'desconhecida' || r8.analise.tipo === 'polinomial',
    'Sequência aparentemente aleatória processada sem crash');
});

grupo('Utilitários Matemáticos', () => {
  // Diferenças finitas
  const d1 = Engine.diferencasFinitas([1, 4, 9, 16]);
  assertIgual(d1.length, 3, 'diferencasFinitas tamanho correto');
  assertIgual(d1[0], 3, 'Δ¹[0] = 3');
  assertIgual(d1[1], 5, 'Δ¹[1] = 5');
  assertIgual(d1[2], 7, 'Δ¹[2] = 7');

  // Binomial
  assertIgual(Engine.binomial(5, 2), 10, 'C(5,2) = 10');
  assertIgual(Engine.binomial(10, 3), 120, 'C(10,3) = 120');
  assertIgual(Engine.binomial(0, 0), 1, 'C(0,0) = 1');

  // Fatorial
  assertIgual(Engine.fatorial(0), 1, '0! = 1');
  assertIgual(Engine.fatorial(5), 120, '5! = 120');
  assertIgual(Engine.fatorial(10), 3628800, '10! = 3628800');

  // aproxIgual
  assert(Engine.aproxIgual(0.1 + 0.2, 0.3), '0.1+0.2 ≈ 0.3');
  assert(!Engine.aproxIgual(1, 2), '1 ≠ 2');
});

grupo('Histórico', () => {
  Engine.limparHistorico();

  const r1 = Engine.preverProximos([2, 4, 6, 8]);
  Engine.registrarNoHistorico([2, 4, 6, 8], r1.analise, r1.valores[0]);

  const r2 = Engine.preverProximos([1, 2, 4, 8]);
  Engine.registrarNoHistorico([1, 2, 4, 8], r2.analise, r2.valores[0]);

  const stats = Engine.estatisticasHistorico();
  assertIgual(stats.total, 2, 'Histórico com 2 registros');
  assertIgual(stats.porTipo.aritmetica, 1, '1 aritmética no histórico');
  assertIgual(stats.porTipo.geometrica, 1, '1 geométrica no histórico');

  Engine.limparHistorico();
  assertIgual(Engine.estatisticasHistorico().total, 0, 'Histórico limpo');
});

grupo('Desempenho — Sequências Grandes', () => {
  // PA com 10.000 elementos
  const paGrande = [];
  for (let i = 0; i < 10000; i++) paGrande.push(3 + i * 7);

  const t1 = performance.now();
  const r1 = Engine.preverProximos(paGrande);
  const dt1 = performance.now() - t1;
  assertIgual(r1.valores[0], 3 + 10000 * 7, 'PA 10k elementos — valor correto');
  assert(dt1 < 500, `PA 10k em ${dt1.toFixed(1)}ms (< 500ms)`);

  // PG com 1.000 elementos
  const pgGrande = [];
  let val = 1;
  for (let i = 0; i < 1000; i++) { pgGrande.push(val); val *= 1.01; }

  const t2 = performance.now();
  const r2 = Engine.preverProximos(pgGrande);
  const dt2 = performance.now() - t2;
  assert(r2.analise.tipo === 'geometrica', 'PG 1k detectada');
  assert(dt2 < 500, `PG 1k em ${dt2.toFixed(1)}ms (< 500ms)`);

  // Polinomial grau 2 com 500 elementos
  const poliGrande = [];
  for (let i = 0; i < 500; i++) poliGrande.push(i * i + 2 * i + 1);

  const t3 = performance.now();
  const r3 = Engine.preverProximos(poliGrande);
  const dt3 = performance.now() - t3;
  assertIgual(r3.valores[0], 500 * 500 + 2 * 500 + 1, 'Poli 500 — valor correto');
  assert(dt3 < 1000, `Polinomial 500 em ${dt3.toFixed(1)}ms (< 1000ms)`);
});

grupo('Geração de Sequência', () => {
  const analise1 = Engine.analisarSequencia([5, 10, 15]);
  const gerada1  = Engine.gerarSequencia(analise1, 6);
  assertIgual(gerada1.length, 6, 'Sequência gerada com 6 elementos');
  assertIgual(gerada1[5], 30, 'PA gerada [5,10,...] → 30 no index 5');

  const analise2 = Engine.analisarSequencia([2, 6, 18]);
  const gerada2  = Engine.gerarSequencia(analise2, 5);
  assertIgual(gerada2[4], 162, 'PG gerada [2,6,18,...] → 162 no index 4');
});

// ─── Relatório final ──────────────────────────────────────────────────────────

console.log('\n══════════════════════════════════════════════════════════');
console.log(`  RESULTADO: ${_testesOk}/${_totalTestes} testes passaram`);

if (_testesFalha > 0) {
  console.log(`  ❌ ${_testesFalha} falha(s):`);
  _falhas.forEach(f => console.log(`     • ${f}`));
} else {
  console.log('  ✅ Todos os testes passaram!');
}

console.log('══════════════════════════════════════════════════════════\n');
process.exit(_testesFalha > 0 ? 1 : 0);
