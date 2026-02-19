# Documentation Maintenance Directive

## File-to-Doc Mapping Rules
When any of these code files change, the corresponding doc must be reviewed:

| Code Pattern | Documentation File | What to Update |
|-------------|-------------------|----------------|
| src/app/**/*.tsx | docs/README.md | Component/page descriptions, project structure |
| src/app/**/layout.tsx | docs/README.md | Route structure, SEO config, fonts |
| src/app/api/**/*.ts | docs/README.md | API endpoints, email capture section |
| src/components/**/*.tsx | docs/README.md | Component descriptions, project structure |
| src/app/globals.css | docs/README.md | Design tokens, animation details |
| next.config.* | docs/README.md | Build/deploy configuration |
| package.json | docs/README.md | Dependencies, scripts, tech stack |
| public/** | docs/README.md | Static assets listing |

## Documentation Standards
- Use markdown tables for structured data
- Keep descriptions factual and concise
- Include code examples when they clarify usage
- Add "Last Updated" comments to modified sections
