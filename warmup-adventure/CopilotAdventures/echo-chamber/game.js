'use strict';

/* ═══════════════════════════════════════════════════════════════
   game.js — Câmara do Eco: A Maldição dos Números
   Lógica do jogo e áudio chiptune retrô
   ═══════════════════════════════════════════════════════════════ */

// ─── Dados das câmaras ────────────────────────────────────────────────────────

/**
 * Cada câmara possui:
 *  - nome      : título exibido na tela superior
 *  - historia  : texto narrativo
 *  - sequencia : progressão aritmética a ser resolvida
 */
const CAMARAS = [
  {
    nome: 'SALA DA ENTRADA',
    historia: 'Uma grade de ferro feitiçada bloqueia a passagem principal. O selo se romperá ao completar a sequência.',
    sequencia: [2, 4, 6, 8],
  },
  {
    nome: 'CRIPTA SOMBRIA',
    historia: 'Esqueletos repousam em nichos de pedra negra. Um portal rúnico exige o próximo número para abrir caminho.',
    sequencia: [5, 10, 15, 20],
  },
  {
    nome: 'TORRE DO RELÓGIO',
    historia: 'Engrenagens giram em ritmo constante. O sino do mal ressoa — o padrão deve ser decifrado.',
    sequencia: [3, 6, 9, 12],
  },
  {
    nome: 'CÂMARA DAS ALMAS',
    historia: 'Almas presas gemem ao redor. A energia diminui a cada eco. Qual é o próximo valor da queda?',
    sequencia: [10, 7, 4, 1],
  },
  {
    nome: 'BIBLIOTECA PROIBIDA',
    historia: 'Grimórios flutuam no ar sombrio. Os fragmentos numéricos revelam uma progressão sutil.',
    sequencia: [1.5, 3, 4.5, 6],
  },
  {
    nome: 'SALÃO DOS MONSTROS',
    historia: 'Vampiros dançam em círculos de poder decrescente. Cada passo os enfraquece em igual medida.',
    sequencia: [100, 90, 80, 70],
  },
  {
    nome: 'TRONO SOMBRIO',
    historia: 'O guardião do trono aguarda. Os números sobem das profundezas. Qual o próximo valor?',
    sequencia: [-15, -10, -5, 0],
  },
  {
    nome: 'CÂMARA DE DRÁCULA',
    historia: 'O próprio Drácula impede sua passagem! Um último selo separa você da vitória eterna!',
    sequencia: [7, 14, 21, 28],
  },
];

const VIDAS_INICIAIS = 3;
const PONTOS_BASE    = 100; // pontos por acerto
const BONUS_PRIMEIRA = 50;  // bônus por acertar de primeira sem usar dica

// ─── Áudio chiptune ──────────────────────────────────────────────────────────

/** @type {AudioContext|null} */
let audioCtx = null;

/** Retorna (ou cria) o AudioContext de forma lazy, após interação do usuário. */
function obterAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

/**
 * Toca um beep simples no estilo chiptune.
 *
 * @param {number} freq     - Frequência em Hz
 * @param {number} duracao  - Duração em segundos
 * @param {'square'|'sawtooth'|'sine'|'triangle'} tipo - Forma de onda
 * @param {number} volume   - Volume de 0 a 1
 */
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
  } catch (_) { /* Áudio indisponível — ignora silenciosamente */ }
}

/** Som de acerto (arpejo ascendente). */
function somAcerto() {
  tocarBeep(523, 0.08);
  setTimeout(() => tocarBeep(659, 0.08), 90);
  setTimeout(() => tocarBeep(784, 0.16), 180);
}

/** Som de erro (descida sawtooth). */
function somErro() {
  tocarBeep(260, 0.08, 'sawtooth');
  setTimeout(() => tocarBeep(220, 0.18, 'sawtooth'), 90);
}

/** Fanfare de vitória. */
function somVitoria() {
  const notas = [523, 659, 784, 1047];
  notas.forEach((f, i) => setTimeout(() => tocarBeep(f, 0.22, 'square', 0.1), i * 110));
}

/** Melodia sombria de game over. */
function somGameOver() {
  const notas = [392, 330, 262, 196];
  notas.forEach((f, i) => setTimeout(() => tocarBeep(f, 0.25, 'sawtooth', 0.1), i * 130));
}

/** Beep suave de dica. */
function somDica() {
  tocarBeep(440, 0.12, 'sine', 0.06);
}

// ─── Lógica de progressão aritmética ─────────────────────────────────────────

/**
 * Valida se um array é uma progressão aritmética válida.
 *
 * @param {number[]} seq
 * @returns {{ valida: boolean, motivo?: string, diferenca?: number }}
 */
function validarProgressao(seq) {
  if (!Array.isArray(seq) || seq.length < 2) {
    return { valida: false, motivo: 'A sequência precisa de pelo menos 2 elementos.' };
  }
  const diferenca = seq[1] - seq[0];
  for (let i = 2; i < seq.length; i++) {
    if (Math.abs((seq[i] - seq[i - 1]) - diferenca) > 1e-10) {
      return { valida: false, motivo: 'Não é uma progressão aritmética.' };
    }
  }
  return { valida: true, diferenca };
}

/**
 * Retorna o próximo número de uma progressão aritmética válida.
 *
 * @param {number[]} seq
 * @returns {number}
 */
function preverProximo(seq) {
  const { diferenca } = validarProgressao(seq);
  return seq[seq.length - 1] + diferenca;
}

// ─── Estado do jogo ───────────────────────────────────────────────────────────

/** Cria um estado de jogo limpo. */
function criarEstado() {
  return {
    camaraAtual: 0,
    vidas:       VIDAS_INICIAIS,
    pontos:      0,
    tentativas:  0,    // tentativas na câmara atual
    dicaUsada:   false,
  };
}

let estado = criarEstado();

// ─── Referências ao DOM ───────────────────────────────────────────────────────

const elTelaTitulo   = document.getElementById('tela-titulo');
const elTelaJogo     = document.getElementById('tela-jogo');
const elTelaGameOver = document.getElementById('tela-gameover');
const elTelaVitoria  = document.getElementById('tela-vitoria');

const elCoracoes     = document.getElementById('coracoes-display');
const elSalaBadge    = document.getElementById('sala-badge');
const elSalaNome     = document.getElementById('sala-nome');
const elSalaHistoria = document.getElementById('sala-historia');
const elSequencia    = document.getElementById('sequencia-display');
const elPontos       = document.getElementById('pontos-display');
const elFeedback     = document.getElementById('feedback');
const elInput        = document.getElementById('input-resposta');
const elBtnEnviar    = document.getElementById('btn-enviar');
const elBtnDica      = document.getElementById('btn-dica');
const elConteudoSup  = document.getElementById('conteudo-superior');

const elGameOverPontos = document.getElementById('gameover-pontos');
const elVitoriaPontos  = document.getElementById('vitoria-pontos');

// ─── Utilitários ─────────────────────────────────────────────────────────────

/**
 * Ativa uma tela e desativa todas as demais.
 *
 * @param {HTMLElement} tela
 */
function mostrarTela(tela) {
  [elTelaTitulo, elTelaJogo, elTelaGameOver, elTelaVitoria].forEach(t => {
    t.classList.remove('ativa');
  });
  tela.classList.add('ativa');
}

/**
 * Formata um número como string com 5 dígitos e zeros à esquerda.
 *
 * @param {number} n
 * @returns {string}
 */
function formatarPontos(n) {
  return String(Math.max(0, Math.floor(n))).padStart(5, '0');
}

// ─── Renderização ─────────────────────────────────────────────────────────────

/** Atualiza os ícones de coração no HUD. */
function renderizarVidas() {
  elCoracoes.innerHTML = '';
  for (let i = 0; i < VIDAS_INICIAIS; i++) {
    const span = document.createElement('span');
    span.className = 'coracao' + (i >= estado.vidas ? ' perdido' : '');
    span.textContent = '❤️';
    elCoracoes.appendChild(span);
  }
}

/** Atualiza o contador de pontos com animação de "bump". */
function renderizarPontos() {
  elPontos.textContent = formatarPontos(estado.pontos);
  elPontos.classList.remove('bump');
  void elPontos.offsetWidth; // força reflow para reiniciar a animação
  elPontos.classList.add('bump');
  setTimeout(() => elPontos.classList.remove('bump'), 300);
}

/** Renderiza a câmara atual: badge, nome, história e sequência. */
function renderizarCamara() {
  const camara = CAMARAS[estado.camaraAtual];

  elSalaBadge.textContent    = `CÂMARA ${estado.camaraAtual + 1} / ${CAMARAS.length}`;
  elSalaNome.textContent     = camara.nome;
  elSalaHistoria.textContent = camara.historia;

  // Constrói os tiles da sequência com animação em cascata
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

  // Restaura o estado de input e feedback
  elInput.value              = '';
  elFeedback.textContent     = '';
  elFeedback.className       = 'feedback';
  estado.tentativas          = 0;
  estado.dicaUsada           = false;
  elBtnDica.disabled         = false;

  renderizarVidas();
  elPontos.textContent = formatarPontos(estado.pontos);
  elInput.focus();
}

// ─── Lógica do jogo ───────────────────────────────────────────────────────────

/** Inicia (ou reinicia) o jogo do zero. */
function iniciarJogo() {
  estado = criarEstado();
  mostrarTela(elTelaJogo);
  renderizarCamara();
}

/** Processa a resposta enviada pelo jogador. */
function processarResposta() {
  const texto = elInput.value.trim();

  if (texto === '') {
    mostrarFeedback('Digite um número!', 'dica');
    return;
  }

  const resposta = parseFloat(texto);

  if (isNaN(resposta)) {
    mostrarFeedback('Número inválido!', 'dica');
    return;
  }

  const camara  = CAMARAS[estado.camaraAtual];
  const correta = preverProximo(camara.sequencia);

  estado.tentativas++;

  if (Math.abs(resposta - correta) < 1e-9) {
    // ── Resposta correta ──
    const bonus = (estado.tentativas === 1 && !estado.dicaUsada) ? BONUS_PRIMEIRA : 0;
    estado.pontos += PONTOS_BASE + bonus;

    somAcerto();
    flashTela('flash-correto');

    const msgBonus = bonus > 0 ? ' ✦ BÔNUS DE PRIMEIRA TENTATIVA!' : '';
    mostrarFeedback(`✦ CORRETO! +${PONTOS_BASE + bonus} pontos${msgBonus}`, 'correto');
    renderizarPontos();

    // Avança para a próxima câmara após uma pausa
    setTimeout(() => {
      estado.camaraAtual++;
      if (estado.camaraAtual >= CAMARAS.length) {
        encerrarVitoria();
      } else {
        renderizarCamara();
      }
    }, 1400);

  } else {
    // ── Resposta errada ──
    estado.vidas--;
    somErro();
    flashTela('flash-errado');
    renderizarVidas();
    elInput.value = '';

    if (estado.vidas <= 0) {
      mostrarFeedback('✝ Derrotado! O castelo permanece nas trevas...', 'errado');
      setTimeout(encerrarGameOver, 1600);
    } else {
      const direcao = resposta < correta
        ? '▲ Tente um número maior'
        : '▼ Tente um número menor';
      mostrarFeedback(`✝ Errado! ${direcao}`, 'errado');
    }
  }
}

/** Revela a diferença comum da sequência como dica (sem custo de pontos). */
function usarDica() {
  if (estado.dicaUsada) return;

  estado.dicaUsada  = true;
  elBtnDica.disabled = true;
  somDica();

  const camara = CAMARAS[estado.camaraAtual];
  const { diferenca } = validarProgressao(camara.sequencia);
  const sinal = diferenca >= 0 ? '+' : '';

  mostrarFeedback(`💡 Dica: a diferença entre os termos é ${sinal}${diferenca}`, 'dica');
}

/**
 * Exibe uma mensagem de feedback.
 *
 * @param {string} texto
 * @param {'correto'|'errado'|'dica'} tipo
 */
function mostrarFeedback(texto, tipo) {
  elFeedback.textContent = texto;
  elFeedback.className   = `feedback ${tipo}`;
}

/**
 * Aplica um flash colorido na tela superior do DS.
 *
 * @param {'flash-correto'|'flash-errado'} classe
 */
function flashTela(classe) {
  elConteudoSup.classList.remove('flash-correto', 'flash-errado');
  void elConteudoSup.offsetWidth; // força reflow
  elConteudoSup.classList.add(classe);
  setTimeout(() => elConteudoSup.classList.remove(classe), 420);
}

/** Exibe a tela de Game Over. */
function encerrarGameOver() {
  somGameOver();
  elGameOverPontos.textContent = formatarPontos(estado.pontos);
  mostrarTela(elTelaGameOver);
}

/** Exibe a tela de Vitória. */
function encerrarVitoria() {
  somVitoria();
  elVitoriaPontos.textContent = formatarPontos(estado.pontos);
  mostrarTela(elTelaVitoria);
}

// ─── Event listeners ──────────────────────────────────────────────────────────

document.getElementById('btn-iniciar').addEventListener('click', iniciarJogo);
document.getElementById('btn-reiniciar').addEventListener('click', iniciarJogo);
document.getElementById('btn-jogar-novamente').addEventListener('click', iniciarJogo);

elBtnEnviar.addEventListener('click', processarResposta);
elBtnDica.addEventListener('click', usarDica);

// Confirma resposta com Enter
elInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') processarResposta();
});
