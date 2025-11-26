## Table of Contents
- [Project Description](#project-description)
- [Tech Stack](#tech-stack)
- [Getting Started Locally](#getting-started-locally)
- [Available Scripts](#available-scripts)
- [Testing](#testing)
- [Project Scope](#project-scope)
- [Project Status](#project-status)
- [License](#license)

## Project Description

10xCards is a web application designed to streamline the creation of educational flashcards using Artificial Intelligence. The application allows users to generate flashcards from pasted text, as well as manually create, edit, and delete them. The primary goal of the product is to minimize the time required to prepare study materials and to encourage the use of the spaced repetition method for more effective learning.

## Tech Stack

The project is built with a modern, scalable, and efficient technology stack:

- **Frontend:**
  - [Astro](https://astro.build/) 5
  - [React](https://react.dev/) 19
  - [TypeScript](https://www.typescriptlang.org/) 5
  - [Tailwind CSS](https://tailwindcss.com/) 4
  - [Shadcn/ui](https://ui.shadcn.com/)
- **Backend:**
  - [Supabase](https://supabase.com/) (PostgreSQL, Authentication, BaaS)
- **AI Integration:**
  - [OpenRouter.ai](https://openrouter.ai/) for access to various large language models.
- **Testing:**
  - [Vitest](https://vitest.dev/) for unit and integration tests.
  - [Testing Library](https://testing-library.com/) for React component testing.
  - [Playwright](https://playwright.dev/) for end-to-end tests.
  - [MSW](https://mswjs.io/) for API mocking in tests.
- **CI/CD & Hosting:**
  - [GitHub Actions](https://github.com/features/actions) for CI/CD pipelines.
  - [DigitalOcean](https://www.digitalocean.com/) for hosting via Docker images.

## Getting Started Locally

To set up and run the project on your local machine, follow these steps:

**1. Prerequisites:**
- **Node.js:** Make sure you have Node.js version `22.14.0` installed. We recommend using a version manager like [nvm](https://github.com/nvm-sh/nvm).
  ```bash
  nvm use
  ```
- **npm:** npm is included with Node.js.

**2. Install Dependencies:**
```bash
npm install
```

**3. Run the Development Server:**
```bash
npm run dev
```
The application will be available at `http://localhost:4321`.

## Available Scripts

The following scripts are available in the `package.json`:

- `npm run dev`: Starts the development server.
- `npm run build`: Builds the application for production.
- `npm run preview`: Previews the production build locally.
- `npm run lint`: Lints the code using ESLint.
- `npm run lint:fix`: Lints the code and automatically fixes issues.
- `npm run format`: Formats the code using Prettier.
- `npm run test`: Runs unit and integration tests using Vitest.
- `npm run test:ui`: Runs tests with Vitest UI interface.
- `npm run test:coverage`: Generates test coverage report.
- `npm run test:e2e`: Runs end-to-end tests using Playwright.
- `npm run test:e2e:ui`: Runs E2E tests with Playwright UI mode.

## Testing

The project implements a comprehensive testing strategy to ensure quality and stability:

### Unit and Integration Tests

- **Framework:** Vitest with Testing Library
- **Coverage:** Services, schemas (Zod validation), hooks, and UI components
- **Key areas tested:**
  - Authentication and authorization logic
  - Flashcard management services
  - AI generation services (OpenRouter integration)
  - Study session logic (SM-2 algorithm)
  - Form validation schemas
  - React hooks and components

### End-to-End Tests

- **Framework:** Playwright
- **Coverage:** Complete user journeys across the application
- **Key scenarios tested:**
  - User registration and login flow
  - Creating, editing, and deleting flashcards
  - AI-powered flashcard generation from text
  - Study session with spaced repetition
  - Navigation and protected routes

### Running Tests

```bash
# Run unit tests
npm run test

# Run unit tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run E2E tests in UI mode
npm run test:e2e:ui
```

### Test Environment

- Separate Supabase test instance for integration tests
- Mocked API responses using MSW for unit tests
- Test OpenRouter API key with cost limits
- Automated test execution in CI/CD pipeline (GitHub Actions)

### Quality Metrics

- Target: 80% code coverage for critical services and hooks
- All E2E tests must pass before merging to main branch
- Zero P0/P1 (critical/blocking) bugs in production

## Project Scope

This project is being developed as an MVP with a defined set of features.

### Included in MVP:
- **User Accounts:** Registration, login, and account deletion.
- **AI Flashcard Generation:** Generate flashcard suggestions from pasted text (1,000-10,000 characters).
- **Flashcard Management:** Manually create, view, edit, and delete flashcards.
- **Learning System:** An implementation of the SM-2 spaced repetition algorithm.
- **Legal:** Basic Privacy Policy and Terms of Service.

## Project Status

The project is currently in the **development phase**, focusing on delivering the features outlined for the Minimum Viable Product (MVP).

## License

This project is licensed under the MIT License.