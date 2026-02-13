# Batch OKLCH Converter

A TypeScript utility that converts hex color values to OKLCH color space with `@supports` fallback blocks. Supports both CSS and TypeScript/JavaScript object syntax.

## What It Does

- **Preserves hex colors** as fallbacks for older browsers
- **Generates `@supports` blocks** containing OKLCH equivalents for modern browsers
- **Groups properties** — all hex properties in a rule get one `@supports` block
- **Idempotent** — safe to run multiple times (skips existing `@supports` blocks)
- **Dual format support** — CSS files and TypeScript/JavaScript object literals
- **Handles edge cases** — nested rules, @media queries, non-color hex values

## Output Format

**Before:**
```css
.button {
  color: #ff6347;
  background: #abc;
}
```

**After:**
```css
.button {
  color: #ff6347;
  background: #abc;
}
@supports (color: oklch(0 0 0)) {
  .button {
    color: oklch(0.6962 0.1955 32.32);
    background: oklch(0.7844 0.0307 248.22);
  }
}
```

## Installation

```bash
bun install
```

## Usage

```bash
# CSS file
bun convert.ts styles.css

# TypeScript/JavaScript file
bun convert.ts theme.ts

# Multiple files (any mix of formats)
bun convert.ts styles.css theme.ts tokens.tsx

# With glob (zsh expands before bun)
bun convert.ts styles/**/*.css
bun convert.ts src/**/*.{ts,tsx}
```

## Features

### CSS File Format

#### Nested Rules in @media
`@supports` blocks are correctly nested inside `@media` queries:

```css
@media (max-width: 768px) {
  .card {
    background: #f0f0f0;
  }
  @supports (color: oklch(0 0 0)) {
    .card {
      background: oklch(0.9551 0 0);
    }
  }
}
```

#### Skips Existing @supports Blocks
If a rule is already inside an `@supports` block, it won't be processed again:

```css
@supports (color: oklch(0 0 0)) {
  .modern {
    color: oklch(62.7955% 0.2077 29.23);
  }
}
/* ↑ This stays as-is */
```

#### Smart Hex Detection
Only matches pure hex colors — won't touch:
- `url(#icon)` — SVG references
- `content: "#tag"` — string values
- Other non-color hex patterns

#### Idempotent
Run it as many times as you want — output stabilizes after the first run:

```bash
bun convert.ts file.css
bun convert.ts file.css  # File unchanged ✓
bun convert.ts file.css  # File unchanged ✓
```

### TypeScript/JavaScript File Format

For `.ts`, `.tsx`, `.js`, `.jsx` files with object literals:

**Before:**
```typescript
const styleOverrides = {
  ':root': {
    '--color-red-50': '#FEF2F2',
    '--color-blue-500': '#3B82F6',
  },
};
```

**After:**
```typescript
const styleOverrides = {
  ':root': {
    '--color-red-50': '#FEF2F2',
    '--color-blue-500': '#3B82F6',

    /**
     * OKLCH (https://oklch.com/) Color Primitives
     * Used for browsers that support the oklch() function.
     */
    '@supports (color: oklch(0 0 0))': {
      '--color-blue-500': 'oklch(0.623 0.188 259.81)',
      '--color-red-50': 'oklch(0.971 0.013 17.38)',
    },
  },
};
```

#### Key Features
- **Finds all hex color string values** in object literals
- **Alphabetically sorted** OKLCH properties for consistency
- **Preserves indentation** matching the original file
- **Automatic comment block** explaining the OKLCH colors
- **Idempotent** — skips files that already have `@supports` property

## Technical Details

### Color Space Conversion
Uses [Culori](https://github.com/evercoder/culori) for accurate hex → OKLCH conversion. OKLCH is a modern color space that's more perceptually uniform than sRGB.

### Regex Pattern
```typescript
/^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6,8})$/
```
- Anchored with `^` and `$` to match entire value only
- Supports 3-digit, 4-digit, 6-digit, and 8-digit hex
- Trims whitespace before matching

### CSS Parsing
Uses [PostCSS](https://postcss.org/) for robust CSS parsing and AST manipulation.

## Testing

A test fixture is included in `test/sample.css`. Run the converter on it to verify:

```bash
bun convert.ts test/sample.css
```

Check the output includes:
- ✓ `@supports` blocks after normal rules
- ✓ `@supports` blocks nested inside `@media` queries
- ✓ No double-processing of existing `@supports` blocks
- ✓ Only color properties converted (not `padding`, `font-size`, etc.)

## Error Handling

- **File not found** — logs error and continues to next file
- **Invalid CSS** — PostCSS error handling provides helpful messages
- **Conversion failure** — logs warning and skips that property
