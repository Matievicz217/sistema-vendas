# Sistema de Vendas

Aplicação web em Node.js, Express e PostgreSQL para registrar vendas e acompanhar metas. Usuários, vendas, metas e sessões são armazenados exclusivamente no PostgreSQL. As tabelas e índices são criados automaticamente na inicialização.

## Configuração local

1. Instale Node.js 20 ou superior e as dependências com `npm install`.
2. Crie um banco PostgreSQL e um usuário com permissão para criar tabelas e gravar dados nesse banco.
3. Copie `.env.example` para `.env`. Defina `DATABASE_URL` com a conexão real, por exemplo `postgresql://usuario:senha@localhost:5432/vendas`. Caracteres especiais do usuário e senha devem ser codificados para URL.
4. Defina `SESSION_SECRET` (pelo menos 32 caracteres) e `CODIGO_CADASTRO` (pelo menos 16 caracteres). Nunca publique o `.env`.
5. Execute `npm start` e abra http://localhost:3000. Sem uma `DATABASE_URL` válida ou sem conexão com o banco, o servidor não inicia.
6. Para criar a primeira conta administradora, defina temporariamente `ADMIN_NAME`, `ADMIN_EMAIL` e `ADMIN_PASSWORD` e execute `npm run create-admin`. A senha precisa ter de 12 a 128 caracteres. Remova as variáveis após a criação.

## Produção e Render

Configure `NODE_ENV=production`, `DATABASE_URL`, `SESSION_SECRET` e `CODIGO_CADASTRO` no painel de ambiente do provedor. A URL deve apontar para o banco que contém os dados do sistema. Não é necessário disco local para dados ou sessões.

No Render, conecte o repositório como Blueprint usando `render.yaml`. Informe `DATABASE_URL` quando solicitado: utilize a **Internal Database URL** do PostgreSQL na mesma região do serviço web. O Blueprint gera os segredos e configura `TRUST_PROXY_HOPS=1`; ele não cria nem importa um banco. Consulte a [referência do Blueprint](https://render.com/docs/blueprint-spec) e a [documentação de conexão PostgreSQL](https://render.com/docs/postgresql-creating-connecting).

Se o serviço já existe sem Blueprint, configure `DATABASE_URL` em **Environment** e faça o deploy. O monitor de saúde deve usar `GET /healthz`.

A aplicação espera HTTPS terminado pelo proxy do provedor. No Render, `RENDER=true` habilita um proxy confiável quando `TRUST_PROXY_HOPS` não está definido. Em outros provedores, configure o número de proxies confiáveis entre a internet e o Node; use `0` para conexões diretas.

Para conexão externa com TLS, use as opções indicadas pelo provedor na URL, mantendo a validação do certificado.

## Primeiro administrador sem Shell

Em um banco novo, defina `BOOTSTRAP_ADMIN=true`, `ADMIN_NAME`, `ADMIN_EMAIL` e `ADMIN_PASSWORD` no serviço e faça o deploy. A inicialização cria a conta antes de atender requisições. Uma conta administradora existente mantém sua senha; um e-mail pertencente a uma funcionária não é promovido automaticamente. Depois de confirmar o login, remova essas quatro variáveis e faça novo deploy.

## Dados existentes

Esta versão não inclui importador de bancos locais antigos. Se houver dados de uma versão anterior que ainda não estejam no PostgreSQL, preserve um backup e transfira os dados antes de colocar esta versão em produção. Configurar uma URL de banco vazio não transfere usuários, vendas ou metas automaticamente.

## Verificação

Execute `npm test` e `npm run build` antes do deploy. Os testes usam `pg-mem`, um emulador PostgreSQL isolado, e não alteram o banco configurado em `DATABASE_URL`. A conexão, o TLS e o comportamento no PostgreSQL real devem ser conferidos no ambiente de destino.

## Esqueci minha senha

O login inclui um link para solicitar recuperação por e-mail. O link recebido permite criar uma nova senha, vence em 30 minutos e só funciona uma vez. Uma nova solicitação substitui o link anterior, com intervalo mínimo de um minuto por conta. Após a troca, as sessões existentes são encerradas.

Configure no painel **Environment** do serviço web no Render:

- `RESEND_API_KEY`: chave de envio criada no Resend.
- `EMAIL_FROM`: remetente autorizado, por exemplo `Dermosens <acesso@seudominio.com.br>`. Para enviar a outras pessoas, configure e verifique seu domínio no Resend.
- `APP_URL`: endereço público HTTPS do sistema, como `https://seu-sistema.onrender.com`, sem caminho de login. Se vazio, utiliza `RENDER_EXTERNAL_URL` no Render. Em desenvolvimento, informe `http://localhost:3000`.

As credenciais ficam somente no servidor. Sem a configuração, o sistema continua funcionando, mas a recuperação informa que está indisponível. A tabela de recuperação é criada automaticamente no PostgreSQL ao iniciar.

Consulte a [API de envio do Resend](https://resend.com/docs/api-reference/emails/send-email) e a [verificação de domínios](https://resend.com/docs/dashboard/domains/introduction). Depois de configurar e fazer o deploy, solicite uma recuperação para uma conta sua e confirme a entrega, a troca da senha e a recusa do link reutilizado. Os testes automatizados simulam o envio; eles não enviam e-mails reais.
