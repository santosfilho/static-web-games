/**
 * Echo Chamber - Preditor Mágico de Sequências Numéricas
 *
 * História:
 * No coração da Floresta Encantada existe a Câmara do Eco, uma caverna mística
 * onde os números sussurram seus segredos. A câmara guarda em memória cada
 * sequência já pronunciada em voz alta — esses são seus "ecos". Um viajante
 * sábio que compreende o padrão de uma progressão aritmética pode pedir à
 * câmara que revele o próximo número da sequência.
 *
 * Sua missão: decifre os ecos da câmara e preveja o que vem a seguir.
 *
 * Uso:
 *   node index.js
 */

'use strict';

// ─── Memória da Câmara do Eco ───────────────────────────────────────────────

/**
 * A câmara armazena cada sequência processada como uma "memória".
 * Cada objeto de memória possui a seguinte estrutura:
 *   { sequence: number[], prediction: number, commonDifference: number }
 *
 * @type {Array<{ sequence: number[], prediction: number, commonDifference: number }>}
 */
const echoMemories = [];

// ─── Lógica Principal ───────────────────────────────────────────────────────

/**
 * Valida se o array fornecido é uma progressão aritmética válida.
 *
 * Uma progressão aritmética exige:
 *  - Pelo menos 2 elementos
 *  - Todos os elementos devem ser números finitos
 *  - Uma diferença constante entre elementos consecutivos
 *
 * @param {number[]} sequence - A sequência a ser validada.
 * @returns {{ valid: boolean, reason?: string, commonDifference?: number }}
 */
function validateArithmeticProgression(sequence) {
  if (!Array.isArray(sequence) || sequence.length < 2) {
    return { valid: false, reason: 'A sequência deve ser um array com pelo menos 2 elementos.' };
  }

  for (const item of sequence) {
    if (typeof item !== 'number' || !Number.isFinite(item)) {
      return { valid: false, reason: `Todos os elementos devem ser números finitos. Encontrado: ${item}` };
    }
  }

  const commonDifference = sequence[1] - sequence[0];

  for (let i = 2; i < sequence.length; i++) {
    const diff = sequence[i] - sequence[i - 1];
    // Usa um epsilon pequeno para lidar com imprecisões de ponto flutuante
    if (Math.abs(diff - commonDifference) > 1e-10) {
      return {
        valid: false,
        reason: `Não é uma progressão aritmética. Diferença esperada: ${commonDifference} entre todos os termos, mas encontrada ${diff} entre os termos nos índices ${i - 1} e ${i}.`,
      };
    }
  }

  return { valid: true, commonDifference };
}

/**
 * Prevê o próximo número de uma progressão aritmética.
 *
 * @param {number[]} sequence - Uma progressão aritmética válida.
 * @returns {{ prediction: number, commonDifference: number }}
 */
function predictNext(sequence) {
  const validation = validateArithmeticProgression(sequence);

  if (!validation.valid) {
    throw new Error(`Sequência inválida: ${validation.reason}`);
  }

  const { commonDifference } = validation;
  const prediction = sequence[sequence.length - 1] + commonDifference;

  return { prediction, commonDifference };
}

/**
 * Processa uma sequência pela Câmara do Eco:
 *  1. Valida a sequência
 *  2. Prevê o próximo número
 *  3. Armazena o resultado em echoMemories
 *
 * @param {number[]} sequence - A sequência a ser ecoada.
 * @returns {{ prediction: number, commonDifference: number }}
 */
function echoSequence(sequence) {
  const result = predictNext(sequence);

  // Armazena este eco como uma memória na câmara
  echoMemories.push({
    sequence: [...sequence],
    prediction: result.prediction,
    commonDifference: result.commonDifference,
  });

  return result;
}

// ─── Funções de Exibição ────────────────────────────────────────────────────

/**
 * Formata um array de números como uma string entre colchetes separada por vírgulas.
 * Ex.: [3, 6, 9, 12]
 *
 * @param {number[]} arr
 * @returns {string}
 */
function formatSequence(arr) {
  return `[${arr.join(', ')}]`;
}

/**
 * Exibe a introdução da história da câmara no console.
 */
function printIntro() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║              ✨  THE ECHO CHAMBER  ✨                    ║');
  console.log('║        Magical Number Sequence Predictor                 ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('  Deep within the Enchanted Forest lies the Echo Chamber,');
  console.log('  a mystical cavern where numbers whisper their secrets.');
  console.log('  Speak a sequence, and the chamber will echo back the next');
  console.log('  number in the pattern — if you have found the true rhythm.');
  console.log('');
  console.log('──────────────────────────────────────────────────────────');
}

/**
 * Exibe o resultado de um único eco no console.
 *
 * @param {number[]} sequence
 * @param {number} prediction
 * @param {number} commonDifference
 * @param {boolean} [isError]
 * @param {string} [errorMessage]
 */
function printEchoResult(sequence, prediction, commonDifference, isError = false, errorMessage = '') {
  if (isError) {
    console.log(`  Sequência : ${formatSequence(sequence)}`);
    console.log(`  ❌ A câmara rejeita esta sequência.`);
    console.log(`     Motivo  : ${errorMessage}`);
  } else {
    console.log(`  Sequência          : ${formatSequence(sequence)}`);
    console.log(`  Diferença comum    : ${commonDifference}`);
    console.log(`  ✅ Próximo número  : ${prediction}`);
  }
  console.log('');
}

/**
 * Exibe todas as memórias armazenadas na câmara.
 */
function printMemories() {
  console.log('──────────────────────────────────────────────────────────');
  console.log('  📜  Memórias da Câmara do Eco (todas as sequências processadas):');
  console.log('');

  if (echoMemories.length === 0) {
    console.log('  (nenhuma memória ainda)');
  } else {
    echoMemories.forEach((memory, index) => {
      console.log(
        `  [${index + 1}] ${formatSequence(memory.sequence)} → next: ${memory.prediction}  (d=${memory.commonDifference})`
      );
    });
  }

  console.log('');
}

// ─── Casos de Teste ─────────────────────────────────────────────────────────

/**
 * Executa todos os casos de teste contra a Câmara do Eco.
 *
 * Cada caso de teste é um objeto:
 *   { label: string, sequence: number[], expectError?: boolean }
 */
function runTests() {
  const testCases = [
    // --- Sequência de exemplo fornecida ---
    {
      label: 'Sequência de exemplo (deve prever 15)',
      sequence: [3, 6, 9, 12],
    },

    // --- Progressões aritméticas adicionais ---
    {
      label: 'Diferença de 2 em 2 (2, 4, 6, 8 → 10)',
      sequence: [2, 4, 6, 8],
    },
    {
      label: 'Diferença comum negativa (20, 15, 10, 5 → 0)',
      sequence: [20, 15, 10, 5],
    },
    {
      label: 'Passos decimais (1.5, 3.0, 4.5, 6.0 → 7.5)',
      sequence: [1.5, 3.0, 4.5, 6.0],
    },
    {
      label: 'Números grandes (100, 200, 300 → 400)',
      sequence: [100, 200, 300],
    },
    {
      label: 'Sequência com dois elementos (7, 14 → 21)',
      sequence: [7, 14],
    },
    {
      label: 'Diferença zero / sequência constante (5, 5, 5 → 5)',
      sequence: [5, 5, 5],
    },
    {
      label: 'Números negativos (-9, -6, -3 → 0)',
      sequence: [-9, -6, -3],
    },

    // --- Casos de erro ---
    {
      label: 'Não é uma progressão aritmética (deve gerar erro)',
      sequence: [1, 2, 4, 8],
      expectError: true,
    },
    {
      label: 'Elemento único (deve gerar erro)',
      sequence: [42],
      expectError: true,
    },
    {
      label: 'Array vazio (deve gerar erro)',
      sequence: [],
      expectError: true,
    },
    {
      label: 'Contém valor não finito (deve gerar erro)',
      sequence: [1, 2, Infinity],
      expectError: true,
    },
  ];

  printIntro();

  testCases.forEach(({ label, sequence, expectError }) => {
    console.log(`  🔮 ${label}`);

    try {
      const { prediction, commonDifference } = echoSequence(sequence);

      if (expectError) {
        // Era esperado um erro, mas a câmara aceitou a sequência — sinaliza o problema
        console.log(`  ⚠️  Era esperado um erro, mas a câmara aceitou a sequência.`);
        console.log(`      Previsto: ${prediction}`);
        console.log('');
      } else {
        printEchoResult(sequence, prediction, commonDifference);
      }
    } catch (err) {
      if (expectError) {
        // Erro esperado — comportamento correto
        console.log(`  ✅ Corretamente rejeitado.`);
        console.log(`     Motivo : ${err.message}`);
        console.log('');
      } else {
        // Erro inesperado
        printEchoResult(sequence, null, null, true, err.message);
      }
    }
  });

  printMemories();
}

// ─── Ponto de Entrada ───────────────────────────────────────────────────────

runTests();
