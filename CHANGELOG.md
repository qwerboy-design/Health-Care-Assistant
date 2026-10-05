# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed - 2026-10-04
- **Auth / OTP infrastructure errors** - Supabase lookup failures are no longer treated as missing customers; auth routes return retryable 503 responses, and registration reports OTP delivery failure without exposing PII.
- **Registration OTP recovery** - A created account with failed OTP delivery now enters verification with an immediate safe resend action instead of becoming a duplicate-email dead end.
- **Resend observability** - OTP/default-password delivery logs now contain only safe status/name/code metadata; recipient addresses, OTPs, passwords, and provider response bodies are excluded.
- **Rate-limit fallback** - Persistent store/RPC outages now clearly fall back to in-memory limiting with one warning per error code.
- **OpenAI provider** - Added safe zh-TW provider errors, admin key/model status, migration 007/011 visibility, streamed image forwarding, actual provider/model response metadata, credit refunds, and no-provider-fallback regression coverage.
- **Ollama SSRF boundary** - Redirects are rejected and hostname lookalike/userinfo/IPv6 loopback cases remain blocked by URL validation.

### Fixed - 2026-10-05
- **Function search paths** - Added `20261005b_fix_function_search_path` to pin the search path for the six hosted public functions reported by the Supabase security advisor.
- **Credits RPC access** - Applied `20261005_revoke_credit_rpcs_from_anon` to revoke public/anon/authenticated execution of the credit RPCs and retain server-side `service_role` execution.
- **Hosted database migrations** - Applied migrations 007–011, `20260422_add_rate_limits`, `20261002_enable_rls_customer_settings_rate_limits`, and `20261005_revoke_credit_rpcs_from_anon` to the production Supabase project.
- **OpenAI model pricing data** - Inserted the active `gpt-4o-mini` `model_pricing` row with 3 credits and vision support; this is a data insert, not a migration.

## [1.2.4] - 2026-03-13

### Fixed
- **Admin Dashboard Settings Loading** - Fixed authentication issue where admin dashboard couldn't load customer settings
  - Root cause: Login APIs stored JWT token only in HTTP-only cookies, but client-side API calls expected token in localStorage
  - Solution: Modified all login endpoints (password, OTP, Google) to return token in response payload
  - Frontend now stores token to localStorage after successful login
  - Maintains backward compatibility with existing cookie-based session mechanism
  - All 14 authentication unit tests passing
  - Details: [docs/FIX_ADMIN_SETTINGS_LOADING.md](docs/FIX_ADMIN_SETTINGS_LOADING.md)

### Changed
- Updated authentication tests to verify token is returned in login responses

## [1.2.3] - 2026-03-12

### Added
- Customer UI customization system
  - `customer_settings` table for per-customer UI configurations
  - Admin interface to toggle customer UI features:
    - Function selector visibility
    - Workload selector visibility
    - Screenshot functionality
  - API endpoints for managing customer settings
  - Supabase migrations for database schema

### Security
- Row Level Security (RLS) policies for customer_settings table
- Admin-only access to customer settings management

## [1.2.2] - 2026-03-11

### Added
- Chat history logging with support for text and attachments
- File upload with presigned URLs
- Screenshot capture functionality

### Fixed
- File upload error handling
- Memory optimization for large uploads

## [1.2.1] - 2026-03-10

### Added
- Google OAuth authentication
- OTP (One-Time Password) login
- Email verification system

### Security
- Rate limiting for authentication endpoints
- JWT token expiration handling

## [1.2.0] - 2026-03-09

### Added
- Admin dashboard for user approval workflow
- Customer management interface
- Credit system integration

### Changed
- Improved UI/UX for login page
- Enhanced error messages

## [1.1.0] - 2026-03-01

### Added
- Multi-language support (繁體中文, English)
- Chat interface with streaming responses
- Model selection and pricing

### Fixed
- Session persistence issues
- Mobile responsiveness

## [1.0.0] - 2026-02-15

### Added
- Initial release
- Basic authentication system
- Chat functionality with AI integration
- Supabase backend integration
- Vercel deployment configuration

[Unreleased]: https://github.com/your-repo/health-care-assistant/compare/v1.2.4...HEAD
[1.2.4]: https://github.com/your-repo/health-care-assistant/compare/v1.2.3...v1.2.4
[1.2.3]: https://github.com/your-repo/health-care-assistant/compare/v1.2.2...v1.2.3
[1.2.2]: https://github.com/your-repo/health-care-assistant/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/your-repo/health-care-assistant/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/your-repo/health-care-assistant/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/your-repo/health-care-assistant/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/your-repo/health-care-assistant/releases/tag/v1.0.0
## 2026-10-02

- docs: save HCA scientific guidance v0.1 and adult health report assistant v0.2 specifications
- feat(report): add browser-local report extraction, confirmed-value comparison, draft source-bound analysis, server-owned analysis metadata, and manual download guard
- security(report): keep feature disabled by default, reject unconfirmed/raw report payloads, and block report conversations from automatic R2 export
