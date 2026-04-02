# Contributing to MCLauncher

Thank you for your interest in contributing to MCLauncher!

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/mc-launcher.git`
3. Create a branch: `git checkout -b feature/your-feature-name`

## Development Setup

```bash
npm install
npm run dev
```

## Code Style

- Use **TypeScript** for all new code
- Follow ESLint rules (run `npm run lint` before committing)
- Use functional components with hooks in React
- Name components using PascalCase
- Use meaningful variable and function names

## Pull Request Process

1. Update documentation if needed
2. Run `npm run typecheck` and `npm run lint` - fix any errors
3. Ensure builds pass: `npm run build`
4. Update CHANGELOG.md with your changes (if applicable)
5. Submit a PR with a clear description

## Commit Messages

Use conventional commits:
- `feat: add new feature`
- `fix: resolve bug in instance creation`
- `docs: update README`
- `refactor: simplify downloader logic`

## Testing

Before submitting:
- Test game launch with different Minecraft versions
- Test mod installation via Modrinth
- Verify Java detection works on your system

## Questions?

Open an issue for discussion before submitting a PR.
