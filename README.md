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

- **Taxa de intermediação:** R$ 20 fixos para serviços de até R$ 150; acima disso,
  10% do valor com mínimo de R$ 10 (`OF.taxa`).
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
