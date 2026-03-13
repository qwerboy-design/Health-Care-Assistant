# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
