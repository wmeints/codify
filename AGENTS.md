# Project instructions

Read @README.md to learn what the objective is of this project.

## User interface components

1. **Prioritize Official Components:** Always check the shadcn/ui registry
   before building custom UI. Use `npx shadcn@latest add` for components.
2. **Use MCP Server:** Use the shadcn MCP server (`npx shadcn@latest mcp init --client claude`) to query and install components using natural language.
3. **Styling:** Use Tailwind CSS for all custom styling. Adhere to the established CSS variables (`--primary`, `--background`, etc.) in `globals.css`.
4. **Structure:** Install components in `components/ui`.
5. **Accessibility:** Do not remove aria attributes or keyboard handlers from shadcn components.
6. **Iconography:** Use `lucide-react` icons, as they are the default for shadcn.

## Important NextJS information

This version of nextjs has breaking changes — APIs, conventions, and file
structure may all differ from your training data. Read the relevant guide in
`node_modules/next/dist/docs/` before writing any code. Heed deprecation
notices.
