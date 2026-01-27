# Contributing to Nintendo Switch Parental Controls Extension

Thank you for considering contributing to this project! This document provides guidelines for contributing.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help create a welcoming environment for all contributors

## How to Contribute

### Reporting Bugs

Before submitting a bug report:

1. Check if the issue has already been reported in Issues
2. Ensure you're using the latest version
3. Test with a fresh installation if possible

When submitting a bug report, include:

- Extension version
- Chrome/browser version
- Steps to reproduce the issue
- Expected vs actual behavior
- Screenshots if applicable
- Console errors (Right-click extension → Inspect → Console)

### Suggesting Features

Feature requests are welcome! Please:

1. Check if the feature has already been requested
2. Explain the use case and benefits
3. Consider if it aligns with the project's scope
4. Be open to discussion and alternative approaches

### Code Contributions

#### Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/nintendo-switch-parental-controls-extension.git`
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test thoroughly
6. Commit with clear messages
7. Push to your fork
8. Open a Pull Request

#### Code Style

- Use clear, descriptive variable and function names
- Add comments for complex logic
- Follow existing code formatting
- Use ES6+ JavaScript features where appropriate
- Keep functions focused and modular

#### Commit Messages

- Use present tense ("Add feature" not "Added feature")
- Keep first line under 50 characters
- Provide detailed description if needed
- Reference issue numbers when applicable

Example:
```
Add monthly usage statistics view

- Create new stats API endpoint wrapper
- Add monthly summary component to popup
- Update device modal with stats tab

Fixes #123
```

#### Testing Checklist

Before submitting a PR:

- [ ] Extension loads without errors
- [ ] All existing features still work
- [ ] New features work as intended
- [ ] No console errors or warnings
- [ ] Tested in both authenticated and non-authenticated states
- [ ] Tested error handling
- [ ] Code is properly formatted
- [ ] Comments added where necessary

### Pull Request Process

1. Update README.md if you've added features or changed functionality
2. Ensure all tests pass and there are no console errors
3. Update documentation as needed
4. Your PR should target the `main` branch
5. Maintainers will review and may request changes
6. Once approved, your PR will be merged

## Development Setup

1. Clone the repository
2. Generate icons (see ICONS.md)
3. Load extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable Developer mode
   - Click "Load unpacked"
   - Select the extension directory
4. Make changes
5. Reload extension to test changes

## Project Structure

Understanding the codebase:

- `manifest.json` - Extension configuration
- `background.js` - Service worker, handles API communication
- `popup.html/js/css` - User interface
- `src/api.js` - Nintendo API client
- `src/auth.js` - Authentication flow
- `src/storage.js` - Encrypted storage utilities

## Areas for Contribution

Looking for ways to help? Consider:

- **UI/UX improvements** - Make the interface more intuitive
- **Feature additions** - Implement items from the README To-Do list
- **Bug fixes** - Check open issues
- **Documentation** - Improve README, add code comments
- **Testing** - Report bugs, test edge cases
- **Localization** - Add translations for other languages
- **Accessibility** - Improve keyboard navigation, screen reader support

## API Documentation

The extension uses Nintendo's unofficial parental controls API:

- Authentication endpoint: `https://accounts.nintendo.com/`
- Parental controls: `https://api-lp1.pctl.srv.nintendo.net/`

Refer to:
- [pynintendoauth](https://github.com/pantherale0/pynintendoauth)
- [pynintendoparental](https://github.com/pantherale0/pynintendoparental)

## Security Considerations

When contributing:

- Never log or expose authentication tokens
- Always use encrypted storage for sensitive data
- Validate all user inputs
- Don't introduce external dependencies without discussion
- Follow secure coding practices
- Report security vulnerabilities privately to maintainers

## Legal Considerations

- This is an unofficial project, not endorsed by Nintendo
- Don't include copyrighted Nintendo assets without permission
- Don't violate Nintendo's Terms of Service
- Be respectful of Nintendo's intellectual property
- Contributions should be your original work or properly licensed

## Questions?

- Open an issue for questions about contributing
- Check existing issues and PRs for similar discussions
- Be patient - this is a community project run by volunteers

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to making this extension better for everyone!
