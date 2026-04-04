# UI/UX Pro Max Data Files

These CSV data files power the design system generator tool.
They were copied from `~/.gemini/antigravity/skills/ui-ux-pro-max/data/`
due to macOS sandbox restrictions preventing direct CLI access.

## Files
- `styles.csv` — Design style categories and patterns
- `products.csv` — Product type classifications
- `colors.csv` — Color palettes by product type
- `typography.csv` — Font pairing recommendations
- `landing.csv` — Landing page layout patterns
- `ui-reasoning.csv` — UI pattern decision rules
- `ux-guidelines.csv` — UX best practices checklist
- `charts.csv` — Data visualization chart recommendations
- `icons.csv` — Icon library reference (Lucide)
- `prompts.csv` — AI prompt templates per design style
- `react-performance.csv` — React performance optimization patterns
- `web-interface.csv` — Web accessibility and interface patterns
- `stacks/` — Framework-specific component patterns

## Usage
```bash
python3 .tools/ui-ux/search.py "<query>" --design-system -p "Mastery Coach"
```
