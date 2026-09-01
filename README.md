# OF — Ofício de Diárias

Site de um grupo de diárias administrado. MVP estático: HTML + CSS + JS puro,
sem build e sem backend. Todos os dados ficam no `localStorage` do navegador.

## Rodar

Qualquer servidor estático na raiz do projeto:

```bash
python3 -m http.server 8000
# abra http://localhost:8000
```

## Páginas

| Arquivo | O que é |
|---|---|
| `index.html` | Home: hero, diárias em destaque, sobre o site, comentários |
| `diarias.html` | Listagem com filtros (texto, tipo, cidade, faixa de valor, período, ordenação) |
| `detalhes-diaria.html?id=…` | Detalhes + formulário que abre o WhatsApp do contratante |
| `cadastrar-diaria.html` | Publicar diária (só logado) → checkout simulado |
| `login.html` / `cadastro.html` | Entrar / criar conta (o cadastro já loga) |
| `perfil.html` | Dados do usuário, edição e diárias publicadas |
| `contato.html` | Mensagem para a administradora |
| `termos.html` / `privacidade.html` | Páginas legais |
| `admin.html` | Painel da administradora (diárias, contatos, usuários, pagamentos) |

## Arquivos compartilhados

- `assets/style.css` — design system (cores, tipografia, componentes, modal)
- `assets/app.js` — API única em `window.OF`:
  - **Sessão:** `login`, `cadastrar` (abre a sessão automaticamente), `sair`,
    `sessao`, `usuarioAtual`, `atualizarUsuario`, `podePublicar`
  - **Diárias:** `diarias`, `diaria(id)`, `criarDiaria`, `removerDiaria`, `cardDiaria`
  - **Registros:** `registrarContato`, `registrarMensagem`, `pagamentos`
  - **Checkout:** `OF.pagamento.abrir({ titulo, descricao, itens, onPago, onSucesso, onCancelar })`
  - **Layout:** header e footer são injetados nos `<div id="of-header">` /
    `<div id="of-footer">` de cada página; `<body data-pagina="…">` marca o link ativo.

## Regras de negócio

### Valores

Cada diária tem dois valores separados (`OF.resumoValores(valorLivre)`):

| | O que é | Quem paga | Passa pelo site? |
|---|---|---|---|
| **Valor livre** | o que a diarista recebe limpo | contratante → diarista | não |
| **Taxa OF** | intermediação, somada por cima | contratante → site | sim, no checkout |

- **Taxa:** R$ 20 fixos para valor livre de até R$ 150; acima disso, 10% do valor
  livre com mínimo de R$ 10 (`OF.taxa`).
- O checkout cobra **somente a taxa**. Custos da operadora de pagamento saem da
  parte do site — não são repassados nem ao contratante nem à diarista.
- Exemplo: valor livre R$ 150 → taxa R$ 20 → custo total R$ 170, dos quais
  R$ 150 vão integralmente à diarista e R$ 20 são pagos no site.

> ⚠️ **Degrau conhecido na regra:** como a faixa fixa é R$ 20 e a de cima é 10%,
> a taxa *cai* ao passar de R$ 150 (R$ 151 → R$ 15,10) e só volta a R$ 20 em
> R$ 200. Para eliminar isso, trocar em `assets/app.js`:
> `return v <= 150 ? 20 : Math.max(10, v * 0.10);` por
> `return Math.max(20, v * 0.10);`

### Duração

Número + unidade (`horas` ou `dias`). Gravada em `durQtd` + `durUnidade` e também
formatada em `dur` para exibição (`OF.formatarDuracao` — cuida do singular/plural:
`1 hora`, `8 horas`, `1 dia`, `2 dias`). Limites: até 24 horas ou até 60 dias.

### Contas

- **Publicar exige conta** com perfil *Contratante* ou *ambos*.
- **Ver e contatar não exige conta.**
- A diária só entra no ar **depois** do pagamento aprovado.

## Chaves no localStorage

`diarias_users`, `diarias_logged`, `diarias_vagas`, `diarias_contatos`,
`diarias_mensagens`, `diarias_pagamentos`, `diarias_seed`, `diarias_cookies`.

Conta de demonstração da administradora: **admin / admin**.

## Pagamento é simulado

PIX, cartão de crédito e cartão de débito são uma **demonstração**: nada é cobrado,
nenhum dado sai do navegador. O número completo do cartão e o CVV **não são gravados** —
só a bandeira, os 4 últimos dígitos e o nome digitado. Trocar por um provedor real
(Mercado Pago, Stripe, Pagar.me) significa substituir o módulo `pagamento` em
`assets/app.js` e passar a validar do lado do servidor.
