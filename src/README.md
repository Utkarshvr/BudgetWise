# Source Code Structure

This document describes the organization and conventions used in the `src/` directory.

## Directory Structure

```
src/
├── app/                    # Expo Router file-based routing
│   ├── (auth)/            # Protected routes (require authentication)
│   └── (public)/          # Public routes (auth screens, onboarding)
├── screens/               # Feature-based screen components
│   ├── accounts/          # Account management feature
│   ├── auth/              # Authentication screens
│   ├── categories/        # Category management feature
│   ├── transactions/      # Transaction management feature
│   ├── stats/             # Statistics and analytics
│   ├── settings/          # App settings
│   └── onboarding/        # User onboarding
├── components/            # Shared React components
│   ├── ui/                # Reusable UI components (buttons, loaders, forms)
│   ├── funds/             # Fund-specific components
│   └── icons/             # Icon components
├── lib/                   # External service integrations & core utilities
│   ├── supabase.ts        # Supabase client configuration
│   ├── google-auth.ts     # Google authentication integration
│   ├── auth-*.ts          # Authentication utilities
│   └── categoryFunds.ts   # Category fund service operations
├── utils/                 # Pure utility functions (no side effects)
│   ├── errorHandler.ts    # Error message extraction and formatting
│   └── funds.ts           # Fund computation utilities
├── hooks/                 # Shared React hooks
├── types/                 # TypeScript type definitions
├── constants/             # Application constants (colors, themes, etc.)
└── config/                # Configuration files
```

## Key Conventions

### Import Paths

Use the `@/` alias for all imports from the `src/` directory:

```typescript
// ✅ Good
import { FullScreenLoader } from "@/components/ui";
import { supabase } from "@/lib";
import { getErrorMessage } from "@/utils";
import { useSupabaseSession } from "@/hooks";

// ❌ Avoid
import { FullScreenLoader } from "../../components/ui/FullScreenLoader";
import { supabase } from "../lib/supabase";
```

### Barrel Exports

All major directories use barrel exports (`index.ts`) for cleaner imports:

- `@/components` - All shared components
- `@/components/ui` - UI components (FullScreenLoader, PrimaryButton, FormField)
- `@/lib` - All library integrations and core utilities
- `@/utils` - All utility functions
- `@/hooks` - All custom hooks

### `lib/` vs `utils/` Separation

**`lib/`** - External service integrations and core utilities:
- Supabase client configuration
- Authentication integrations (Google, OAuth)
- Service wrappers that interact with external APIs
- Core utilities that may have side effects (e.g., `cn` for class names)

**`utils/`** - Pure utility functions:
- No side effects
- No external service dependencies
- Pure functions that transform data
- Error handling utilities
- Data computation functions

**Example:**
```typescript
// lib/categoryFunds.ts - Service wrapper with Supabase calls
export async function createCategoryFund(...) {
  const { error } = await supabase.from("categories")...
}

// utils/funds.ts - Pure computation function
export function computeAccountFundTotals(categories: Category[]) {
  return categories.reduce(...);
}
```

### Component Organization

#### Shared Components (`src/components/`)

Components used across multiple features should be in `src/components/`:

- **`ui/`** - Reusable UI primitives (buttons, loaders, form fields)
- **`funds/`** - Fund-specific components used across features
- **`icons/`** - Icon components

#### Feature Components (`src/screens/{feature}/components/`)

Components specific to a single feature should live within that feature's directory:

```
src/screens/accounts/
  ├── AccountsScreen.tsx
  └── components/
      ├── AccountCard/
      ├── AccountFormSheet.tsx
      └── ...
```

### Screen Structure

Each feature screen follows a consistent structure:

```
screens/{feature}/
├── {Feature}Screen.tsx    # Main screen component
├── components/            # Feature-specific components
│   └── index.ts          # Barrel export (optional)
├── hooks/                # Feature-specific hooks
│   └── use{Feature}Data.ts
└── utils/                # Feature-specific utilities
    ├── formatting.ts
    ├── helpers.ts
    └── index.ts          # Barrel export
```

### Type Definitions

All TypeScript types are centralized in `src/types/`:

- `account.ts` - Account-related types
- `category.ts` - Category-related types
- `transaction.ts` - Transaction-related types
- `fund.ts` - Fund-related types
- `goal.ts` - Goal-related types

### Constants

Application-wide constants are in `src/constants/`:

- `theme.ts` - Theme colors and styling constants
- `categoryColors.ts` - Category color mappings
- `emojis.ts` - Emoji constants

## Best Practices

1. **No Cross-Feature Dependencies**: Features should not import components from other features. Use shared components in `src/components/` instead.

2. **Use Barrel Exports**: Import from directory barrels (`@/components`, `@/lib`) rather than individual files when available.

3. **Consistent Naming**:
   - Components: PascalCase (`FullScreenLoader.tsx`)
   - Utilities: camelCase (`errorHandler.ts`)
   - Hooks: camelCase with `use` prefix (`useSupabaseSession.ts`)

4. **Documentation**: Add JSDoc comments to exported functions and components.

5. **Type Safety**: Always use TypeScript types. Avoid `any` types.

6. **Separation of Concerns**: Keep business logic in hooks, presentation in components, and pure functions in utils.

## Testing

Test files are located in `__tests__/` at the root level, mirroring the `src/` structure:

```
__tests__/
└── screens/
    └── tests/
        └── charts/
```

## Migration Notes

- Old duplicate components have been consolidated:
  - `FullScreenLoader` → `src/components/ui/FullScreenLoader.tsx`
  - `PrimaryButton` → `src/components/ui/PrimaryButton.tsx`
  - `FormField` → `src/components/ui/FormField.tsx`

- All imports have been updated to use barrel exports where available.

