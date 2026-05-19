'use strict';

/* ═══════════════════════════════════════════════════════════════
   game.js — Câmara do Eco: A Maldição dos Números
   Lógica do jogo + visualização + áudio chiptune
   Utiliza EchoChamberEngine (engine.js)
   ═══════════════════════════════════════════════════════════════ */

const Engine = window.EchoChamberEngine;

// ─── Dados das câmaras (12 fases: PA, PG e Polinomial) ───────────────────────

const CAMARAS = [
  // ─── Progressões Aritméticas (câmaras 1-4) ─────────────────────
  {
    nome: 'SALA DA ENTRADA',
    tipo: 'PA',
    historia: 'Uma grade de ferro feitiçada bloqueia a passagem. O selo se romperá ao completar a sequência aritmética.',
    sequencia: [2, 4, 6, 8],
  },
  {
    nome: 'CRIPTA SOMBRIA',
    tipo: 'PA',
    historia: 'Esqueletos repousam em nichos de pedra negra. A diferença constante revela o caminho.',
    sequencia: [5, 10, 15, 20],
  },
  {
    nome: 'TORRE DO RELÓGIO',
    tipo: 'PA',
    historia: 'Engrenagens giram em ritmo uniforme. Os números decrescem — qual o próximo passo?',
    sequencia: [30, 24, 18, 12],
  },
  {
    nome: 'CORREDOR DAS SOMBRAS',
    tipo: 'PA',
    historia: 'Tochas se apagam uma a uma. A sequência emerge das trevas com passos negativos.',
    sequencia: [-8, -5, -2, 1],
  },

  // ─── Progressões Geométricas (câmaras 5-8) ─────────────────────
  {
    nome: 'CÂMARA DOS ESPELHOS',
    tipo: 'PG',
    historia: 'Espelhos malditos multiplicam as sombras. Cada reflexo duplica o anterior!',
    sequencia: [3, 6, 12, 24],
  },
  {
    nome: 'GALERIA DOS VAMPIROS',
    tipo: 'PG',
    historia: 'Vampiros dançam em formação. Sua força cresce em razão constante a cada geração.',
    sequencia: [2, 6, 18, 54],
  },
  {
    nome: 'FOSSO DIMENSIONAL',
    tipo: 'PG',
    historia: 'O espaço se comprime! Cada sala seguinte tem metade do tamanho da anterior.',
    sequencia: [256, 128, 64, 32],
  },
  {
    nome: 'ALTAR DAS TREVAS',
    tipo: 'PG',
    historia: 'Energias sombrias triplicam a cada pulso. Qual será o próximo pulso de poder?',
    sequencia: [1, 3, 9, 27],
  },

  // ─── Sequências Polinomiais (câmaras 9-12) ─────────────────────
  {
    nome: 'BIBLIOTECA PROIBIDA',
    tipo: 'POLI',
    historia: 'Grimórios flutuam no ar. Os números seguem os quadrados perfeitos — n².',
    sequencia: [1, 4, 9, 16, 25],
  },
  {
    nome: 'SALÃO DOS MONSTROS',
    tipo: 'POLI',
    historia: 'Criaturas se acumulam em padrão triangular. A cada andar, soma-se o próximo inteiro.',
    sequencia: [1, 3, 6, 10, 15],
  },
  {
    nome: 'TRONO SOMBRIO',
    tipo: 'POLI',
    historia: 'O poder do trono cresce cubicamente. Apenas mentes brilhantes sobrevivem!',
    sequencia: [1, 8, 27, 64, 125],
  },
  {
    nome: 'CÂMARA DE DRÁCULA',
    tipo: 'POLI',
    historia: 'O próprio Drácula desafia você! Um selo polinomial final protege seu coração!',
    sequencia: [0, 1, 4, 9, 16, 25],
  },
];

const VIDAS_INICIAIS = 4;
const PONTOS_BASE    = 100;
const BONUS_PRIMEIRA = 50;
const BONUS_PG       = 30;
const BONUS_POLI     = 60;

// ─── Áudio chiptune ──────────────────────────────────────────────────────────

let audioCtx = null;

function obterAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function tocarBeep(freq, duracao, tipo = 'square', volume = 0.08) {
  try {
    const ctx  = obterAudioCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = tipo;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duracao);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duracao);
  } catch (_) { /* Áudio indisponível */ }
}

function somAcerto() {
  tocarBeep(523, 0.08); setTimeout(() => tocarBeep(659, 0.08), 90); setTimeout(() => tocarBeep(784, 0.16), 180);
}
function somErro() {
  tocarBeep(260, 0.08, 'sawtooth'); setTimeout(() => tocarBeep(220, 0.18, 'sawtooth'), 90);
}
function somVitoria() {
  [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tocarBeep(f, 0.22, 'square', 0.1), i * 110));
}
function somGameOver() {
  [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tocarBeep(f, 0.25, 'sawtooth', 0.1), i * 130));
}
function somDica() { tocarBeep(440, 0.12, 'sine', 0.06); }

// ─── Estado ───────────────────────────────────────────────────────────────────

function criarEstado() {
  return {
    camaraAtual: 0,
    vidas:       VIDAS_INICIAIS,
    pontos:      0,
    tentativas:  0,
    dicaUsada:   false,
    registros:   [], // armazena {sequencia, tipo, acertou, tentativas} por câmara
  };
}

let estado = criarEstado();

// ─── Referências ao DOM ───────────────────────────────────────────────────────

const elTelaTitulo   = document.getElementById('tela-titulo');
const elTelaJogo     = document.getElementById('tela-jogo');
const elTelaGameOver = document.getElementById('tela-gameover');
const elTelaVitoria  = document.getElementById('tela-vitoria');
const elTelaHistorico = document.getElementById('tela-historico');

const elCoracoes     = document.getElementById('coracoes-display');
const elSalaBadge    = document.getElementById('sala-badge');
const elSalaNome     = document.getElementById('sala-nome');
const elSalaTipo     = document.getElementById('sala-tipo');
const elSalaHistoria = document.getElementById('sala-historia');
const elSequencia    = document.getElementById('sequencia-display');
const elPontos       = document.getElementById('pontos-display');
const elFeedback     = document.getElementById('feedback');
const elInput        = document.getElementById('input-resposta');
const elBtnEnviar    = document.getElementById('btn-enviar');
const elBtnDica      = document.getElementById('btn-dica');
const elConteudoSup  = document.getElementById('conteudo-superior');
const elGrafico      = document.getElementById('grafico-canvas');

const elGameOverPontos = document.getElementById('gameover-pontos');
const elVitoriaPontos  = document.getElementById('vitoria-pontos');

// ─── Utilitários ─────────────────────────────────────────────────────────────

function mostrarTela(tela) {
  [elTelaTitulo, elTelaJogo, elTelaGameOver, elTelaVitoria, elTelaHistorico].forEach(t => t.classList.remove('ativa'));
  tela.classList.add('ativa');
}

function formatarPontos(n) {
  return String(Math.max(0, Math.floor(n))).padStart(5, '0');
}

// ─── Visualização (Canvas) ────────────────────────────────────────────────────

/**
 * Desenha um mini-gráfico da sequência no canvas.
 * Mostra os pontos existentes e o ponto "?" previsto em vermelho.
 *
 * @param {number[]} seq
 */
function desenharGrafico(seq) {
  const canvas = elGrafico;
  const ctx    = canvas.getContext('2d');
  const W      = canvas.width;
  const H      = canvas.height;

  ctx.clearRect(0, 0, W, H);

  // Calcula previsão para mostrar no gráfico
  const { valores } = Engine.preverProximos(seq, 1);
  const seqCompleta = [...seq, ...(valores.length > 0 ? [valores[0]] : [])];

  const minVal = Math.min(...seqCompleta);
  const maxVal = Math.max(...seqCompleta);
  const range  = maxVal - minVal || 1;

  const paddingX = 24;
  const paddingY = 12;
  const areaW = W - paddingX * 2;
  const areaH = H - paddingY * 2;

  // Converte valor para coordenada Y (invertido)
  const toY = v => paddingY + areaH - ((v - minVal) / range) * areaH;
  const toX = i => paddingX + (i / (seqCompleta.length - 1)) * areaW;

  // Linha de grade inferior
  ctx.strokeStyle = 'rgba(154,112,0,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(paddingX, H - paddingY);
  ctx.lineTo(W - paddingX, H - paddingY);
  ctx.stroke();

  // Linha conectando os pontos conhecidos
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < seq.length; i++) {
    const x = toX(i);
    const y = toY(seq[i]);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Linha tracejada para o ponto previsto
  if (valores.length > 0) {
    ctx.strokeStyle = 'rgba(192,57,43,0.7)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(toX(seq.length - 1), toY(seq[seq.length - 1]));
    ctx.lineTo(toX(seq.length), toY(valores[0]));
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Pontos conhecidos (dourados)
  for (let i = 0; i < seq.length; i++) {
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(toX(i), toY(seq[i]), 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#9a7000';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Ponto previsto (vermelho pulsante)
  if (valores.length > 0) {
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.arc(toX(seq.length), toY(valores[0]), 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7a0000';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // "?" sobre o ponto
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('?', toX(seq.length), toY(valores[0]) - 10);
  }
}

/**
 * Desenha o gráfico do histórico de todas as partidas.
 */
function desenharGraficoHistorico() {
  const canvas = document.getElementById('historico-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);

  const registros = estado.registros;
  if (registros.length === 0) return;

  const paddingX = 30;
  const paddingY = 20;
  const areaW = W - paddingX * 2;
  const areaH = H - paddingY * 2;

  // Pontuação acumulada ao longo das câmaras
  const pontosPorCamara = [];
  let acum = 0;
  for (const r of registros) {
    acum += r.pontosGanhos || 0;
    pontosPorCamara.push(acum);
  }

  const maxPontos = Math.max(...pontosPorCamara, 1);
  const toX = i => paddingX + (i / Math.max(registros.length - 1, 1)) * areaW;
  const toY = v => paddingY + areaH - (v / maxPontos) * areaH;

  // Eixo X
  ctx.strokeStyle = 'rgba(154,112,0,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(paddingX, H - paddingY);
  ctx.lineTo(W - paddingX, H - paddingY);
  ctx.stroke();

  // Linha de progressão
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < pontosPorCamara.length; i++) {
    const x = toX(i);
    const y = toY(pontosPorCamara[i]);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Pontos com cores por tipo
  const cores = { PA: '#ffd700', PG: '#00e878', POLI: '#c0392b' };
  for (let i = 0; i < registros.length; i++) {
    const cor = cores[registros[i].tipo] || '#a8a8c0';
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.arc(toX(i), toY(pontosPorCamara[i]), 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Legenda
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'left';
  let legendaX = paddingX;
  for (const [label, cor] of Object.entries(cores)) {
    ctx.fillStyle = cor;
    ctx.fillRect(legendaX, 6, 10, 10);
    ctx.fillStyle = '#a8a8c0';
    ctx.fillText(label, legendaX + 14, 15);
    legendaX += 55;
  }
}

// ─── Renderização ─────────────────────────────────────────────────────────────

function renderizarVidas() {
  elCoracoes.innerHTML = '';
  for (let i = 0; i < VIDAS_INICIAIS; i++) {
    const span = document.createElement('span');
    span.className = 'coracao' + (i >= estado.vidas ? ' perdido' : '');
    span.textContent = '❤️';
    elCoracoes.appendChild(span);
  }
}

function renderizarPontos() {
  elPontos.textContent = formatarPontos(estado.pontos);
  elPontos.classList.remove('bump');
  void elPontos.offsetWidth;
  elPontos.classList.add('bump');
  setTimeout(() => elPontos.classList.remove('bump'), 300);
}

function renderizarCamara() {
  const camara = CAMARAS[estado.camaraAtual];

  elSalaBadge.textContent    = `CÂMARA ${estado.camaraAtual + 1} / ${CAMARAS.length}`;
  elSalaNome.textContent     = camara.nome;
  elSalaTipo.textContent     = camara.tipo;
  elSalaTipo.className       = `sala-tipo tipo-${camara.tipo.toLowerCase()}`;
  elSalaHistoria.textContent = camara.historia;

  // Tiles
  elSequencia.innerHTML = '';
  camara.sequencia.forEach((num, i) => {
    if (i > 0) {
      const seta = document.createElement('span');
      seta.className   = 'seta-sequencia';
      seta.textContent = '›';
      elSequencia.appendChild(seta);
    }
    const tile = document.createElement('div');
    tile.className          = 'tile';
    tile.style.animationDelay = `${i * 0.08}s`;
    tile.textContent        = num;
    elSequencia.appendChild(tile);
  });

  // Gráfico
  desenharGrafico(camara.sequencia);

  // Reset
  elInput.value          = '';
  elFeedback.textContent = '';
  elFeedback.className   = 'feedback';
  estado.tentativas      = 0;
  estado.dicaUsada       = false;
  elBtnDica.disabled     = false;

  renderizarVidas();
  elPontos.textContent = formatarPontos(estado.pontos);
  elInput.focus();
}

// ─── Lógica do jogo ───────────────────────────────────────────────────────────

function iniciarJogo() {
  estado = criarEstado();
  Engine.limparHistorico();
  mostrarTela(elTelaJogo);
  renderizarCamara();
}

function processarResposta() {
  const texto = elInput.value.trim();
  if (texto === '') { mostrarFeedback('Digite um número!', 'dica'); return; }

  const resposta = parseFloat(texto);
  if (isNaN(resposta)) { mostrarFeedback('Número inválido!', 'dica'); return; }

  const camara  = CAMARAS[estado.camaraAtual];
  const { valores, analise } = Engine.preverProximos(camara.sequencia);
  const correta = valores[0];

  estado.tentativas++;

  if (Engine.aproxIgual(resposta, correta)) {
    // ── Acerto ──
    let bonus = 0;
    if (estado.tentativas === 1 && !estado.dicaUsada) bonus += BONUS_PRIMEIRA;
    if (camara.tipo === 'PG')   bonus += BONUS_PG;
    if (camara.tipo === 'POLI') bonus += BONUS_POLI;
    const pontosGanhos = PONTOS_BASE + bonus;
    estado.pontos += pontosGanhos;

    somAcerto();
    flashTela('flash-correto');
    mostrarFeedback(`✦ CORRETO! +${pontosGanhos} pts | ${analise.formula}`, 'correto');
    renderizarPontos();

    // Registra no histórico
    Engine.registrarNoHistorico(camara.sequencia, analise, correta);
    estado.registros.push({
      tipo:         camara.tipo,
      nome:         camara.nome,
      sequencia:    camara.sequencia,
      resposta:     correta,
      tentativas:   estado.tentativas,
      acertou:      true,
      pontosGanhos: pontosGanhos,
    });

    setTimeout(() => {
      estado.camaraAtual++;
      if (estado.camaraAtual >= CAMARAS.length) {
        encerrarVitoria();
      } else {
        renderizarCamara();
      }
    }, 1600);

  } else {
    // ── Erro ──
    estado.vidas--;
    somErro();
    flashTela('flash-errado');
    renderizarVidas();
    elInput.value = '';

    if (estado.vidas <= 0) {
      estado.registros.push({
        tipo: camara.tipo, nome: camara.nome, sequencia: camara.sequencia,
        resposta: null, tentativas: estado.tentativas, acertou: false, pontosGanhos: 0,
      });
      mostrarFeedback(`✝ O selo permanece intacto... Resposta: ${correta}`, 'errado');
      setTimeout(encerrarGameOver, 1600);
    } else {
      const direcao = resposta < correta ? '▲ Tente um número maior' : '▼ Tente um número menor';
      mostrarFeedback(`✝ Errado! ${direcao}`, 'errado');
    }
  }
}

function usarDica() {
  if (estado.dicaUsada) return;
  estado.dicaUsada   = true;
  elBtnDica.disabled = true;
  somDica();

  const camara  = CAMARAS[estado.camaraAtual];
  const analise = Engine.analisarSequencia(camara.sequencia);

  let texto = '';
  if (analise.tipo === 'aritmetica') {
    const sinal = analise.diferenca >= 0 ? '+' : '';
    texto = `💡 PA: diferença constante = ${sinal}${analise.diferenca}`;
  } else if (analise.tipo === 'geometrica') {
    texto = `💡 PG: razão constante = ${analise.razao}`;
  } else if (analise.tipo === 'polinomial') {
    texto = `💡 Polinomial grau ${analise.grau}: ${analise.formula}`;
  } else {
    texto = '💡 Observe a relação entre termos consecutivos.';
  }

  mostrarFeedback(texto, 'dica');
}

function mostrarFeedback(texto, tipo) {
  elFeedback.textContent = texto;
  elFeedback.className   = `feedback ${tipo}`;
}

function flashTela(classe) {
  elConteudoSup.classList.remove('flash-correto', 'flash-errado');
  void elConteudoSup.offsetWidth;
  elConteudoSup.classList.add(classe);
  setTimeout(() => elConteudoSup.classList.remove(classe), 420);
}

function encerrarGameOver() {
  somGameOver();
  elGameOverPontos.textContent = formatarPontos(estado.pontos);
  mostrarTela(elTelaGameOver);
}

function encerrarVitoria() {
  somVitoria();
  elVitoriaPontos.textContent = formatarPontos(estado.pontos);
  mostrarTela(elTelaVitoria);
}

// ─── Histórico ────────────────────────────────────────────────────────────────

function mostrarHistorico() {
  mostrarTela(elTelaHistorico);

  const stats = Engine.estatisticasHistorico();
  const elStats = document.getElementById('historico-stats');
  const acertos = estado.registros.filter(r => r.acertou).length;

  elStats.innerHTML = `
    <div class="stat-card">
      <div class="stat-valor">${estado.registros.length}</div>
      <div class="stat-rotulo">Câmaras</div>
    </div>
    <div class="stat-card">
      <div class="stat-valor">${acertos}</div>
      <div class="stat-rotulo">Acertos</div>
    </div>
    <div class="stat-card">
      <div class="stat-valor">${formatarPontos(estado.pontos)}</div>
      <div class="stat-rotulo">Pontos</div>
    </div>
    <div class="stat-card">
      <div class="stat-valor">${stats.porTipo.aritmetica || 0} / ${stats.porTipo.geometrica || 0} / ${stats.porTipo.polinomial || 0}</div>
      <div class="stat-rotulo">PA / PG / Poli</div>
    </div>
  `;

  // Lista de registros
  const elLista = document.getElementById('historico-lista');
  elLista.innerHTML = '';

  estado.registros.forEach((r, i) => {
    const el = document.createElement('div');
    el.className = `historico-item ${r.acertou ? 'item-acerto' : 'item-erro'}`;
    el.innerHTML = `
      <span class="historico-item-num">#${i + 1}</span>
      <span class="historico-item-tipo tipo-${r.tipo.toLowerCase()}">${r.tipo}</span>
      <span class="historico-item-seq">[${r.sequencia.join(', ')}]</span>
      <span class="historico-item-resultado">${r.acertou ? '✅ ' + r.resposta : '❌'}</span>
      <span class="historico-item-pts">+${r.pontosGanhos}</span>
    `;
    elLista.appendChild(el);
  });

  // Gráfico do histórico
  desenharGraficoHistorico();
}

// ─── Event listeners ──────────────────────────────────────────────────────────

document.getElementById('btn-iniciar').addEventListener('click', iniciarJogo);
document.getElementById('btn-reiniciar').addEventListener('click', iniciarJogo);
document.getElementById('btn-jogar-novamente').addEventListener('click', iniciarJogo);
document.getElementById('btn-ver-historico').addEventListener('click', mostrarHistorico);
document.getElementById('btn-voltar-titulo').addEventListener('click', () => mostrarTela(elTelaTitulo));

elBtnEnviar.addEventListener('click', processarResposta);
elBtnDica.addEventListener('click', usarDica);
elInput.addEventListener('keydown', e => { if (e.key === 'Enter') processarResposta(); });
