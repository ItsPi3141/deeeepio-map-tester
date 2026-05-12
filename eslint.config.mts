import js from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
	globalIgnores(["**/.next/**", "**/node_modules/**", "**/out/**", "**/build/**", "**/coverage/**"]),
	{
		files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
		plugins: { js },
		extends: ["js/recommended"],
		languageOptions: { globals: globals.browser },
	},
	tseslint.configs.recommendedTypeChecked,
	{ languageOptions: { parserOptions: { projectService: { allowDefaultProject: [] } } } },
	pluginReact.configs.flat.recommended,
	{ rules: { "react/no-unescaped-entities": "off" } },
	{ rules: { "@typescript-eslint/no-deprecated": "warn", "@typescript-eslint/no-unused-vars": "warn" } },
]);
