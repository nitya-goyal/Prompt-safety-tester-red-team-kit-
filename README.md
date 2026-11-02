# Sentinel — Prompt Safety Tester

A red-team workbench for chatbot teams. Enter a system prompt, generate an adversarial test suite, capture model responses, and export an evaluation table with suggested fixes.

## Website

[Open Sentinel](https://nitya-goyal.github.io/Prompt-safety-tester-red-team-kit-/).

The public GitHub Pages website supports attack generation, manual response review, guardrail suggestions, and JSON/CSV exports. Prompt text and evaluations stay in the browser until exported. Live model requests require the local server configuration below; the hosted edition has live execution disabled.

## Run locally

Requires Node.js 22 or newer. No dependencies or API keys are needed for manual evaluation.

```sh
git clone https://github.com/nitya-goyal/Prompt-safety-tester-red-team-kit-.git
cd Prompt-safety-tester-red-team-kit-
npm start
```

Open http://127.0.0.1:3000. Click **Load example**, then **Generate test suite**. Inspect a case, copy its attack into your chatbot, paste the response, and record a human verdict. Export JSON or CSV before closing the tab; evaluations are stored only in memory.

## What it tests

16 fixed templates cover instruction override, prompt extraction, indirect injection, role spoofing, data exfiltration, encoded instructions, scope escape, and benign controls. Each case includes expected behavior and a suggested mitigation. Guardrail suggestions inspect the supplied prompt for relevant language; a detected mention does not establish that a guardrail works.

The attack library uses fixed, deterministic templates. Evaluate whether each case is relevant to your assistant's intended policy. All Pass/Fail verdicts are explicitly human assigned. Live responses start as **Needs review**. Marker detection is only a review hint, since a model may quote an attack without obeying it. No untested case is presented as passed.

Indirect-injection cases simulate retrieved documents and tool results inside a user message. They do not exercise a real retrieval pipeline or tool integration. Suggested fixes are template guidance, not a rewritten system prompt or a safety guarantee.

Click **Save evaluation** before closing a test dialog; unsaved edits are discarded. Export your report before refreshing or closing the page. Reports cannot currently be imported back into the app.

## Optional live model tests

Configure a trusted HTTPS endpoint that accepts a chat-completions-compatible request and returns `choices[0].message.content`. Set environment variables before starting the server:

```powershell
$env:MODEL_ENDPOINT = 'https://your-provider.example/v1/chat/completions'
$env:MODEL_NAME = 'your-model-name'
$env:MODEL_API_KEY = 'your-api-key'
npm start
```

For Bash or Zsh:

```sh
export MODEL_ENDPOINT='https://your-provider.example/v1/chat/completions'
export MODEL_NAME='your-model-name'
export MODEL_API_KEY='your-api-key'
npm start
```

Use **Run live test** within a case. The server sends the exact suite's system prompt and the selected attack as separate system/user messages. Tests run individually, with a 45-second timeout and a 600-token output limit. Provider errors remain errors, not verdicts. A live request sends prompt data to the configured provider and may incur charges. The API key stays server-side; do not commit it. This adapter deliberately performs no tools or external actions requested by the target model.

## Validation

```sh
npm run check
npm test
```

Tests cover category coverage, input bounds, verdict honesty, CSV escaping/formula protection, static-route isolation, cross-origin rejection, missing configuration, and a mocked live provider request.

## Architecture and privacy

- Dependency-free Node HTTP server bound to loopback and plain HTML/CSS/JavaScript frontend.
- Fixed attack library and prompt guardrail checks in `public/engine.js`.
- Server-only model adapter at `POST /api/run`, using environment configuration.
- No database, analytics, browser storage, third-party scripts, or remote fonts.
- Reports include sensitive prompt/response data. JSON includes the complete system prompt; CSV includes the evaluation rows. Store reports securely.
- A strict content security policy and DOM text rendering keep model output from executing as HTML. CSV exports neutralize leading spreadsheet formula characters.

This local single-user tool is not a production multi-tenant service. Add authentication, rate limits, network controls, persistent storage, and organization-specific authorization before exposing it over a network. Prompt wording alone cannot enforce tool permissions or prevent every injection. Use application-level authorization, output handling, and regression testing alongside this workbench.

## Troubleshooting

- **Live testing is not configured:** set all three model variables in the same terminal before starting the local server. The hosted edition supports manual evaluation only.
- **Provider error:** verify the complete HTTPS endpoint, credentials, model name, and chat-completions response format. Some providers or models do not support the adapter's request fields.
- **Port already in use:** set `PORT` to another port, restart, and open the printed URL. In PowerShell, use `$env:PORT = '3001'`; in Bash, use `PORT=3001 npm start`.
- **Results disappeared:** results are kept in memory. Save each evaluation and export the report before leaving the page.

## Hosted build

Run `npm run build:site` to copy the frontend into `dist/` for static hosting. This build disables the server-dependent live-test button and explains how to run live tests locally. The Node backend remains available through `npm start`.
