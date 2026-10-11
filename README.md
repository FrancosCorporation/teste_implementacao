# letmeask-starter

Uma aplicação leve de perguntas e respostas inspirada no LetMeAsk da NLW Together.
Crie salas, compartilhe convites, envie perguntas e acompanhe a conversa em tempo
real. O projeto funciona em demonstração local sem credenciais e usa Firebase
Authentication e Realtime Database quando configurado.

## Executar localmente

Requisitos: Node.js 22.13+ ou 24 LTS e npm.

```bash
cp .env.example .env
npm ci
npm run dev
```

Sem configuração Firebase, entre na demonstração e use salas armazenadas no
navegador atual. Com Firebase configurado, o botão Google ativa salas e perguntas
sincronizadas pela internet.

## Configurar Firebase

1. Crie um app Web no [Firebase Console](https://console.firebase.google.com/).
2. Ative Google em **Authentication → Sign-in method** e adicione o domínio do
   app em **Authentication → Settings → Authorized domains**.
3. Crie um **Realtime Database** e copie os valores de configuração Web para as
   variáveis `VITE_FIREBASE_*` do arquivo `.env`.
4. Publique as regras de acesso incluídas no projeto:

   ```bash
   npx firebase-tools login
   npx firebase-tools use ID_DO_PROJETO
   npx firebase-tools deploy --only database
   ```

   Substitua `ID_DO_PROJETO` pelo identificador do app no Firebase Console.

As regras exigem login, limitam leitura ao contexto de salas e permitem que cada
pessoa altere apenas as próprias reações. A pessoa anfitriã pode marcar perguntas
como respondidas; o autor ou anfitrião pode removê-las.

Os valores de `VITE_FIREBASE_*` entram no JavaScript enviado ao navegador. Eles
identificam o app Web, mas não são senhas. A proteção dos dados depende das regras
do Realtime Database e da configuração de domínios no Authentication.

## Executar com Docker

Requisitos: Docker Engine e Docker Compose.

```bash
cp .env.example .env
# preencha .env para ativar o Firebase; deixe os valores vazios para demonstração
docker compose up --build
```

Abra [http://localhost:3000](http://localhost:3000). O serviço publica a porta
apenas em `127.0.0.1` e roda como usuário sem privilégios de root. Para encerrar:

```bash
docker compose down
```

## Comandos

| Comando | Ação |
|---|---|
| `npm run dev` | inicia o Vite em `http://localhost:3000` |
| `npm run build` | verifica tipos e cria `dist/` |
| `npm run typecheck` | verifica tipos TypeScript |
| `npm run lint` | verifica TypeScript/React e regras de hooks |
| `npm run preview` | serve o build localmente |

## Funcionalidades

- Login com Google pelo Firebase Authentication.
- Demonstração local com nome de participante e persistência no navegador.
- Criação de salas, códigos de convite e compartilhamento de link.
- Perguntas em tempo real, reações de apoio e ordenação por atividade.
- Moderação: marcar como respondida e remover perguntas próprias ou da sala.
- Estados vazios, erros explicativos, teclado acessível e layout responsivo.

## Estrutura

```text
src/auth/                 # sessão Google ou demonstração
src/services/firebase.ts  # configuração opcional do Firebase
src/services/data.ts      # dados remotos e armazenamento de demonstração
src/App.tsx               # páginas de entrada, painel e sala
database.rules.json       # autorização e validação no Realtime Database
firebase.json             # configuração de deploy das regras
```

## Licença

MIT — consulte [LICENSE](LICENSE).
