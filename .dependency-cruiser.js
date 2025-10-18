/**
 * ORION Dependency Cruiser Configuration
 *
 * This configuration defines rules for analyzing and validating
 * dependencies across the ORION microservices platform.
 */

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment:
        'This dependency is part of a circular relationship. You might want to revise ' +
        'your solution (e.g. by breaking the circular relationship).',
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: 'no-orphans',
      severity: 'warn',
      comment:
        "This is an orphan module - it's likely not used (anymore?). Either use it or " +
        "remove it. If it's logical this module is an orphan (i.e. it's a config file), " +
        "add an exception for it.",
      from: {
        orphan: true,
        pathNot: [
          '(^|/)\\.[^/]+\\.(js|cjs|mjs|ts|json)$', // dot files
          '\\.d\\.ts$', // TypeScript declaration files
          '(^|/)tsconfig\\.json$', // TypeScript config
          '(^|/)(babel|webpack)\\.config\\.(js|cjs|mjs|ts)$', // build configs
          '(^|/)jest\\.config\\.(js|cjs|mjs|ts)$', // test configs
          '(^|/)\\.(eslint|prettier)rc\\.(js|cjs|json)$', // linter configs
          '(^|/)project\\.json$', // Nx project config
        ],
      },
      to: {},
    },
    {
      name: 'no-deprecated-core',
      severity: 'warn',
      comment:
        'A module depends on a node core module that has been deprecated. Find an alternative.',
      from: {},
      to: {
        dependencyTypes: ['core'],
        path: [
          '^(v8/tools/codemap)$',
          '^(v8/tools/consarray)$',
          '^(v8/tools/csvparser)$',
          '^(v8/tools/logreader)$',
          '^(v8/tools/profile_view)$',
          '^(v8/tools/profile)$',
          '^(v8/tools/SourceMap)$',
          '^(v8/tools/splaytree)$',
          '^(v8/tools/tickprocessor-driver)$',
          '^(v8/tools/tickprocessor)$',
          '^(node-inspect/lib/_inspect)$',
          '^(node-inspect/lib/internal/inspect_client)$',
          '^(node-inspect/lib/internal/inspect_repl)$',
        ],
      },
    },
    {
      name: 'not-to-deprecated',
      severity: 'warn',
      comment:
        'This module uses a (version of an) npm module that has been deprecated. Either upgrade to a later ' +
        'version of that module, or find an alternative.',
      from: {},
      to: {
        dependencyTypes: ['deprecated'],
      },
    },
    {
      name: 'no-non-package-json',
      severity: 'error',
      comment:
        "This module depends on an npm package that isn't in the 'dependencies' section of your package.json. " +
        "That's problematic as the package either (1) won't be available on live (2) will be " +
        "available on live with an non-guaranteed version. Fix it by adding the package to the dependencies " +
        "in your package.json.",
      from: {},
      to: {
        dependencyTypes: ['npm-no-pkg', 'npm-unknown'],
      },
    },
    {
      name: 'not-to-unresolvable',
      severity: 'error',
      comment:
        "This module depends on a module that cannot be found ('resolved to disk'). If it's an npm " +
        'module: add it to your package.json. In all other cases: adjust your path.',
      from: {},
      to: {
        couldNotResolve: true,
      },
    },
    {
      name: 'no-duplicate-dep-types',
      severity: 'warn',
      comment:
        "Likely this module depends on an external ('npm') package that occurs more than once " +
        "in your package.json i.e. both in dependencies and in devDependencies. This will cause " +
        'maintenance problems later on.',
      from: {},
      to: {
        moreThanOneDependencyType: true,
        // Only warn for packages that appear in both dependencies and devDependencies
        dependencyTypesNot: ['type-only'],
      },
    },
    {
      name: 'not-to-spec',
      severity: 'error',
      comment:
        'This module depends on a spec (test) file. The sole responsibility of a spec file is to test code. ' +
        "If there's something in a spec that's of use to other modules, it doesn't have that single " +
        'responsibility anymore. Factor it out into (e.g.) a separate utility/ helper or a mock.',
      from: {
        pathNot: '\\.(spec|test)\\.(js|mjs|cjs|ts|ls|coffee|litcoffee|coffee\\.md)$',
      },
      to: {
        path: '\\.(spec|test)\\.(js|mjs|cjs|ts|ls|coffee|litcoffee|coffee\\.md)$',
      },
    },
    {
      name: 'not-to-dev-dep',
      severity: 'error',
      comment:
        "This module depends on an npm package from the 'devDependencies' section of your " +
        'package.json. It looks like something that ships to production, though. To prevent problems ' +
        "with npm packages that aren't there on production declare it (only!) in the 'dependencies'" +
        'section of your package.json. If this module is development only - add it to the ' +
        'from.pathNot re of the not-to-dev-dep rule in the dependency-cruiser configuration',
      from: {
        path: '^(packages)',
        pathNot: [
          '\\.(spec|test)\\.(js|mjs|cjs|ts|ls|coffee|litcoffee|coffee\\.md)$',
          '^(packages/dev-tools)',
          '^(packages/e2e)',
          '^(packages/performance)',
          'test-setup\\.(js|ts)$',
        ],
      },
      to: {
        dependencyTypes: ['npm-dev'],
        pathNot: [
          'node_modules/@types/',
          'node_modules/@nestjs/testing',
        ],
      },
    },
    {
      name: 'optional-deps-used',
      severity: 'info',
      comment:
        'This module depends on an npm package that is declared as an optional dependency ' +
        "in your package.json. As this makes sense in limited situations only, it's flagged here. " +
        "If you're using an optional dependency here by design - add an exception to your" +
        'dependency-cruiser configuration.',
      from: {},
      to: {
        dependencyTypes: ['npm-optional'],
      },
    },
    {
      name: 'peer-deps-used',
      severity: 'warn',
      comment:
        'This module depends on an npm package that is declared as a peer dependency ' +
        'in your package.json. This makes sense if your package is a plugin, but in other cases ' +
        "- you should seriously consider not using peer dependencies. If you're using a peer " +
        'dependency here by design - add an exception to your dependency-cruiser configuration.',
      from: {},
      to: {
        dependencyTypes: ['npm-peer'],
      },
    },
    // Custom ORION rules
    {
      name: 'no-frontend-to-backend',
      severity: 'error',
      comment:
        'Frontend code should not directly import backend code. Use API calls instead.',
      from: {
        path: '^packages/admin-ui/src/frontend',
      },
      to: {
        path: '^packages/admin-ui/src/app',
      },
    },
    {
      name: 'no-service-to-service-direct-import',
      severity: 'error',
      comment:
        'Services should not directly import from other services. Use the shared package or message queues.',
      from: {
        path: '^packages/(auth|user|notifications|gateway)',
      },
      to: {
        path: '^packages/(auth|user|notifications|gateway)',
        pathNot: '$1', // Allow imports from same package
      },
    },
    {
      name: 'shared-only-exports',
      severity: 'warn',
      comment:
        'The shared package should only export types, interfaces, and utilities - not implementations.',
      from: {},
      to: {
        path: '^packages/shared',
      },
    },
  ],
  options: {
    doNotFollow: {
      path: [
        'node_modules',
        'dist',
        'coverage',
        '\\.nx',
        'tmp',
      ],
      dependencyTypes: [
        'npm',
        'npm-dev',
        'npm-optional',
        'npm-peer',
        'npm-bundled',
        'npm-no-pkg',
      ],
    },
    includeOnly: [
      '^packages',
    ],
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: './tsconfig.base.json',
    },
    combinedDependencies: false,
    externalModuleResolutionStrategy: 'node_modules',
    reporterOptions: {
      dot: {
        collapsePattern: 'node_modules/(@[^/]+/[^/]+|[^/]+)',
        theme: {
          graph: {
            splines: 'ortho',
            rankdir: 'TB',
            ranksep: '1',
            nodesep: '0.5',
          },
          modules: [
            {
              criteria: { source: '^packages/auth' },
              attributes: { fillcolor: '#e74c3c', fontcolor: 'white' },
            },
            {
              criteria: { source: '^packages/user' },
              attributes: { fillcolor: '#2ecc71', fontcolor: 'white' },
            },
            {
              criteria: { source: '^packages/gateway' },
              attributes: { fillcolor: '#3498db', fontcolor: 'white' },
            },
            {
              criteria: { source: '^packages/notifications' },
              attributes: { fillcolor: '#f39c12' },
            },
            {
              criteria: { source: '^packages/shared' },
              attributes: { fillcolor: '#9b59b6', fontcolor: 'white' },
            },
            {
              criteria: { source: '^packages/admin-ui' },
              attributes: { fillcolor: '#1abc9c', fontcolor: 'white' },
            },
          ],
          dependencies: [
            {
              criteria: { resolved: '^packages/shared' },
              attributes: { color: '#9b59b6' },
            },
          ],
        },
      },
      archi: {
        collapsePattern: '^packages/([^/]+)',
      },
      text: {
        highlightFocused: true,
      },
    },
  },
};
