# TypeScript Migration Strategy: v4.2.3 to v5.x

## 1. Overview

| Item | Details |
|---|---|
| **Current TypeScript version** | `^4.2.3` (`package.json` line 58) |
| **Target TypeScript version** | Latest 5.x (currently `^5.8.0`) |
| **Codebase size** | 4 TypeScript files (~180 lines total), 1 JS file copied as-is |
| **Overall difficulty** | Low |
| **Estimated effort** | 1-2 hours |

The TypeScript code itself requires **zero changes**. The main effort is cascading dependency upgrades for the dev toolchain (Jest, ESLint, Prettier, and type definitions) to versions that support TypeScript 5.x.

---

## 2. Pre-Migration: Fix Existing ESLint Bug

> **Priority: Do this first** -- the ESLint config is likely already broken.

The `.eslintrc.js` file (line 5) extends `'prettier/@typescript-eslint'`, which was **removed** in `eslint-config-prettier` v8. Since `package.json` already specifies `"eslint-config-prettier": "^8.1.0"`, running `npm run lint` is likely already failing.

**Fix:**

In `.eslintrc.js`, replace the extends entry:

```diff
  extends: [
      'plugin:@typescript-eslint/recommended',
-     'prettier/@typescript-eslint',
+     'prettier',
      'plugin:prettier/recommended',
  ],
```

This change is required regardless of the TypeScript upgrade and should be committed separately as a preparatory fix.

---

## 3. Phase 1 -- Upgrade TypeScript

**Action:** Update `typescript` from `^4.2.3` to `^5.8.0` (or latest 5.x) in `package.json`.

### tsconfig.json -- No Changes Needed

The current `tsconfig.json` settings are all fully supported in TypeScript 5.x:

```json
{
    "compilerOptions": {
        "declaration": true,
        "esModuleInterop": true,
        "lib": ["es2017"],
        "module": "commonjs",
        "outDir": "dist",
        "sourceMap": true,
        "target": "es2017"
    }
}
```

### Source Files -- No Changes Needed

The codebase uses only basic TypeScript features that are fully compatible with TS 5.x:

- Abstract classes (`BotClient.ts`)
- Async/await patterns (`LexClient.ts`)
- Simple types (`any`, `string`, `Promise<void>`)
- Standard imports/exports

No source file modifications are required.

---

## 4. Phase 2 -- Upgrade Jest Toolchain

The Jest toolchain must be upgraded because `ts-jest@26` does not support TypeScript 5.x.

| Package | Current Version | Target Version | Reason |
|---|---|---|---|
| `jest` | `^26.6.3` | `^29.0.0` | Required for ts-jest 29 compatibility |
| `ts-jest` | `^26.5.4` | `^29.0.0` | ts-jest 26 does not support TS 5.x |
| `@types/jest` | `^26.0.22` | `^29.0.0` | Must match Jest major version |

### jest.config.js -- No Changes Needed

The minimal configuration works identically with Jest 29:

```js
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
};
```

### Test Files -- No Changes Needed

The test file `src/lib/botClients/LexClient.test.ts` uses standard `jest.mock()` patterns that work identically in Jest 29. No test modifications are required.

### jest-junit

`jest-junit` at `^12.0.0` should be compatible with Jest 29, but can optionally be updated to the latest version.

---

## 5. Phase 3 -- Upgrade ESLint Toolchain

### Option A (Recommended): Stay on ESLint 8

This avoids the flat config migration and is the lower-risk path.

| Package | Current Version | Target Version |
|---|---|---|
| `eslint` | `^7.23.0` | `^8.0.0` |
| `@typescript-eslint/eslint-plugin` | `^4.21.0` | `^7.0.0` |
| `@typescript-eslint/parser` | `^4.21.0` | `^7.0.0` |
| `eslint-plugin-prettier` | `^3.3.1` | `^5.0.0` |
| `prettier` | `^2.2.1` | `^3.0.0` |

The `.eslintrc.js` format is retained (with the `'prettier/@typescript-eslint'` to `'prettier'` fix from the pre-migration phase).

### Option B: Upgrade to ESLint 9

This requires migrating `.eslintrc.js` to the new flat config format (`eslint.config.js`). While this future-proofs the setup, it involves significantly more work:

- Rewrite `.eslintrc.js` as `eslint.config.mjs` using the new flat config API
- Upgrade `@typescript-eslint/eslint-plugin` and `@typescript-eslint/parser` to `^8.0.0` (v8 is required for ESLint 9 support; v7 only supports ESLint 8)
- Upgrade `eslint-plugin-prettier` to `^5.0.0` and `prettier` to `^3.0.0`
- The `extends` syntax is removed; configs are imported as modules and spread into a flat array
- The `parser` field moves inside `languageOptions.parser`

**Recommendation:** Use Option A for this migration. ESLint 9 migration can be done as a separate follow-up task.

---

## 6. Phase 4 -- Update Remaining Type Definitions

| Package | Current Version | Target Version | Reason |
|---|---|---|---|
| `@types/node` | `^14.14.37` | `^20.0.0` | Match minimum supported Node.js version |

Update `@types/node` to align with the minimum Node.js version you intend to support. The `engines` field in `package.json` currently allows Node 10-22, but Node 14 is EOL. Consider narrowing the `engines` field as part of this update.

---

## 7. Phase 5 -- Validation

After completing all dependency upgrades, run the following validation steps in order:

### Step 1: Clean Install

```bash
rm -rf node_modules package-lock.json
npm install
```

### Step 2: Build

```bash
npm run build
```

This runs `tsc` and verifies clean compilation with the new TypeScript version.

### Step 3: Test

```bash
npm test
```

This runs Jest and verifies all tests pass with the upgraded Jest/ts-jest toolchain.

### Step 4: Lint

```bash
npm run lint
```

This verifies no new ESLint errors are introduced by the upgraded ESLint toolchain.

### Step 5: Manual Smoke Test

```bash
node dist/cli.js --help
```

Verify the CLI entry point (`dist/cli.js`) loads and runs without errors.

---

## 8. Optional / Out of Scope

These items are **not required** for the TypeScript upgrade but are worth noting for future work:

| Item | Details |
|---|---|
| **cucumber** | `cucumber@^6.0.5` has been renamed to `@cucumber/cucumber`. Consider migrating to the new package name. |
| **aws-sdk** | `aws-sdk@^2.880.0` is in maintenance mode. Consider migrating to AWS SDK v3 (`@aws-sdk/*` modular packages) for reduced bundle size and active development. |
| **Node.js engines** | The `engines` field supports Node 10+, but Node 10, 12, 14, and 15 are all EOL. Consider narrowing to `^18 \|\| ^20 \|\| ^22`. |

---

## 9. Summary Table

| # | Package | Current Version | Target Version | Reason for Upgrade |
|---|---|---|---|---|
| 1 | `typescript` | `^4.2.3` | `^5.8.0` | Primary upgrade target |
| 2 | `jest` | `^26.6.3` | `^29.0.0` | Required for ts-jest 29 |
| 3 | `ts-jest` | `^26.5.4` | `^29.0.0` | ts-jest 26 does not support TS 5.x |
| 4 | `@types/jest` | `^26.0.22` | `^29.0.0` | Must match Jest major version |
| 5 | `eslint` | `^7.23.0` | `^8.0.0` | Support for updated typescript-eslint |
| 6 | `@typescript-eslint/eslint-plugin` | `^4.21.0` | `^7.0.0` | TS 5.x support |
| 7 | `@typescript-eslint/parser` | `^4.21.0` | `^7.0.0` | TS 5.x support |
| 8 | `eslint-config-prettier` | `^8.1.0` | `^8.1.0` (no change) | Already compatible |
| 9 | `eslint-plugin-prettier` | `^3.3.1` | `^5.0.0` | Prettier 3 compatibility |
| 10 | `prettier` | `^2.2.1` | `^3.0.0` | Latest major version |
| 11 | `@types/node` | `^14.14.37` | `^20.0.0` | Match supported Node.js version |
| 12 | `jest-junit` | `^12.0.0` | `^12.0.0` (no change) | Already compatible, optional update |

---

## 10. Risk Assessment

| Area | Risk Level | Notes |
|---|---|---|
| TypeScript code changes | **None** | Zero source file modifications needed |
| tsconfig changes | **None** | All current settings are fully supported in TS 5.x |
| Jest migration (26 to 29) | **Low** | Standard mock patterns, small test suite (1 test file) |
| ESLint migration (7 to 8) | **Low** | Small config, well-documented upgrade path |
| Prettier migration (2 to 3) | **Low** | Minimal config, may cause minor formatting differences |
| Runtime dependencies | **None** | No runtime dependency changes required |

**Overall Assessment:** Low difficulty. The codebase is small, uses only basic TypeScript features, and has a minimal test suite. The primary effort is updating `devDependencies` versions and verifying the toolchain works together. Estimated **1-2 hours** of hands-on work including validation.
