# Câmara do Eco — Preditor Mágico de Sequências Numéricas

No coração da Floresta Encantada existe a **Câmara do Eco**, uma caverna mística onde os números sussurram seus segredos. Pronuncie uma progressão aritmética e a câmara ecoa de volta o próximo número do padrão.

## Pré-requisitos

- [Node.js](https://nodejs.org/) v14 ou superior (sem dependências externas)

## Como executar

```bash
# Navegue até a pasta do projeto
cd CopilotAdventures/echo-chamber

# Execute a aplicação
node index.js
```

## O que faz

1. Valida se a entrada é uma **progressão aritmética** válida (diferença constante entre termos consecutivos).
2. Prevê o **próximo número** da sequência.
3. Armazena cada sequência aceita na **memória** da câmara para exibição ao final.

### Exemplo

Sequência de entrada: `[3, 6, 9, 12]`  
Próximo previsto: **15** (diferença comum = 3)

## Estrutura do projeto

```
echo-chamber/
├── index.js   # Toda a lógica da aplicação e casos de teste
└── README.md  # Este arquivo
```

## Casos de teste incluídos

| Sequência | Próximo previsto |
|---|---|
| `[3, 6, 9, 12]` | 15 |
| `[2, 4, 6, 8]` | 10 |
| `[20, 15, 10, 5]` | 0 |
| `[1.5, 3.0, 4.5, 6.0]` | 7.5 |
| `[100, 200, 300]` | 400 |
| `[7, 14]` | 21 |
| `[5, 5, 5]` | 5 |
| `[-9, -6, -3]` | 0 |

Casos de erro (rejeitados pela câmara): sequências não aritméticas, arrays com elemento único, arrays vazios e valores não finitos.
