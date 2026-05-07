module.exports = {
    root: true,
    env: {
        browser: true,
        es2021: true,
        node: true
    },
    extends: [
        'eslint:recommended',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
        'plugin:react/jsx-runtime'
    ],
    parserOptions: {
        ecmaFeatures: {
            jsx: true
        },
        ecmaVersion: 'latest',
        sourceType: 'module'
    },
    plugins: ['react', 'react-hooks', 'react-refresh'],
    settings: {
        react: {
            version: 'detect'
        }
    },
    ignorePatterns: ['dist/', 'node_modules/'],
    rules: {
        'react/prop-types': 'off',
        'react/no-unescaped-entities': 'off',
        'no-unused-vars': 'off',
        'no-empty': 'off',
        'react-hooks/exhaustive-deps': 'off',
        'react-refresh/only-export-components': 'off'
    }
};
