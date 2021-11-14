// Copyright (c) 2019 Fall Guy LLC All Rights Reserved.

module.exports = {
    roles:                          require ( './roles.js' ),
    token:                          require ( './token.js' ),

    EmailField:                     require ( './EmailField.js' ).EmailField,
    LogInController:                require ( './LogInController.js' ).LogInController,
    LogInModal:                     require ( './LogInModal.js' ).LogInModal,
    LogInWithCreateUserScreen:      require ( './LogInWithCreateUserScreen.js' ).LogInWithCreateUserScreen,
    LogInWithResetPasswordScreen:   require ( './LogInWithResetPasswordScreen.js' ).LogInWithResetPasswordScreen,
    PhoneField:                     require ( './PhoneField.js' ).PhoneField,
    SessionController:              require ( './SessionController.js' ).SessionController,
    UserAccountPopup:               require ( './UserAccountPopup.js' ).UserAccountPopup,
    UserManagementController:       require ( './UserManagementController.js' ).UserManagementController,
    UserManagementTable:            require ( './UserManagementTable.js' ).UserManagementTable,
    VerifierController:             require ( './VerifierController.js' ).VerifierController,
};
