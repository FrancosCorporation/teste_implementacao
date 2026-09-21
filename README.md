# teste_implementacao

**Projeto de estudo** — scaffold inicial em React + TypeScript + Firebase inspirado no projeto "LetMeAsk" (da NLW Together), criado em junho de 2021 para praticar a integração do Create React App com Firebase.

![TypeScript](https://img.shields.io/badge/TypeScript-4-3178C6?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-17-61DAFB?style=flat&logo=react&logoColor=black)
![Firebase](https://img.shields.io/badge/Firebase-8-FFCA28?style=flat&logo=firebase&logoColor=black)
![Licença](https://img.shields.io/badge/licen%C3%A7a-MIT-green)
![Status](https://img.shields.io/badge/status-projeto%20de%20estudo-blue)

## Sobre

Exercício de ambientação: o app inicializa o Firebase (Auth + Realtime Database) lendo as credenciais de variáveis de ambiente e renderiza um contador de exemplo. A ideia era seguir o formato do LetMeAsk, mas o repositório ficou no **estágio de esqueleto** — só o contador funciona; não há telas de salas, perguntas ou autenticação.

## Funcionalidades

Comprovadas pelo código:

- Botão com contador controlado por `useState` (`src/components/Button.tsx`, `src/App.tsx`);
- Inicialização do Firebase (`auth` e `database`) a partir de variáveis `REACT_APP_*` (`src/services/firebase.ts`);
- Bootstrap padrão do CRA com TypeScript (`src/index.tsx`, `public/index.html`).

## Stack

- **React 17** + **TypeScript 4**
- **Create React App** (`react-scripts` 4.0.3)
- **Firebase 8** (`firebase/auth` e `firebase/database`)
- Dependências padrão de teste do CRA — não há testes versionados

## Como rodar

Requer configuração de ambiente. O Firebase é inicializado com variáveis `REACT_APP_*`; sem elas o app não inicia corretamente. Copie [`.env.example`](.env.example) para `.env` e preencha com as credenciais do seu projeto Firebase:

```bash
yarn install
yarn start
```

Abre em `http://localhost:3000`. Outros scripts:

```bash
yarn build   # build de produção em /build
yarn test    # runner de testes do CRA (sem testes versionados)
```

Atenção ao nome da variável `REACT_APP_DABASE_URL` (grafia original do código) — deve ser mantido exatamente assim.

## Estrutura do projeto

```
.
├── public/
│   └── index.html
├── src/
│   ├── components/Button.tsx   # contador de exemplo
│   ├── services/firebase.ts    # inicialização via env
│   ├── App.tsx
│   ├── index.tsx
│   └── react-app-env.d.ts
└── package.json                # name: "letmeask"
```

## Observações

- O `package.json` tem `"name": "letmeask"`, resquício do projeto que serviu de referência.
- Scaffold incompleto por decisão de estudo: o objetivo era a base com Firebase, não o app final.

## Licença

MIT — veja [LICENSE](LICENSE).
