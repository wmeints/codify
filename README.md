# Codify - An agentic prototype

This project is a prototype I use to explain coding agents to people. It's
an almost fully featured coding agent I'm using myself with a local LLM.

## Getting started

Run these steps to prepare the code:

- `git clone https://github.com/wmeints/codify`
- `cd codify`
- `pnpm install`

Configure the following settings in `.env` to get access to an LLM:

```dotenv
CODIFY_LLM_PROVIDER=local|anthropic
CODIFY_LLM_API_KEY=
CODIFY_LLM_URL=
```

Run the application application with `pnpm dev` and access it
via http://localhost:3000/
