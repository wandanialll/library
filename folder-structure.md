# Monorepo Folder Structure

This project was created with `npx shadcn@latest init -t vite --monorepo`, so the repository is split into a Vite app plus a shared UI package.

## Root

    library/
    ├── package.json
    ├── package-lock.json
    ├── README.md
    ├── tsconfig.json
    ├── turbo.json
    ├── .npmrc
    ├── .prettierrc
    ├── .prettierignore
    ├── .gitignore
    ├── apps/
    ├── packages/
    └── .turbo/

### Root directory descriptions

- package.json: workspace root with shared scripts for build, dev, lint, format, and typecheck.
- package-lock.json: npm lockfile for the monorepo dependencies.
- README.md: template documentation for the shadcn/ui monorepo setup.
- tsconfig.json: base TypeScript config shared across workspaces.
- turbo.json: Turbo task pipeline for build, lint, format, typecheck, and dev.
- .npmrc: npm workspace/package manager configuration.
- .prettierrc and .prettierignore: formatting rules and excluded paths.
- .gitignore: git ignore rules for generated files and local artifacts.
- .turbo/: Turbo cache and generated metadata.
- apps/: application workspaces, including the web app.
- packages/: shared packages used by applications, including the UI package.

## apps

    apps/
    └── web/

- apps/: holds runnable applications in the monorepo.
- apps/web/: the Vite React application that consumes shared UI components from packages/ui.

### apps/web

    apps/web/
    ├── components.json
    ├── eslint.config.js
    ├── index.html
    ├── package.json
    ├── tsconfig.app.json
    ├── tsconfig.json
    ├── tsconfig.node.json
    ├── vite.config.ts
    └── src/
        ├── App.tsx
        ├── main.tsx
        ├── components/
        └── views/

#### apps/web directory descriptions

- components.json: shadcn configuration for the web app.
- eslint.config.js: ESLint rules for the web workspace.
- index.html: Vite HTML entry point.
- package.json: app-specific dependencies and scripts.
- tsconfig.app.json: TypeScript settings for the browser app code.
- tsconfig.node.json: TypeScript settings for Vite/node-side config files.
- tsconfig.json: workspace TypeScript entry config for the app.
- vite.config.ts: Vite build and dev-server configuration.
- src/: application source code.
- src/App.tsx: top-level React app component.
- src/main.tsx: React DOM bootstrap entry.
- src/components/: local app components.
- src/views/: page-level views and screens.

### apps/web/src/components

- post.component.tsx: post UI component used by the feed.
- theme-provider.tsx: theme/context provider for the app.
- .gitkeep: placeholder so the directory stays in git even if emptied.

### apps/web/src/views

- Feed.tsx: main feed view rendered by the app.

## packages

    packages/
    └── ui/

- packages/: shared workspace packages used across apps.
- packages/ui/: reusable shadcn-based UI component library consumed by the web app.

### packages/ui

    packages/ui/
    ├── components.json
    ├── eslint.config.js
    ├── package.json
    ├── tsconfig.json
    ├── tsconfig.lint.json
    └── src/
        ├── components/
        ├── hooks/
        ├── lib/
        └── styles/

#### packages/ui directory descriptions

- components.json: shadcn configuration for the shared UI package.
- eslint.config.js: ESLint rules for the UI workspace.
- package.json: shared UI package dependencies, scripts, and exports.
- tsconfig.json: TypeScript config for the package.
- tsconfig.lint.json: TypeScript config used by linting.
- src/: source for the reusable UI package.
- src/components/: shared UI components exported to apps.
- src/hooks/: reusable React hooks for the shared package.
- src/lib/: utility helpers used by UI components.
- src/styles/: shared global styles and theme tokens.

### packages/ui/src/components

- button.tsx: shared Button component built with shadcn patterns.
- card.tsx: shared Card component.
- .gitkeep: placeholder so the folder remains in version control.

### packages/ui/src/hooks

- .gitkeep: placeholder for future shared hooks.

### packages/ui/src/lib

- utils.ts: helper utilities such as class name merging.
- .gitkeep: placeholder for future library helpers.

### packages/ui/src/styles

- globals.css: shared Tailwind and shadcn global theme styles.

## Notes

- The monorepo uses npm workspaces with `apps/*` and `packages/*`.
- `apps/web` depends on `@workspace/ui` for shared components.
- The shared UI package exposes components, hooks, utilities, and global styles through package exports.
