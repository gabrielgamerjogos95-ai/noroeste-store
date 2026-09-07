# Noroeste Roleplay Store

Loja editável para VIPs, carros, coins e outros produtos da Noroeste Roleplay, com Checkout Pro do Mercado Pago, webhook e painel `/admin`.

## 1. Instalar

Você precisa do Node.js 20+.

```bash
npm install
cp .env.example .env
```

No Windows, crie uma cópia de `.env.example`, renomeie para `.env` e edite no Bloco de Notas ou VS Code.

## 2. Preencher o `.env`

Preencha principalmente:

- `BASE_URL`: endereço público HTTPS da loja em produção.
- `ADMIN_EMAIL` e `ADMIN_PASSWORD`: login do painel.
- `SESSION_SECRET`: uma frase/chave longa e aleatória.
- `MP_ACCESS_TOKEN`: credencial privada do Mercado Pago.
- `MP_WEBHOOK_SECRET`: chave secreta de validação de Webhooks.
- `DISCORD_URL`: convite da Noroeste.

**Nunca coloque `MP_ACCESS_TOKEN` no JavaScript do navegador nem envie o `.env` ao GitHub.**

## 3. Rodar no seu PC

```bash
npm run dev
```

Abra:

- Loja: http://localhost:3000
- Admin: http://localhost:3000/admin

O checkout real só funciona corretamente com credenciais válidas. Webhooks precisam de uma URL pública HTTPS; para testes locais, use um túnel HTTPS ou publique a aplicação.

## 4. Mercado Pago

1. Entre em Mercado Pago Developers.
2. Vá em **Suas integrações** e crie/abra sua aplicação de **Pagamentos online > Checkout Pro**.
3. Copie o **Access Token** para `MP_ACCESS_TOKEN`.
4. Em **Webhooks**, configure o evento de **Pagamentos** e use `https://SEU-DOMINIO.com/api/mercadopago/webhook`.
5. Copie a chave secreta do Webhook para `MP_WEBHOOK_SECRET`.
6. Para o Pix aparecer no Checkout Pro, cadastre uma chave Pix na sua conta Mercado Pago.

## 5. Editar produtos sem programar

Entre em `/admin`. Você poderá:

- criar/excluir produtos;
- mudar preço, descrição, categoria e imagem;
- acompanhar pedidos e faturamento aprovado;
- alterar título, subtítulo, mensagem de entrega e cor do site.

Os dados ficam em `data/db.json`. Faça backup desse arquivo.

## 6. Como o pagamento funciona

1. Cliente escolhe os itens e informa seus dados.
2. O backend cria um pedido local com um `external_reference` único.
3. O backend cria uma nova preferência no Mercado Pago.
4. O cliente é redirecionado ao `init_point` do Checkout Pro.
5. Mercado Pago envia o evento ao webhook.
6. A aplicação valida a assinatura do webhook, consulta o pagamento pelo ID e atualiza o pedido.
7. Somente um pagamento realmente `approved` vira pedido `paid`.

## 7. Hospedar

É um app Node/Express. Você pode publicar em qualquer hospedagem que suporte Node.js e HTTPS. Defina as mesmas variáveis do `.env` nas configurações da hospedagem e altere `BASE_URL` para seu domínio final.

### Importante para produção

Esta V1 usa JSON local e o armazenamento padrão de sessão do Express para ser simples de editar. Para alto volume ou múltiplas instâncias, migre pedidos/produtos para PostgreSQL/MySQL e use Redis ou outro session store persistente.


## Catálogo incluído
Esta versão já vem com 50 produtos de exemplo divididos em VIP, Carros, Motos, Coins, Casas e Extras. Todos podem ser alterados ou excluídos pelo painel /admin.

## Visual V3 — modelo Noroeste
A página inicial foi refeita em HTML/CSS para ficar no modelo cinematográfico preto/vermelho aprovado: hero com logo, quatro cards VIP (Bronze, Prata, Ouro e Diamante), categorias, busca, catálogo completo e carrinho. Os cards VIP **não são imagens**: são elementos editáveis em `views/index.ejs` e `public/css/style.css`.
