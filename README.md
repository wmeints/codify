# Codify - An agentic prototype

Codify is a NextJS based coding agent that you can use to build applications.
Note, this looks like a very complete agent, but in reality isn't that mature yet.

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
