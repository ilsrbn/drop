# Contributing

Issues and pull requests are welcome.

```bash
npm install
npm run dev:prepare
npm run dev          # playground
npm run lint
npm run test
npm run test:types
```

Public behavior changes need a test and an update to `README.md` (and
`AGENTS.md` if the component contract changes). The README is checked by
`test/unit/readme.test.ts`.
