# Câmara do Eco — A Maldição dos Números

Motor de análise de sequências numéricas com interface web temática (Castlevania DS).
Detecta automaticamente **PA**, **PG** e **sequências polinomiais** (até grau 10) usando
diferenças finitas e interpolação de Newton.

## Pré-requisitos

- [Node.js](https://nodejs.org/) v14+ (para CLI e testes)
- Navegador moderno (para o jogo web)
- **Nenhuma dependência externa** — 100% offline

## Como executar

```bash
cd CopilotAdventures/echo-chamber

# Interface Web (jogo)
start game.html          # Windows
open game.html           # macOS

# CLI original
node index.js

# Testes automatizados (63 asserções)
node tests.js
```

## Funcionalidades

| Recurso | Descrição |
|---|---|
| **Motor de Análise** | Detecta PA, PG e Polinomial automaticamente |
| **Previsão** | Prevê N próximos valores de qualquer sequência |
| **12 Câmaras** | 4 PA + 4 PG + 4 Polinomiais com dificuldade crescente |
| **Visualização** | Gráfico Canvas da sequência em tempo real |
| **Histórico** | Registro de todas as tentativas com estatísticas |
| **Áudio** | Efeitos sonoros chiptune (Web Audio API) |
| **Documentação** | Página completa com fórmulas e explicações |

## Estrutura do projeto

```
echo-chamber/
├── engine.js    ← Motor de análise (compartilhado Node + Browser)
├── game.html    ← Interface web (jogo temático)
├── game.css     ← Estilos visuais (tema gótico)
├── game.js      ← Lógica do jogo web
├── docs.html    ← Documentação matemática completa
├── tests.js     ← Suíte de testes (63 asserções)
├── index.js     ← CLI original (demonstração PA)
└── README.md    ← Este arquivo
```

## Tipos de sequência suportados

### Progressão Aritmética (PA)
| Sequência | d | Próximo |
|---|---|---|
| `[2, 4, 6, 8]` | +2 | 10 |
| `[30, 24, 18, 12]` | -6 | 6 |

### Progressão Geométrica (PG)
| Sequência | q | Próximo |
|---|---|---|
| `[3, 6, 12, 24]` | 2 | 48 |
| `[256, 128, 64, 32]` | 0.5 | 16 |

### Polinomial
| Sequência | Grau | Próximo |
|---|---|---|
| `[1, 4, 9, 16, 25]` | 2 (n²) | 36 |
| `[1, 8, 27, 64, 125]` | 3 (n³) | 216 |

## API do Motor

```javascript
const Engine = require('./engine.js');

// Analisar sequência
const analise = Engine.analisarSequencia([1, 4, 9, 16, 25]);
// → { tipo: 'polinomial', grau: 2, ... }

// Prever próximos valores
const resultado = Engine.preverProximos([3, 6, 12, 24], 3);
// → { valores: [48, 96, 192], analise: {...} }
```

## Testes

63 testes cobrindo 7 categorias: PA, PG, Polinomial, Validação, Utilitários, Histórico e Desempenho.

```bash
node tests.js
# → RESULTADO: 63/63 testes passaram ✅
```
