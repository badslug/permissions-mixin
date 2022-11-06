Package.describe({
  name: 'badslug:permissions-mixin',
  version: '3.0.0',
  summary:
    'mdg:validated-method mixin for declarative definition of method permissions based on roles',
  git: 'https://github.com/badslug/permissions-mixin.git',
  documentation: 'README.md',
});

Package.onUse(function (api) {
  api.versionsFrom('2.8.0');
  api.use(['ecmascript', 'check']);
  api.use('alanning:roles@3.4.0');
  api.use('mdg:validated-method@1.2.0');
  api.addFiles('permissions-mixin.js');
  api.export('PermissionsMixin');
});

Package.onTest(function (api) {
  api.use([
    'ecmascript',
    'accounts-password',
    'alanning:roles@3.4.0',
    'practicalmeteor:mocha@2.4.5_6',
    'practicalmeteor:chai@2.1.0_1',
    'aldeed:simple-schema@1.5.4',
    'mdg:validated-method@1.2.0',
    'mongo',
    'badslug:permissions-mixin',
  ]);

  api.addFiles('permissions-mixin-tests.js');
});
