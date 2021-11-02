// Copyright (c) 2019 Fall Guy LLC All Rights Reserved.

//================================================================//
// STANDARD_ROLES
//================================================================//

export const STANDARD_ROLES = {
    ADMIN:              'admin',
    USER:               'user',
    BLOCKED:            'blocked',
};

export const ENTITLEMENTS = {
    CAN_LOGIN:              'CAN_LOGIN',
    CAN_INVITE_USER:        'CAN_INVITE_USER',
    CAN_SET_ROLE:           'CAN_SET_ROLE',
    CAN_RESET_PASSWORD:     'CAN_RESET_PASSWORD',
};

export const ENTITLEMENT_SETS = {
    [ STANDARD_ROLES.ADMIN ]:           [ ENTITLEMENTS.CAN_LOGIN, ENTITLEMENTS.CAN_INVITE_USER, ENTITLEMENTS.CAN_SET_ROLE, ENTITLEMENTS.CAN_RESET_PASSWORD ],
    [ STANDARD_ROLES.USER ]:            [ ENTITLEMENTS.CAN_LOGIN , ENTITLEMENTS.CAN_RESET_PASSWORD],
    [ STANDARD_ROLES.BLOCKED ]:         [],
};

//----------------------------------------------------------------//
export function check ( role, entitlement ) {

    return ( role === STANDARD_ROLES.ADMIN ) || ENTITLEMENT_SETS [ role ] && ENTITLEMENT_SETS [ role ].includes ( entitlement );
}
