/* global PermissionsMixin:true, Roles */
PermissionsMixin = function (methodOptions) {
  const DEFINITION_ERROR = 'PermissionsMixin.Definition';

  const checkMethodOption = function checkMethodOption(
    methodOptions,
    methodOptionName
  ) {
    if (methodOptions[methodOptionName]) {
      check(methodOptions[methodOptionName], Match.OneOf([Object], Boolean));

      if (Array.isArray(methodOptions[methodOptionName])) {
        if (methodOptions[methodOptionName].length === 0) {
          throw new Meteor.Error(
            DEFINITION_ERROR,
            `${methodOptionName} must have at least one document in it`
          );
        }

        methodOptions[methodOptionName].forEach(permitDoc => {
          try {
            check(permitDoc, {
              roles: Match.OneOf([String], String, Boolean),
              group: Match.OneOf([String], String, Boolean, Function, null),
              [methodOptionName]: Match.Optional(Function),
            });
          } catch (e) {
            throw new Meteor.Error(DEFINITION_ERROR, e.message);
          }
        });
      }
    }
  };

  const isInRole = function isInRole({ userId, roles, group }) {
    const allUserScopes = Roles.getScopesForUser(userId, group)
    // Any logged in user
    if (roles === true && group === true) {
      return !!userId;
    }

    // A user with any role in a particular group
    if (roles === true && typeof group === 'string') {
      return Roles.getRolesForUser(userId, group).length > 0;
    }

    // A user with any role in a particular array of groups
    if (roles === true && Array.isArray(group)) {
      let isInAnyRoleInScopeArray = Roles.getRolesForUser(userId).length > 0;
      group.forEach(function (_group) {
        isInAnyRoleInScopeArray =
          Roles.getRolesForUser(userId, _group).length > 0;
      });
      return isInAnyRoleInScopeArray;
    }

    // A user with a particular role in any group
    if (typeof roles === 'string' && group === true) {
      let isInRoleInAnyScope = Roles.userIsInRole(userId, roles);
      allUserScopes.forEach(function (_group) {
        isInRoleInAnyScope = Roles.userIsInRole(userId, roles, _group);
      });
      return isInRoleInAnyScope;
    }

    // A user with a particular role in a particular group
    if (typeof roles === 'string' && typeof group === 'string') {
      return Roles.userIsInRole(userId, roles, group);
    }

    // A user with a particular role in a particular array of groups
    if (typeof roles === 'string' && Array.isArray(group)) {
      let isInRoleInScopeArray = Roles.userIsInRole(userId, roles);
      group.forEach(function (_group) {
        isInRoleInScopeArray = Roles.userIsInRole(userId, roles, _group);
      });
      return isInRoleInScopeArray;
    }

    // A user in a particular array of roles in any group
    if (Array.isArray(roles) && group === true) {
      let isInRoleArrayInAnyScope = Roles.userIsInRole(userId, roles);
      allUserScopes.forEach(function (_group) {
        isInRoleArrayInAnyScope = Roles.userIsInRole(userId, roles, _group);
      });
      return isInRoleArrayInAnyScope;
    }

    // A user in a particular array of roles in a particular group
    if (Array.isArray(roles) && typeof group === 'string') {
      return Roles.userIsInRole(userId, roles, group);
    }

    // A user in a particular array of roles in a particular array of
    // groups
    if (Array.isArray(roles) && Array.isArray(group)) {
      let isInRoleArrayInScopeArray = Roles.userIsInRole(userId, roles);
      group.forEach(function (_group) {
        isInRoleArrayInScopeArray = Roles.userIsInRole(userId, roles, _group);
      });
      return isInRoleArrayInScopeArray;
    }
  };

  const isRole = function isRole(option, roleDoc, userId, args) {
    const { roles } = roleDoc;
    let { group } = roleDoc;
    const func = roleDoc[option];

    if (typeof group === 'function') {
      group = group.apply({ userId: userId }, args);
    }

    // Check to see if this role doc applies to this user
    if (isInRole({ userId, roles, group })) {
      // Check to see if user is allowed/denied
      if (func) {
        return roleDoc[option].apply({ userId: userId }, args);
      }
      return true;
    }
    return false;
  };

  const isDenied = function isDenied({ deny }, userId, args) {
    if (!deny) return true;
    if (!userId) return true;

    for (let i = 0; i < methodOptions.deny.length; i++) {
      if (isRole('deny', methodOptions.deny[i], userId, args) === true) {
        throw new Meteor.Error(
          methodOptions.permissionsError.name,
          methodOptions.permissionsError.message(userId)
        );
      }
    }
    return false;
  };

  const isAllowed = function isAllowed({ allow }, userId, args) {
    if (!allow) return false;

    if (allow === true) {
      return true;
    } else if (Array.isArray(allow)) {
      for (let i = 0; i < allow.length; i++) {
        if (isRole('allow', allow[i], userId, args) === true) {
          return true;
        }
      }
      throw new Meteor.Error(
        methodOptions.permissionsError.name,
        methodOptions.permissionsError.message(userId)
      );
    }
    throw new Meteor.Error(
      methodOptions.permissionsError.name,
      methodOptions.permissionsError.message(userId)
    );
  };

  const runFunc = methodOptions.run;

  methodOptions.run = function run() {
    const userId = this.userId;

    if (this.isTrusted === true) {
      return runFunc.apply(this, arguments);
    } else if (isAllowed(methodOptions, userId, arguments) === true) {
      return runFunc.apply(this, arguments);
    } else if (isDenied(methodOptions, userId, arguments) === false) {
      return runFunc.apply(this, arguments);
    }

    throw new Meteor.Error(
      methodOptions.permissionsError.name,
      methodOptions.permissionsError.message(userId)
    );
  };

  methodOptions.runTrusted = function runTrusted() {
    return runFunc.apply({ isTrusted: true }, arguments);
  };

  methodOptions.permissionsError = methodOptions.permissionsError || {
    name: 'PermissionsMixin.NotAllowed',
    message(userId) {
      return `User ${userId} is not allowed to use ${methodOptions.name}`;
    },
  };

  if (methodOptions.allow && methodOptions.deny) {
    throw new Meteor.Error(
      DEFINITION_ERROR,
      `method cannot have both allow and deny array`
    );
  }

  checkMethodOption(methodOptions, 'allow');
  checkMethodOption(methodOptions, 'deny');

  return methodOptions;
};

PermissionsMixin.LoggedIn = [
  {
    roles: true,
    group: true,
  },
];
