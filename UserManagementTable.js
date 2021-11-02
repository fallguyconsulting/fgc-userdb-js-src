/* eslint-disable no-whitespace-before-property */

import { InviteUserModal }                      from './InviteUserModal';
import * as roles                               from './roles';
import { UserManagementController }             from './UserManagementController';
import { observer }                             from 'mobx-react';
import { hooks }                                from 'fgc';
import React, { useState }                      from 'react';
import * as UI                                  from 'semantic-ui-react';

const ROLE_OPTIONS = [
    {
        key:    roles.STANDARD_ROLES.USER,
        value:  roles.STANDARD_ROLES.USER,
        text:   'User',
    },
    {
        key:    roles.STANDARD_ROLES.ADMIN,
        value:  roles.STANDARD_ROLES.ADMIN,
        text:   'Admin',
    },
];    

//================================================================//
// InviteUserButton
//================================================================//
const InviteUserButton = observer (( props ) => {

    const { session }                   = props;
    const [ showModal, setShowModal ]   = useState ( false );

    return (
        <React.Fragment>

            <UI.Button
                color       = 'green'
                onClick     = {() => { setShowModal ( true ); }}
            >
                <UI.Icon name = 'user plus'/>
                Invite User
            </UI.Button>

            <If condition = { showModal }>
                <InviteUserModal
                    session     = { session }
                    onClose     = {() => { setShowModal ( false )}}
                />
            </If>

        </React.Fragment>
    );
});

//================================================================//
// UserManagementTable
//================================================================//
export const UserManagementTable = observer (( props ) => {

    const { session }               = props;
    const controller                = hooks.useFinalizable (() => new UserManagementController ( session ));
    const [ isBusy, setIsBusy ]     = useState ( false );

    const updateRole = async ( userID, role ) => {
        setIsBusy ( true );
        await controller.updateRoleAsync ( userID, role );
        setIsBusy ( false );
    }
    
    const userRows = controller.users.map (( user ) => {

        const isDisabled = !( session.isAdmin && ( user.userID !== session.userID ));

        return (
            <UI.Table.Row key = { user.userID }>
                <UI.Table.Cell> { user.username } </UI.Table.Cell>
                <UI.Table.Cell>
                    <UI.Dropdown
                        selection
                        placeholder     = 'Select Role'
                        options         = { ROLE_OPTIONS }
                        loading         = { isBusy }
                        onChange        = {( e, data ) => { updateRole ( user.userID, data.value )}}
                        value           = { user.role }
                        disabled        = { isDisabled }
                    />
                </UI.Table.Cell>
            </UI.Table.Row>
        );
    });

    return (
        <React.Fragment>

            <UI.Header as = 'h1'> Users </UI.Header>
            <UI.Table striped>

                <UI.Table.Header>
                    <UI.Table.Row>
                        <UI.Table.HeaderCell>Username</UI.Table.HeaderCell>
                        <UI.Table.HeaderCell>Role</UI.Table.HeaderCell>
                    </UI.Table.Row>
                </UI.Table.Header>

                <UI.Table.Body>
                    { userRows }
                </UI.Table.Body>

            </UI.Table>

            <If condition = { session.isAdmin }>
                <InviteUserButton session = { session }/>
            </If>

        </React.Fragment>
    );
});
