# Contributing to Fed Simulator MCP

We welcome contributions to the Fed Simulator MCP server! This project is open source and community-driven.

## Code of Conduct

Be respectful, constructive, and collaborative. We're all here to build something cool for the wrestling simulation community.

## How to Contribute

### Reporting Issues
- Use GitHub Issues to report bugs or suggest features
- Provide clear reproduction steps for bugs
- Search existing issues before creating new ones

### Pull Requests
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests if applicable
5. Commit with clear, descriptive messages
6. Push to your fork and submit a pull request

### Development Setup
```bash
git clone https://github.com/azz0r/fedsim-mcp.git
cd fedsim-mcp
npm install
npm run build
npm run dev  # Watch mode for development
```

### Adding New Tools
When adding new MCP tools:
1. Create the tool in the appropriate file (`src/tools/`)
2. Use the action wrapper system for consistent logging
3. Add proper TypeScript types
4. Include comprehensive input schema validation
5. Add documentation to the README

### Testing
- Write tests for new functionality
- Ensure existing tests pass: `npm test`
- Test with actual MCP clients when possible

## Guidelines

### Code Style
- Use TypeScript for all new code
- Follow existing patterns for consistency
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

### Commits
- Use conventional commit messages
- Keep commits focused and atomic
- Reference issues in commit messages when applicable

### Documentation
- Update README.md for new features
- Include examples for new tools
- Document breaking changes clearly

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Open an issue or start a discussion on GitHub. We're happy to help!

## Recognition

Contributors will be recognized in the project README and release notes.

Thanks for helping make Fed Simulator MCP better! 🏆