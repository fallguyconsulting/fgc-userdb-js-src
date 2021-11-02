/* eslint-disable no-whitespace-before-property */

import { assert }                               from './assert';
import { FormErrors }                           from './FormErrors';
import * as hooks                               from './hooks';
import { LogInController }                      from './LogInController';
import { SessionController }                    from './SessionController';
import { SingleColumnContainerView }            from './SingleColumnContainerView';
import * as util                                from './util';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                             from 'mobx-react';
import queryString                              from 'query-string';
import React, { useState }                      from 'react';
import { Redirect, useLocation }                from 'react-router-dom';
import * as UI                                  from 'semantic-ui-react';

//================================================================//
// LogInWithResetPasswordScreen
//================================================================//
export const LogInWithResetPasswordScreen = observer (( props ) => {

    const verifier = queryString.parse ( useLocation ().search ).verifier;

    const session = hooks.useFinalizable (() => new SessionController ());
    const controller = hooks.useFinalizable (() => new LogInController ( session, LogInController.ACTION.RESET_PASSWORD, verifier ));

    if (( !controller.hasVerifier ) || session.isLoggedIn ) {
        return <Redirect to = '/'/>
    }

    const error = controller.errors.hasFormError ();

    return (
        <SingleColumnContainerView title = 'Reset Password'>
            <UI.Form error = { Boolean ( error )}>

                <center>
                    <UI.Header as = 'h3'>{ controller.email }</UI.Header>
                </center>
                <UI.Divider/>

                <UI.Form.Input
                    fluid
                    icon = 'lock'
                    iconPosition = 'left'
                    placeholder = 'Password'
                    type = 'password'
                    value = { controller.password }
                    onChange = {( e ) => { controller.setPassword ( e.target.value )}}
                    error = { controller.errors.hasError ( FormErrors.FIELDS.EMAIL, FormErrors.ERRORS.INVALID_EMAIL )}
                />
                <UI.Form.Input
                    fluid
                    icon = 'lock'
                    iconPosition = 'left'
                    placeholder = 'Confirm Password'
                    type = 'password'
                    value = { controller.confirmPassword }
                    onChange = {( e ) => { controller.setConfirmPassword ( e.target.value )}}
                    error = { controller.errors.hasError ( FormErrors.FIELDS.CONFIRM_PASSWORD, FormErrors.ERRORS.CONFIRM_PASSWORD )}
                />
                <UI.Message
                  error
                  header = 'Error Resetting Password.'
                  content = { error }
                />
                <UI.Button
                    fluid
                    color = "teal"
                    size = "large"
                    disabled = { !controller.canSubmit }
                    onClick = {() => { controller.onSubmit ()}}
                >
                    Submit
                </UI.Button>
            </UI.Form>
        </SingleColumnContainerView>
    );
});
