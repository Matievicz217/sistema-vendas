# Sistema de Vendas

Aplicação web em Node.js, Express e PostgreSQL (com SQLite disponível durante a transição) para registrar vendas e acompanhar metas.

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
- A aplicação espera que HTTPS seja terminado pelo provedor/reverse proxy. No Render, a aplicação reconhece `RENDER=true` e usa um proxy confiável automaticamente quando `TRUST_PROXY_HOPS` não está definido. Uma configuração explícita, inclusive `0`, tem prioridade. Em outros provedores, defina `TRUST_PROXY_HOPS` com o número exato de proxies confiáveis entre a internet e o Node (normalmente `1` em uma hospedagem com um único proxy). Deixe `0` se o Node receber conexões diretamente; não confie em cabeçalhos de proxy sem saber a topologia.
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

## PostgreSQL e migração dos dados existentes

A aplicação usa PostgreSQL quando `DATABASE_URL` está definida; sem essa variável, continua usando SQLite. Usuários, vendas, metas e sessões passam a ser armazenados no PostgreSQL. As tabelas são criadas na inicialização.

1. Crie um Postgres no Render na mesma região do serviço. A conexão interna é a opção indicada entre os serviços do Render: https://render.com/docs/postgresql-creating-connecting. Configure a URL somente no painel de segredos, nunca no Git.
2. Publique primeiro o código com suporte PostgreSQL **sem alterar `DATABASE_URL` no serviço web**. Ele continuará usando SQLite. Mantenha o disco antigo.
3. Interrompa novas gravações no sistema antigo durante toda a transferência e troca. Gere uma cópia consistente do SQLite de produção usando a API `backup` do SQLite ou `sqlite3 .backup`; não copie apenas o arquivo principal enquanto houver WAL ativo. Guarde essa cópia para recuperação.
4. No Shell do serviço antigo, configure `SQLITE_SOURCE_PATH` com o caminho da cópia e `DATABASE_URL` com a URL interna do novo Postgres **apenas no ambiente desse Shell**. Execute `npm run migrate:postgres`. A simulação tenta inserir os dados e desfaz a transação ao final. Confira as contagens de usuários, registros e metas.
5. Execute `npm run migrate:postgres -- --apply` para confirmar a importação. O destino deve estar vazio. IDs e hashes de senha são preservados; a importação ajusta as sequências, confere contagens e usa uma transação. Em caso de erro, os dados inseridos são desfeitos. A simulação cria a estrutura das tabelas, mas não mantém dados importados.
6. Somente após a importação, defina `DATABASE_URL` no painel Environment do serviço web e faça o deploy. Verifique `/healthz`, login, registros, ranking e metas antes de liberar gravações. Os usuários precisam entrar novamente; sessões antigas não são copiadas.
7. Preserve o disco e o backup SQLite até confirmar os dados e o funcionamento. Depois da troca, voltar ao SQLite sem reconciliar novas vendas perderia as gravações feitas no PostgreSQL.

Para uma instalação nova e sem dados antigos, basta definir `DATABASE_URL` e executar `npm run create-admin` com as variáveis temporárias do administrador. O `render.yaml` existente continua preservando o disco SQLite; ele não faz a troca automaticamente.

Não é necessário um disco local para o PostgreSQL: o armazenamento é gerenciado pelo serviço de banco. Se usar conexão externa que exija TLS, use a configuração SSL indicada pelo provedor na URL, mantendo a validação do certificado. Não desative a verificação de certificados.

Os testes PostgreSQL da API usam `pg-mem`, um emulador, e não substituem a validação da importação e das transações no banco PostgreSQL real antes da troca.
