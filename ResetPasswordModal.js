/* eslint-disable no-whitespace-before-property */


import { FormErrors }                           from './FormErrors';
import { LogInController }                      from './LogInController';
import { SessionController }                    from './SessionController';
import { VerifierController }                   from './VerifierController';
import * as fgc                                 from 'fgc';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                             from 'mobx-react';
import React, { useState }                      from 'react';
import { Redirect, useLocation }                from 'react-router-dom';
import * as UI                                  from 'semantic-ui-react';

//================================================================//
// ResetPasswordModal
//================================================================//
export const ResetPasswordModal = observer (( props ) => {

    const { session }           = props;
    const controller            = fgc.hooks.useFinalizable (() => new VerifierController ());

    const onClose = () => {
        if ( controller.step === VerifierController.STEP.DONE ) {
            session.logout ();
        }
        props.onClose ();
    }

    const onSubmit = () => {
        controller.onSubmit ( VerifierController.ACTION.RESET_PASSWORD );
    }

    const error = controller.errors.hasFormError ();

    return (
        <UI.Modal
            open
            size        = 'tiny'
            onClose     = { onClose }
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
