# Sistema de Vendas

Aplicação web em Node.js, Express e SQLite para registrar vendas e acompanhar metas.

## Requisitos

- Node.js 20 ou superior
- npm

## Configuração local

1. Instale as dependências com `npm install`.
2. Copie `.env.example` para `.env` e defina `SESSION_SECRET` (pelo menos 32 caracteres) e `CODIGO_CADASTRO` (pelo menos 16 caracteres).
3. Inicie o servidor com `npm start` e abra `http://localhost:3000`.
4. Para criar a primeira conta administradora, defina temporariamente `ADMIN_NAME`, `ADMIN_EMAIL` e `ADMIN_PASSWORD` no `.env`, então execute `npm run create-admin`. A senha precisa ter pelo menos 12 caracteres. Remova essas variáveis após a criação.

O banco local fica em `db.sqlite` por padrão. É possível definir `DATABASE_PATH` para usar outro arquivo. Não publique o `.env` nem o banco local.

## Preparar produção

- Defina `NODE_ENV=production`, `PORT`, `SESSION_SECRET` forte, `CODIGO_CADASTRO` aleatório e `DATABASE_PATH` em um volume persistente. Cadastre cada variável diretamente no painel de segredos do provedor; nunca coloque segredos no repositório.
- Gere segredos novos para produção. Não reutilize os valores do ambiente de desenvolvimento.
- A aplicação espera que HTTPS seja terminado pelo provedor/reverse proxy. Defina `TRUST_PROXY_HOPS` com o número exato de proxies confiáveis entre a internet e o Node (normalmente `1` em uma hospedagem com um único proxy). Deixe `0` se o Node receber conexões diretamente; não confie em cabeçalhos de proxy sem saber a topologia.
- SQLite e sessões locais suportam uma única instância da aplicação. Use disco persistente e uma única instância; múltiplas instâncias/servidores requerem banco e armazenamento de sessão compartilhados.
- Configure o monitor de saúde do provedor para `GET /healthz`.
- Execute `npm run create-admin` uma vez contra o mesmo `DATABASE_PATH` persistente da aplicação, usando variáveis temporárias `ADMIN_NAME`, `ADMIN_EMAIL` e `ADMIN_PASSWORD`; remova a senha do ambiente após executar.
- Antes de publicar, rode `npm test` e `npm run build`.

## Hospedar no Render

1. Envie este repositório ao GitHub e, no Render, escolha **New > Blueprint**, conectando o repositório. O Render encontrará `render.yaml` na raiz.
2. Revise o Blueprint e confirme a criação do serviço web. Ele usa o plano Starter porque SQLite precisa de disco persistente; o banco será salvo em `/var/data/db.sqlite`.
3. Aguarde o primeiro deploy ficar saudável em `/healthz`. O Blueprint gera `SESSION_SECRET` e `CODIGO_CADASTRO` como segredos do serviço e configura `TRUST_PROXY_HOPS=1` para o proxy do Render.
4. Crie a conta admin uma única vez usando o Shell do serviço no Render: defina temporariamente `ADMIN_NAME`, `ADMIN_EMAIL` e `ADMIN_PASSWORD` no ambiente/shell e execute `npm run create-admin`. O comando usa `DATABASE_PATH` do serviço, portanto grava no disco persistente. Remova as variáveis temporárias após o comando.
5. Não crie outra instância do serviço e não remova o disco associado, pois o SQLite e as sessões são locais a esse disco.

O plano Starter e o disco persistente são pagos. Confira os preços atuais do Render antes de confirmar. Não use o plano gratuito para este banco: sistema de arquivos efêmero pode perder os dados.

## Testes

Execute `npm test`. Os testes usam um banco SQLite temporário e não alteram o banco de desenvolvimento.
