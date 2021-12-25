/* eslint-disable no-whitespace-before-property */


import { FormErrors }                           from './FormErrors';
import { VerifierController }                   from './VerifierController';
import * as fgc                                 from 'fgc';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                             from 'mobx-react';
import React, { useState }                      from 'react';
import { Redirect, useLocation }                from 'react-router-dom';
import * as UI                                  from 'semantic-ui-react';

//================================================================//
// SignUpForm
//================================================================//
export const SignUpForm = observer (( props ) => {

    const { session }               = props;
    const controller                = fgc.hooks.useFinalizable (() => new VerifierController ());

    const onFinish = () => {
        controller.reset ();
        session.logout ();
    }

    const onSignUp = () => {
        controller.onSubmit ( VerifierController.ACTION.NEW_USER, props.redirect );
    };

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
                            onChange        = {( e ) => { controller.setEmail ( e.target.value )}}
                            error           = { controller.errors.hasError ( FormErrors.FIELDS.EMAIL, FormErrors.ERRORS.INVALID_EMAIL )}
                        />
                        <UI.Button
                            fluid
                            positive
                            disabled        = { !controller.canSubmit }
                            onClick         = { onSignUp }
                        >
                            Sign Up
                        </UI.Button>
                    </UI.Form>
                </Otherwise>

            </Choose>
        </React.Fragment>
    );
});
