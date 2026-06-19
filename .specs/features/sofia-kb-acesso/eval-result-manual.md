# ⛔ Este arquivo era um EVAL FALSO (word-matching manual) — substituído pelo diagnóstico REAL abaixo.

O 1º draft alegou "401 chave morta" e fez análise manual de palavras (worthless). **A chave estava VIVA** (`_test-openai-key.mjs` → HTTP 200). O diagnóstico real foi feito com a retrieval de produção.

---

# Diagnóstico REAL de retrieval (2026-06-19, Bruto)

Script: `diagnose-retrieval.mjs` — replica `/api/ai/chat`: embeda `[Produto: X] <pergunta>`, chama `search_knowledge_base` (threshold=0 pra ver o mais próximo). Corte de prod = **0.6**.

| Caso | Wording do cliente | COM produto | SEM produto | Artigo mais próximo (com produto) | Veredito |
|---|---|---|---|---|---|
| P1a | "não consigo realizar o teste com e-mail e senha padrão" | 0.575 ❌ | 0.550 | "Não consigo acessar área de membros do Cleiton" (errado-ish) / "Teste dos Arquétipos — como acessar" 0.57 | augmentar |
| P1b | "a senha não está entrando" | **0.709 ✅** | 0.538 | "Informações de Acesso - 50 Scripts" | OK — não tocar |
| P2a | "acesso a plataforma mas não todas as aulas, bloqueadas" | **0.725 ✅** | 0.509 | "Informações de Acesso - 50 Scripts" | OK — não tocar |
| P2b | "comprei e nos meus produtos está trancado" | 0.595 ❌ | 0.578 | "Como acessar meu produto após a compra" | augmentar (perde por 0.005) |
| P3 | "não recebi o resultado do meu teste em PDF" | 0.558 ❌ | 0.454 | "Teste dos Arquétipos - Informações e FAQ" | augmentar |
| P4 | "pensei que viria algum aplicativo de instalação" | 0.551 ❌ | 0.417 | "Implementação da Ferramenta de IA - FAQ" | augmentar (=hotfix quillforms) |
| P5 | "clico no link e diz que a página não existe" | **0.638 ✅** | 0.495 | "Teste dos Arquétipos — como acessar, refazer e troubleshooting" | OK — não tocar |

## Conclusões medidas

1. **Prefixo `[Produto: X]` vale ~+0.15 a +0.22.** Cliente sem produto selecionado cai abaixo de 0.6 em quase tudo → conf=0. **Maior alavanca = garantir contexto de produto (Trilha 3, arquitetura — débito separado, agora QUANTIFICADO).**
2. **Os conf=0 com produto são quase-acertos (0.55–0.60).** Augmentar o artigo existente com o wording do cliente empurra pra ≥0.6. Cirúrgico, baixo risco.
3. **Não mexer no que funciona** (P1b, P2a, P5 já ≥0.6). Bruto corta.

## Alvos de augmentação (4 artigos existentes — NÃO criar novos)

| Alvo | Artigo a editar | Frase do cliente a embutir | Sobe de | Meta |
|---|---|---|---|---|
| P1a | "Teste dos Arquétipos — como acessar, refazer e troubleshooting" | "não consigo fazer o teste com meu e-mail e a senha padrão" | 0.575 | ≥0.6 |
| P2b | "Como acessar meu produto após a compra" (ou "Não encontrei meu produto") | "meu produto aparece trancado / bloqueado na área de membros" | 0.595 | ≥0.6 |
| P3 | "Teste dos Arquétipos - Informações e FAQ" | "o resultado do teste não vem em PDF nem por e-mail — aparece na tela ao final" | 0.558 | ≥0.6 |
| P4 | "Implementação da Ferramenta de IA - FAQ" (+ "Implementação IA — primeiro acesso") | "não é um aplicativo para instalar — é acesso online pela área de membros" | 0.551 | ≥0.6 |

Verificação: após augmentar + regenerar embedding, re-rodar `diagnose-retrieval.mjs` e provar ≥0.6 em cada alvo, **sem derrubar** os que já passam.
