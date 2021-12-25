/* eslint-disable no-whitespace-before-property */

import { FormErrors }                           from './FormErrors';
import * as config                              from 'config';
import { assert, hooks, util }                  from 'fgc';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                             from 'mobx-react';
import validator                                from 'validator';

//================================================================//
// VerifierController
//================================================================//
export class VerifierController {

    static ACTION = {
        NEW_USER:           `${ config.SERVICE_URL }/verifier/register`,
        RESET_PASSWORD:     `${ config.SERVICE_URL }/verifier/reset`,
    };

    static STEP = {
        IDLE:   'IDLE',
        BUSY:   'BUSY',
        DONE:   'DONE',
    };

    @observable step        = VerifierController.STEP.IDLE;
    @observable email       = '';
    @observable errors      = new FormErrors ();

    //----------------------------------------------------------------//
    @computed get
    canSubmit () {
        return (( !this.errors.hasErrors ) && Boolean ( this.email ));
    }

    //----------------------------------------------------------------//
    constructor () {

        this.errors.setValidator ( FormErrors.FIELDS.EMAIL, FormErrors.ERRORS.INVALID_EMAIL, () => {
            return validator.isEmail ( this.email );
        });
    }

    //----------------------------------------------------------------//
    @computed get
    isActive () {

        return Boolean ( this.email );
    }

    //----------------------------------------------------------------//
    @action
    onSubmit ( url, redirect ) {

        if ( !url ) return;
        if ( !this.errors.validate ()) return;

        this.setStep ( VerifierController.STEP.BUSY );

        ( async () => {

            try {

                const result = await fetch ( url, {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify ({
                        email:      this.email,
                        redirect:   redirect || '',
                    })
                });

                const json = await result.json ();

                this.setEmail ( '' );
                this.setStep ( VerifierController.STEP.DONE );
            }
            catch ( error ) {

                console.log ( error );
                this.setStep ( VerifierController.STEP.IDLE );
            }
        })();
    }

    //----------------------------------------------------------------//
    @action
    reset () {
        this.step       = VerifierController.STEP.IDLE;
        this.email      = '';

        this.errors.reset ();
    }

    //----------------------------------------------------------------//
    @action
    setEmail ( email ) {
        this.errors.reset ();
        this.email = email;
    }

    //----------------------------------------------------------------//
    @action
    setStep ( step ) {
        this.step = step;
    }
}
