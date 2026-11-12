import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**'] },
  {
    files: ['src/**/*.ts', 'prisma/**/*.ts'],
    extends: [tseslint.configs.recommended],
  },
);
