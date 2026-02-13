import postcss from "postcss";
import { parse as parseCulori, oklch, formatCss } from "culori";
import { readFileSync, writeFileSync } from "fs";

const filePaths = process.argv.slice(2);

// Display usage if no files provided
if (filePaths.length === 0) {
  console.log("Usage: bun convert.ts <file.css> [file2.css ...]");
  console.log("Converts hex colors to oklch() with @supports fallback");
  process.exit(1);
}

/**
 * Regex to match pure hex colors (3-8 digits, with # prefix)
 * Anchored with ^ and $ to avoid matching partial strings like url(#icon)
 */
const HEX_REGEX = /^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6,8})$/;

/**
 * Check if a string value is a hex color
 * Trims whitespace to handle CSS value normalization
 */
function isHexColor(value: string): boolean {
  return HEX_REGEX.test(value.trim());
}

/**
 * Convert a hex color to oklch() format with proper formatting
 * Formats output as: oklch(L C H) with 3 significant figures per component
 * Returns null if conversion fails
 */
function hexToOklch(hex: string): string | null {
  try {
    const parsed = parseCulori(hex);
    if (!parsed) return null;
    const converted = oklch(parsed);
    if (!converted) return null;

    // Extract L, C, H values and format with appropriate precision
    const l = converted.l ?? 0;
    const c = converted.c ?? 0;
    const h = converted.h ?? 0;

    // Format each component:
    // - L (lightness): 0-1, show 3 decimals when needed
    // - C (chroma): 0-0.4, show 3 decimals
    // - H (hue): 0-360, show 2 decimals
    const formatComponent = (val: number, decimals: number): string => {
      return val.toFixed(decimals).replace(/\.?0+$/, "");
    };

    const lStr = formatComponent(l, 3);
    const cStr = formatComponent(c, 3);
    const hStr = formatComponent(h, 2);

    return `oklch(${lStr} ${cStr} ${hStr})`;
  } catch (error) {
    console.warn(`Failed to convert ${hex}: ${error}`);
    return null;
  }
}

/**
 * Check if a node is inside an existing @supports block
 * Walks up the parent chain to find any @supports ancestor
 */
function isInsideSupports(node: postcss.Node): boolean {
  let current = node.parent;
  while (current) {
    if (current.type === "atrule" && (current as postcss.AtRule).name === "supports") {
      return true;
    }
    current = current.parent;
  }
  return false;
}

/**
 * Process a single CSS file
 * - Finds all rules with hex color declarations
 * - Groups them into @supports blocks
 * - Preserves original hex values as fallback
 * - Also handles root-level declarations (CSS variables)
 */
function processFile(filePath: string): void {
  try {
    const css = readFileSync(filePath, "utf-8");
    const root = postcss.parse(css);

    // Collect rules that need @supports blocks
    const rulesToProcess: Array<{
      rule: postcss.Rule;
      hexDecls: Array<{ decl: postcss.Declaration; oklch: string }>;
    }> = [];

    // Collect root-level declarations with hex colors (for CSS variables)
    const rootHexDecls: Array<{ decl: postcss.Declaration; oklch: string }> = [];

    // Walk through all rules in the CSS
    root.walkRules((rule) => {
      // Skip if this rule is already inside a @supports block
      if (isInsideSupports(rule)) {
        return;
      }

      // Collect hex color declarations in this rule
      const hexDecls: Array<{ decl: postcss.Declaration; oklch: string }> = [];

      rule.walkDecls((decl) => {
        if (isHexColor(decl.value)) {
          const oklchValue = hexToOklch(decl.value);
          if (oklchValue) {
            hexDecls.push({ decl, oklch: oklchValue });
          }
        }
      });

      // If we found hex colors, mark this rule for processing
      if (hexDecls.length > 0) {
        rulesToProcess.push({ rule, hexDecls });
      }
    });

    // Walk through root-level declarations (CSS variables)
    root.walkDecls((decl) => {
      // Only process root-level declarations (direct children of root)
      if (decl.parent !== root) {
        return;
      }

      // Skip if parent is an @supports block
      if (isInsideSupports(decl)) {
        return;
      }

      if (isHexColor(decl.value)) {
        const oklchValue = hexToOklch(decl.value);
        if (oklchValue) {
          rootHexDecls.push({ decl, oklch: oklchValue });
        }
      }
    });

    // Process regular rules with hex colors
    rulesToProcess.forEach(({ rule, hexDecls }) => {
      // Create a new rule with the same selector but oklch values
      const supportedRule = postcss.rule({ selector: rule.selector });
      hexDecls.forEach(({ decl, oklch }) => {
        supportedRule.append(postcss.decl({ prop: decl.prop, value: oklch }));
      });

      // Create the @supports block
      const supportsBlock = postcss.atRule({
        name: "supports",
        params: "(color: oklch(0 0 0))",
      });
      supportsBlock.append(supportedRule);

      // Insert the @supports block after the original rule
      rule.parent!.insertAfter(rule, supportsBlock);
    });

    // Process root-level hex declarations (CSS variables)
    if (rootHexDecls.length > 0) {
      // Create a :root rule with oklch values
      const rootRule = postcss.rule({ selector: ":root" });
      rootHexDecls.forEach(({ decl, oklch }) => {
        rootRule.append(postcss.decl({ prop: decl.prop, value: oklch }));
      });

      // Create the @supports block
      const supportsBlock = postcss.atRule({
        name: "supports",
        params: "(color: oklch(0 0 0))",
      });
      supportsBlock.append(rootRule);

      // Add @supports block at the end of the root
      root.append(supportsBlock);
    }

    // Write the modified CSS back to the file
    writeFileSync(filePath, root.toString());
    console.log(`✓ Converted ${filePath}`);
  } catch (error) {
    console.error(`✗ Error processing ${filePath}: ${error}`);
  }
}

// Process all provided files
filePaths.forEach(processFile);
console.log("Done!");
