/* eslint-disable no-whitespace-before-property */


import { LogInForm }                            from './LogInForm';
import { SignUpForm }                           from './SignUpForm';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                             from 'mobx-react';
import React, { useState }                      from 'react';
import { Redirect, useLocation }                from 'react-router-dom';
import * as UI                                  from 'semantic-ui-react';

const MENU_TABS = {
    LOG_IN:             'LOG_IN',
    SIGN_UP:            'SIGN_UP',
};

//================================================================//
// LogInModal
//================================================================//
export const LogInModal = observer (( props ) => {

    const { session } = props;

    const [ activeTab, setActiveTab ] = useState ( MENU_TABS.LOG_IN );

    const onClose = () => {
        session.logout ();
    }

    return (
        <UI.Modal
            open
            size        = 'tiny'
            onClose     = { onClose }
        >   
            <UI.Modal.Content>
                <UI.Menu pointing secondary>
                    <UI.Menu.Item
                        active      = { activeTab === MENU_TABS.LOG_IN }
                        onClick     = {() => { setActiveTab ( MENU_TABS.LOG_IN ); }}
                    >
                        Log In
                    </UI.Menu.Item>
                    <UI.Menu.Item
                        active      = { activeTab === MENU_TABS.SIGN_UP }
                        disabled    = { props.hideSignup }
                        onClick     = {() => { setActiveTab ( MENU_TABS.SIGN_UP ); }}
                    >
                        Sign Up
                    </UI.Menu.Item>
                </UI.Menu>

                <Choose>
                    <When condition = { activeTab === MENU_TABS.LOG_IN }>
                        <LogInForm session = { session }/>
                    </When>
                    <When condition = { activeTab === MENU_TABS.SIGN_UP }>
                        <SignUpForm session = { session } redirect = { props.redirect }/>
                    </When>
                </Choose>

            </UI.Modal.Content>
        </UI.Modal>
    );
});
