/* eslint-disable no-whitespace-before-property */

import { FormErrors }                           from './FormErrors';
import { LogInController }                      from './LogInController';
import { SessionController }                    from './SessionController';
import { VerifierController }                   from './VerifierController';
import { assert, hooks, util }                  from 'fgc';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                             from 'mobx-react';
import React, { useState }                      from 'react';
import { Redirect, useLocation }                from 'react-router-dom';
import * as UI                                  from 'semantic-ui-react';

//================================================================//
// SignUpForm
//================================================================//
export const SignUpForm = observer (( props ) => {

    const { session, controller, disabled } = props;

    const onFinish = () => {
        controller.reset ();
        session.logout ();
    }

    return (
        <React.Fragment>

            <UI.Modal
                size = 'tiny'
                open = { controller.step === VerifierController.STEP.DONE }
                onClose = { onFinish }
            >
                <UI.Modal.Header>
                    Thanks for Signing Up!
                </UI.Modal.Header>
                <UI.Modal.Content>
                    
                    <UI.Modal.Description>
                        Check your email for the next step.
                    </UI.Modal.Description>
                </UI.Modal.Content>
                <UI.Modal.Actions>
                    <UI.Button
                        positive
                        onClick = { onFinish }
                    >
                        <UI.Icon name = 'checkmark'/>
                        OK
                    </UI.Button>
                </UI.Modal.Actions>
            </UI.Modal>

            <Choose>

                <When condition = { controller.step === VerifierController.STEP.BUSY }>
                    <div style = {{ textAlign: 'center' }}>
                        <UI.Header as = "h2" icon>
                            <UI.Icon name = 'spinner' loading/>
                        </UI.Header>
                    </div>
                </When>

                <Otherwise>
                    <UI.Form>
                        <UI.Form.Input
                            fluid
                            icon            = 'mail'
                            iconPosition    = 'left'
                            placeholder     = 'Email'
                            type            = 'email'
                            value           = { controller.email }
                            disabled        = { disabled }
                            onChange        = {( e ) => { controller.setEmail ( e.target.value )}}
                            error           = { controller.errors.hasError ( FormErrors.FIELDS.EMAIL, FormErrors.ERRORS.INVALID_EMAIL )}
                        />
                    </UI.Form>
                </Otherwise>

            </Choose>
        </React.Fragment>
    );
});

//================================================================//
// LogInForm
//================================================================//
export const LogInForm = observer (( props ) => {

    const { session, controller, disabled } = props;

    if ( session.isLoggedIn ) {
        return <Redirect to = '/'/>
    }

    const error = controller.errors.hasFormError ();

    return (
        <UI.Form error = { Boolean ( error )}>
            <UI.Form.Input
                fluid
                icon            = 'mail'
                iconPosition    = 'left'
                placeholder     = 'Email'
                type            = 'email'
                value           = { controller.email }
                disabled        = { disabled }
                onChange        = {( e ) => { controller.setEmail ( e.target.value )}}
                error           = { controller.errors.hasError ( FormErrors.FIELDS.EMAIL, FormErrors.ERRORS.INVALID_EMAIL )}
            />
            <UI.Form.Input
                fluid
                icon            = 'lock'
                iconPosition    = 'left'
                placeholder     = 'Password'
                type            = 'password'
                value           = { controller.password }
                disabled        = { disabled }
                onChange        = {( e ) => { controller.setPassword ( e.target.value )}}
                error           = { controller.errors.hasError ( FormErrors.FIELDS.PASSWORD, FormErrors.ERRORS.INVALID_PASSWORD )}
            />
            <UI.Message
              error
              header            = 'Error Logging In'
              content           = { error }
            />
        </UI.Form>
    );
});

//================================================================//
// ResetPasswordModal
//================================================================//
const ResetPasswordModal = observer (( props ) => {

    const { open } = props;
    const controller = hooks.useFinalizable (() => new VerifierController ());

    const onClose = () => {
        
        if ( controller.step === VerifierController.STEP.DONE ) {
            props.onFinish ();
        }
        props.onClose ();
        controller.reset ();
    }

    const onSubmit = () => {
        controller.onSubmit ( VerifierController.ACTION.RESET_PASSWORD );
    }

    const error = controller.errors.hasFormError ();

    return (
        <UI.Modal
            size = 'tiny'
            open = { open }
            onClose = { onClose }
        >
            <UI.Modal.Header>Reset Password</UI.Modal.Header>

            <Choose>

                <When condition = { controller.step !== VerifierController.STEP.DONE }>

                    <UI.Modal.Content>
                        <UI.Form error = { error }>
                            <UI.Form.Input
                                fluid
                                icon            = 'mail'
                                iconPosition    = 'left'
                                placeholder     = 'Email'
                                type            = 'email'
                                value           = { controller.email }
                                disabled        = { controller.step !== VerifierController.STEP.IDLE }
                                onChange        = {( e ) => { controller.setEmail ( e.target.value )}}
                                error           = { controller.errors.hasError ( FormErrors.FIELDS.EMAIL, FormErrors.ERRORS.INVALID_EMAIL )}
                            />
                            <UI.Message
                              error
                              header = 'Error Requesting Password Reset.'
                              content = { error }
                            />
                        </UI.Form>
                    </UI.Modal.Content>

                    <UI.Modal.Actions>
                        <Choose>
                            <When condition = { controller.step === VerifierController.STEP.IDLE }>
                                <UI.Button
                                    positive
                                    onClick     = { onSubmit }
                                    disabled    = { !controller.canSubmit }
                                >
                                    Submit
                                </UI.Button>
                            </When>

                            <Otherwise>
                                <UI.Button
                                    positive
                                    disabled = { true }
                                >
                                    <UI.Icon name = 'spinner' loading/>
                                </UI.Button>
                            </Otherwise>
                        </Choose>
                    </UI.Modal.Actions>
                </When>

                <Otherwise>

                    <UI.Modal.Content>
                        If an account with a matching email was found, then a reset link has been sent.
                    </UI.Modal.Content>

                    <UI.Modal.Actions>
                        <UI.Button
                            positive
                            onClick = { onClose }
                        >
                            OK
                        </UI.Button>
                    </UI.Modal.Actions>

                </Otherwise>

            </Choose>
        </UI.Modal>     
    );
});

//================================================================//
// LogInModal
//================================================================//
export const LogInModal = observer (( props ) => {

    const { sessionController } = props;

    const [ resetPasswordModalOpen, setResetPasswordModalOpen ] = useState ( false );

    const logInController       = hooks.useFinalizable (() => new LogInController ( sessionController ));
    const signUpController      = hooks.useFinalizable (() => new VerifierController ());

    const onClose = () => {
        logInController.reset ();
        signUpController.reset ();
        sessionController.logout ();
    }

    let action = false;
    let onSubmit = false;

    if ( logInController.canSubmit ) {
        action = 'Log In';
        onSubmit = () => { logInController.onSubmit ()};
    }
    else if ( signUpController.canSubmit ) {
        action = 'Sign Up';
        onSubmit = () => { signUpController.onSubmit ( VerifierController.ACTION.CREATE_USER, props.redirect )};
    }

    return (
        <UI.Modal
            size = 'tiny'
            open = { sessionController.isLoggingIn }
            onClose = { onClose }
        >   
            <UI.Modal.Content>
                
                {/******************************************************************
                    LOG IN
                ******************************************************************/}
                <UI.Header as = 'h4'>Log In</UI.Header>
                <LogInForm session = { sessionController } controller = { logInController } disabled = { signUpController.isActive }/>
                
                {/******************************************************************
                    SIGN UP
                ******************************************************************/}
                <If condition = { props.hideSignup !== true }>
                    <UI.Header as = 'h4'>Sign Up</UI.Header>
                    <SignUpForm session = { sessionController } controller = { signUpController } disabled = { logInController.isActive }/>
                </If>

                {/******************************************************************
                    FORGOT PASSWORD
                ******************************************************************/}
                <div style = {{ textAlign: 'center', color: 'blue', cursor: 'pointer' }}>
                    <p onClick = {() => { setResetPasswordModalOpen ( true )}}>
                        Forgot Password?
                    </p>
                </div>

                <ResetPasswordModal
                    open = { resetPasswordModalOpen }
                    onClose = {() => { setResetPasswordModalOpen ( false )}}
                    onFinish = { onClose }
                />
            </UI.Modal.Content>

            <UI.Modal.Actions>
                <If condition = { onSubmit }>
                    <UI.Button
                        positive
                        onClick = { onSubmit }
                    >
                        { action }
                    </UI.Button>
                </If>

            </UI.Modal.Actions>
        </UI.Modal>
    );
});
