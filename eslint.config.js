import js from "@eslint/js";
import globals from "globals";
export default [{ ignores: ["dist/**", "coverage/**", "node_modules/**", "scripts/private-artifact-policy.cjs", "scripts/verify-private-artifacts.cjs", "scripts/release-changelog.mjs"] }, js.configs.recommended, { files: ["**/*.cjs", "**/*.js"], languageOptions: { globals: globals.node } }];
