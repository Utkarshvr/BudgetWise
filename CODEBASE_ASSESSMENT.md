# Codebase Structure & Modularity Assessment

## Current Structure Overview

```
expo/
├── src/
│   ├── app/                    # Expo Router app structure
│   │   ├── (auth)/            # Protected routes
│   │   └── (public)/           # Public routes
│   ├── screens/                # Feature-based screens
│   │   ├── accounts/
│   │   ├── auth/
│   │   ├── categories/
│   │   ├── transactions/
│   │   ├── stats/
│   │   ├── settings/
│   │   ├── funds/             # Empty components folder
│   │   └── tests/             # Test files mixed with screens
│   ├── components/             # Shared components
│   │   ├── funds/             # Fund components (inconsistent location)
│   │   ├── icons/
│   │   └── LogoIcon.tsx
│   ├── lib/                    # Core libraries & utilities
│   ├── utils/                  # Utility functions
│   ├── types/                  # Type definitions
│   ├── hooks/                  # Custom hooks
│   ├── constants/              # Constants
│   └── config/                 # Configuration
```

## Strengths ✅

1. **Feature-based organization**: Screens are well-organized by feature (accounts, categories, transactions, etc.)
2. **Consistent screen structure**: Each screen has `components/`, `hooks/`, and `utils/` subdirectories
3. **Type safety**: Dedicated `types/` directory with TypeScript definitions
4. **Path aliases**: `@/*` alias configured for cleaner imports
5. **Barrel exports**: Some utils directories use `index.ts` for cleaner imports
6. **Separation of concerns**: Clear distinction between screens, components, and utilities

## Issues Identified ⚠️

### 1. **Component Duplication**
- **Problem**: `FullScreenLoader` component is duplicated in 3 locations:
  - `src/screens/accounts/components/FullScreenLoader.tsx`
  - `src/screens/categories/components/FullScreenLoader.tsx`
  - `src/screens/transactions/components/FullScreenLoader.tsx`
- **Impact**: Code duplication, maintenance burden, inconsistent implementations

### 2. **Inconsistent Component Organization**
- **Problem**: Fund components are split between:
  - `src/components/funds/` (FundAdjustSheet, FundCreateSheet)
  - `src/screens/funds/components/` (empty directory)
- **Impact**: Confusion about where to place fund-related components

### 3. **Mixed Concerns in `lib/` and `utils/`**
- **Problem**: Unclear distinction between `src/lib/` and `src/utils/`:
  - `lib/` contains: utilities (cn.ts), business logic (categoryFunds.ts), auth (google-auth.ts)
  - `utils/` contains: errorHandler, funds computation
- **Impact**: Developers unsure where to place new code

### 4. **Cross-Feature Dependencies**
- **Problem**: Components from one feature used in another:
  - `src/screens/accounts/components/AccountAdjustmentSheet.tsx` imports `PrimaryButton` from `@/screens/auth/components/PrimaryButton`
- **Impact**: Tight coupling between features, harder to refactor

### 5. **Missing Barrel Exports**
- **Problem**: No index files in:
  - `src/lib/`
  - `src/utils/`
  - `src/components/`
  - `src/hooks/`
- **Impact**: Verbose imports, harder to discover available utilities

### 6. **Test Files Location**
- **Problem**: `src/screens/tests/` contains test/demo files mixed with production code
- **Impact**: Tests should be separate from production code

### 7. **Inconsistent Naming**
- **Problem**: Some components use PascalCase files, some use kebab-case in imports
- **Impact**: Inconsistency makes codebase harder to navigate

### 8. **Empty Directories**
- **Problem**: `src/screens/funds/components/` is empty
- **Impact**: Unclear structure, potential confusion

## Recommended Improvements 🚀

### Priority 1: High Impact, Low Effort

#### 1.1 Consolidate Duplicate Components
**Action**: Move `FullScreenLoader` to shared components
```
src/components/ui/FullScreenLoader.tsx
```
- Remove duplicates from screen-specific folders
- Update all imports to use the shared version
- Use the most flexible implementation (transactions version with props)

#### 1.2 Create Barrel Exports
**Action**: Add index files for easier imports
```
src/lib/index.ts          # Export all lib utilities
src/utils/index.ts        # Export all utils
src/components/index.ts   # Export shared components
src/hooks/index.ts        # Export all hooks
```

#### 1.3 Reorganize Fund Components
**Action**: Consolidate fund components
- Move `src/components/funds/` → `src/screens/funds/components/`
- OR move to `src/components/funds/` and remove empty `src/screens/funds/components/`
- **Recommendation**: Keep in `src/components/funds/` if used across multiple screens

### Priority 2: Medium Impact, Medium Effort

#### 2.1 Clarify `lib/` vs `utils/` Separation
**Recommended Structure**:
```
src/lib/              # External service integrations & core utilities
  ├── supabase.ts     # External service client
  ├── google-auth.ts  # External service integration
  ├── auth-*.ts       # Auth-related integrations
  └── cn.ts           # Core utility (class name helper)

src/utils/            # Pure utility functions & helpers
  ├── errorHandler.ts # Error handling utilities
  ├── funds.ts        # Business logic utilities
  ├── formatting.ts   # Formatting helpers (if shared)
  └── validation.ts   # Validation helpers (if needed)
```

**Action**: 
- Move business logic from `lib/categoryFunds.ts` → `utils/categoryFunds.ts` or keep in `lib/` if it's a service wrapper
- Document the distinction in a README

#### 2.2 Extract Shared UI Components
**Action**: Move reusable components to `src/components/ui/`
```
src/components/ui/
  ├── FullScreenLoader.tsx
  ├── PrimaryButton.tsx      # Move from auth/components
  ├── FormField.tsx          # Move from auth/components
  └── EmptyState.tsx         # Consolidate if similar across screens
```

#### 2.3 Organize Components by Type
**Recommended Structure**:
```
src/components/
  ├── ui/              # Reusable UI components (buttons, loaders, etc.)
  ├── forms/           # Form-related components
  ├── layout/          # Layout components
  ├── funds/           # Fund-specific components
  ├── icons/           # Icon components
  └── index.ts         # Barrel export
```

### Priority 3: High Impact, Higher Effort

#### 3.1 Move Test Files
**Action**: Create proper test structure
```
tests/                 # At root level
  ├── screens/
  ├── components/
  └── utils/
```
OR use a testing framework structure:
```
__tests__/            # Next to source files (Jest convention)
src/screens/accounts/__tests__/
```

#### 3.2 Create Feature Modules
**Action**: Better encapsulate features with barrel exports
```
src/screens/accounts/
  ├── index.ts        # Export main screen component
  ├── AccountsScreen.tsx
  ├── components/
  │   └── index.ts    # Export all components
  ├── hooks/
  │   └── index.ts    # Export all hooks
  └── utils/
      └── index.ts    # Already exists ✓
```

#### 3.3 Establish Import Rules
**Action**: Create import guidelines
- Features should not import from other features' `components/` directly
- Use `@/components/ui/` for shared UI
- Use `@/lib/` or `@/utils/` for utilities
- Use `@/types/` for types

### Priority 4: Nice to Have

#### 4.1 Add Documentation
- Create `src/README.md` explaining folder structure
- Document `lib/` vs `utils/` distinction
- Add JSDoc comments to exported functions

#### 4.2 Standardize File Naming
- Use PascalCase for component files: `FullScreenLoader.tsx`
- Use camelCase for utility files: `errorHandler.ts`
- Use kebab-case for config files: `app.config.ts`

#### 4.3 Add Path Aliases for Common Patterns
```json
{
  "paths": {
    "@/*": ["./src/*"],
    "@/components/*": ["./src/components/*"],
    "@/screens/*": ["./src/screens/*"],
    "@/lib/*": ["./src/lib/*"],
    "@/utils/*": ["./src/utils/*"],
    "@/types/*": ["./src/types/*"]
  }
}
```

## Proposed Final Structure

```
src/
├── app/                    # Expo Router routes
├── screens/                # Feature screens
│   ├── accounts/
│   │   ├── index.ts       # Export main component
│   │   ├── AccountsScreen.tsx
│   │   ├── components/
│   │   │   └── index.ts
│   │   ├── hooks/
│   │   │   └── index.ts
│   │   └── utils/
│   │       └── index.ts
│   └── [other features]/
├── components/             # Shared components
│   ├── ui/                # Reusable UI components
│   │   ├── FullScreenLoader.tsx
│   │   ├── PrimaryButton.tsx
│   │   └── FormField.tsx
│   ├── funds/             # Fund-specific components
│   ├── icons/
│   └── index.ts
├── lib/                    # External integrations & core
│   ├── supabase.ts
│   ├── google-auth.ts
│   ├── auth-*.ts
│   ├── cn.ts
│   └── index.ts
├── utils/                  # Pure utility functions
│   ├── errorHandler.ts
│   ├── funds.ts
│   └── index.ts
├── hooks/                  # Shared hooks
│   ├── useSupabaseSession.ts
│   └── index.ts
├── types/                  # Type definitions
├── constants/              # Constants
├── config/                 # Configuration
└── README.md               # Structure documentation
```

## Migration Checklist

- [ ] Consolidate `FullScreenLoader` components
- [ ] Create barrel exports (`index.ts`) for `lib/`, `utils/`, `components/`, `hooks/`
- [ ] Move fund components to consistent location
- [ ] Extract shared UI components (`PrimaryButton`, `FormField`) to `components/ui/`
- [ ] Document `lib/` vs `utils/` distinction
- [ ] Move test files to proper test directory
- [ ] Update all imports to use new structure
- [ ] Add `src/README.md` with structure documentation
- [ ] Remove empty directories
- [ ] Standardize file naming conventions

## Benefits of Improvements

1. **Reduced Duplication**: Single source of truth for shared components
2. **Better Discoverability**: Barrel exports make it easier to find and use utilities
3. **Clearer Organization**: Consistent structure across features
4. **Easier Maintenance**: Changes to shared components affect all usages
5. **Improved Developer Experience**: Clear guidelines on where to place new code
6. **Better Testability**: Separated test files make testing more organized
7. **Reduced Coupling**: Shared components in `components/ui/` reduce cross-feature dependencies

