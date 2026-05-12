import { includeIgnoreFile } from "@eslint/compat";
import js from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import { defineConfig } from "eslint/config";
import globals from "globals";
import { fileURLToPath } from "node:url";
import tseslint from "typescript-eslint";

const gitignorePath = fileURLToPath(new URL(".gitignore", import.meta.url));

export default defineConfig([
	includeIgnoreFile(gitignorePath, "Imported .gitignore patterns"),
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
