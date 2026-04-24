# Vrijgezellenfeest — Kahoot-style quiz (Next.js)

Interactieve quiz voor Marion & Ronald: spelers op mobiel, host stuurt de rondes aan.

## Vereisten

- Node.js 20+
- `QUIZ_ADMIN_TOKEN` in productie (Vercel **Environment Variables**) — zie [`.env.example`](./.env.example)

## Lokaal draaien

```bash
npm install
cp .env.example .env.local
# zet QUIZ_ADMIN_TOKEN in .env.local
npm run dev
```

- Spelerquiz: [http://localhost:3000](http://localhost:3000)
- Beheer (na inloggen met hetzelfde wachtwoord als `QUIZ_ADMIN_TOKEN`): [http://localhost:3000/admin](http://localhost:3000/admin)

## Admin & API

- Vragenbestand: `data/quiz-questions.json` (wordt aangemaakt bij eerste save).
- `GET /api/quiz-questions` — publiek (gecached door de speler-UI).
- `PUT /api/quiz-questions` — alleen met geldige **admin-sessiecookie** (na `/admin/login`) of header `x-quiz-admin-token: <QUIZ_ADMIN_TOKEN>`.
- Zonder `QUIZ_ADMIN_TOKEN` op de server zijn admin en writes **niet** afgeschermd (alleen voor lokale ontwikkeling bedoeld).

## Live sessie (MVP, één serverproces)

Voor een party-build op **één** Node-proces (typisch `next start` op één machine of één Vercel-regio zonder horizontale schaal):

1. Inloggen op `/admin`.
2. **Live sessie (host)** — maakt een code en opent `/host/<CODE>`.
3. Deelnemers openen `/play/<CODE>`, vullen een naam in (`POST .../players`), en antwoorden per vraag (`POST .../answer`); UI poll’t elke ~2s voor host-index + score. Per vraag is er een **server-side timer** (standaard 25s, `DEFAULT_QUESTION_SECONDS` in code); na afloop worden geen nieuwe antwoorden meer geaccepteerd.
4. Host gebruikt *Volgende* / *Vorige* om de vraag te wisselen (start een nieuwe timer).
5. Op de **laatste vraag** tikt de host **Quiz afronden** — spelers zien daarna een **afsluitscherm** met de **winnaar(s)** (ex aequo = meerdere namen), eigen score en top 8. **Vorige** op het hostscherm opent de laatste vraag weer.

> Op serverless met meerdere instances heeft in-memory state **geen** gedeeld geheugen — gebruik dit pad voor rehearsal op één instance, of plan Redis/SSE voor productie (zie roadmap in Paperclip).

## Scripts

```bash
npm run build   # productiebuild
npm run start   # na build
npm run lint
npm test        # unit tests (o.a. scoring)
```

## Deploy (Vercel)

1. Repo koppelen aan Vercel; root = deze app.
2. Zet `QUIZ_ADMIN_TOKEN` in Vercel → Settings → Environment Variables (Production + Preview).
3. Deploy; test `/admin` login en een vraag opslaan.

## Paperclip / roadmap

Zie company-issue [VRIAA-11](/VRIAA/issues/VRIAA-11#document-plan) plan-document voor fasering (0–4) en QA-checklist na deploy.
