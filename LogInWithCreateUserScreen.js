/* eslint-disable no-whitespace-before-property */

import { FormErrors }                           from './FormErrors';
import { LogInController }                      from './LogInController';
import { SessionController }                    from './SessionController';
import { assert, hooks, SingleColumnContainerView, util } from 'fgc';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                             from 'mobx-react';
import queryString                              from 'query-string';
import React, { useState }                      from 'react';
import { Redirect, useLocation }                from 'react-router-dom';
import * as UI                                  from 'semantic-ui-react';

//================================================================//
// LogInWithCreateUserScreen
//================================================================//
export const LogInWithCreateUserScreen = observer (( props ) => {

    const query = queryString.parse ( useLocation ().search );

    const session = hooks.useFinalizable (() => new SessionController ());
    const controller = hooks.useFinalizable (() => new LogInController ( session, LogInController.ACTION.NEW_USER, query.verifier ));

    if (( !controller.hasVerifier ) || session.isLoggedIn ) {
        return <Redirect to = { query.redirect || '/' }/>
    }

    const error = controller.errors.hasFormError ();

    return (
        <SingleColumnContainerView title = 'Create Account'>
            <UI.Form error = { Boolean ( error )}>

                <center>
                    <UI.Header as = 'h3'>{ controller.email }</UI.Header>
                </center>
                <UI.Divider/>

                <UI.Form.Input
                    fluid
                    icon = 'user'
                    iconPosition = 'left'
                    placeholder = 'Username'
                    value = { controller.username }
                    onChange = {( e ) => { controller.setUsername ( e.target.value )}}
                />
                <UI.Form.Input
                    fluid
                    icon = 'lock'
                    iconPosition = 'left'
                    placeholder = 'Password'
                    type = 'password'
                    value = { controller.password }
                    onChange = {( e ) => { controller.setPassword ( e.target.value )}}
                    error = { controller.errors.hasError ( FormErrors.FIELDS.PASSWORD, FormErrors.ERRORS.INVALID_PASSWORD )}
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
                  header = 'Error Creating Account.'
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
