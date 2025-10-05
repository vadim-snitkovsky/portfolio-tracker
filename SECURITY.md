# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Currently supported versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of Portfolio Tracker seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Please Do Not

- Open a public GitHub issue for security vulnerabilities
- Disclose the vulnerability publicly before it has been addressed

### Please Do

1. **Email us directly** at [(https://github.com/vadim-snitkovsky)] with:
   - Description of the vulnerability
   - Steps to reproduce the issue
   - Potential impact
   - Suggested fix (if any)

2. **Allow us time to respond** - We will acknowledge your email within 48 hours and provide a more detailed response within 7 days.

3. **Work with us** - We may ask for additional information or guidance.

## Security Best Practices

When using Portfolio Tracker:

### API Keys

- **Never commit API keys** to version control
- Store API keys in `.env` file (which is gitignored)
- Use environment variables for sensitive data
- Rotate API keys regularly

### Data Privacy

- All portfolio data is stored locally in your browser's localStorage
- No data is sent to external servers except:
  - Polygon.io API for stock quotes and dividend data
- Clear browser data to remove all portfolio information

### Deployment

- Use HTTPS in production
- Set appropriate CORS headers
- Implement rate limiting for API calls
- Keep dependencies up to date

## Dependency Security

We use automated tools to monitor dependencies:

- **Dependabot** - Automated dependency updates
- **npm audit** - Regular security audits
- **GitHub Security Advisories** - Monitoring for known vulnerabilities

To check for vulnerabilities:

```bash
npm audit
```

To fix vulnerabilities:

```bash
npm audit fix
```

## Security Updates

Security updates will be released as patch versions (e.g., 1.0.1) and documented in the [CHANGELOG.md](CHANGELOG.md).

## Disclosure Policy

When we receive a security bug report, we will:

1. Confirm the problem and determine affected versions
2. Audit code to find similar problems
3. Prepare fixes for all supported versions
4. Release new versions as soon as possible

## Comments on this Policy

If you have suggestions on how this process could be improved, please submit a pull request or open an issue.

## Attribution

This security policy is adapted from the [Electron Security Policy](https://github.com/electron/electron/blob/main/SECURITY.md).

