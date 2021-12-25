/* eslint-disable no-whitespace-before-property */


import { FormErrors }                           from './FormErrors';
import { LogInController }                      from './LogInController';
import { ResetPasswordModal }                   from './ResetPasswordModal';
import * as fgc                                 from 'fgc';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                             from 'mobx-react';
import React, { useState }                      from 'react';
import { Redirect, useLocation }                from 'react-router-dom';
import * as UI                                  from 'semantic-ui-react';

//================================================================//
// LogInForm
//================================================================//
export const LogInForm = observer (( props ) => {

    const { session, disabled }                                     = props;
    const controller                                                = fgc.hooks.useFinalizable (() => new LogInController ( session ));
    const [ resetPasswordModalOpen, setResetPasswordModalOpen ]     = useState ( false );

    if ( session.isLoggedIn ) {
        return <Redirect to = '/'/>
    }

    const onLogIn = () => {
        controller.onSubmit ()
    };

    const error = controller.errors.hasFormError ();

    return (
        <UI.Form error = { Boolean ( error )}>

            <UI.Form.Group widths = 'equal'>
                <UI.Form.Input
                    fluid
                    icon            = 'user'
                    iconPosition    = 'left'
                    placeholder     = 'Username'
                    type            = 'text'
                    value           = { controller.username }
                    disabled        = { Boolean ( controller.password )}
                    onChange        = {( e ) => { controller.setUsername ( e.target.value )}}
                />
                <fgc.EmailField
                    fluid
                    onEmail         = {( email ) => { controller.setEmail ( email )}}
                    disabled        = { Boolean ( controller.username )}
                    error           = { controller.errors.hasError ( FormErrors.FIELDS.EMAIL, FormErrors.ERRORS.INVALID_EMAIL )}
                />
            </UI.Form.Group>

            <UI.Form.Input
                fluid
                icon            = 'lock'
                iconPosition    = 'left'
                placeholder     = 'Password'
                type            = 'password'
                value           = { controller.password }
                onChange        = {( e ) => { controller.setPassword ( e.target.value )}}
                error           = { controller.errors.hasError ( FormErrors.FIELDS.PASSWORD, FormErrors.ERRORS.INVALID_PASSWORD )}
            />

            <UI.Message
              error
              header            = 'Error Logging In'
              content           = { error }
            />

            <UI.Button
                fluid
                positive
                disabled        = { !controller.canSubmit }
                onClick         = { onLogIn }
            >
                Log In
            </UI.Button>

            <UI.Button
                fluid
                onClick         = {() => { setResetPasswordModalOpen ( true )}}
                style = {{
                    backgroundColor:        'transparent',
                    color:                  'blue',
                    fontWeight:             'inherit',
                }}
            >
                Forgot Password?
            </UI.Button>

            <If condition = { resetPasswordModalOpen }>
                <ResetPasswordModal
                    session         = { session }
                    onClose         = {() => { setResetPasswordModalOpen ( false )}}
                />
            </If>

        </UI.Form>
    );
});
