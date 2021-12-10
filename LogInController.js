/* eslint-disable no-whitespace-before-property */

import { FormErrors }                           from './FormErrors';
import * as consts                              from 'consts';
import { assert, hooks, util }                  from 'fgc';
import jwt_decode                               from 'jwt-decode';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                             from 'mobx-react';
import React, { useState }                      from 'react';
import { Redirect, useLocation }                from 'react-router-dom';
import * as UI                                  from 'semantic-ui-react';
import validator                                from 'validator';

const PASSWORD_REGEX = /^[0-9a-zA-Z~`!?@#$%^&()_+*=/,.{}<>:;'"|[\]\\]+$/;

//================================================================//
// LogInController
//================================================================//
export class LogInController {

    static ACTION = {
        NONE:               `${ consts.SERVICE_URL }/login`,
        CREATE_USER:        `${ consts.SERVICE_URL }/login/register`,
        RESET_PASSWORD:     `${ consts.SERVICE_URL }/login/reset`,
    };

    static STEP = {
        IDLE:               'IDLE',
        BUSY:               'BUSY',
    };

    @observable step                = LogInController.STEP.IDLE;

    @observable confirmPassword     = '';
    @observable email               = '';
    @observable username            = '';
    @observable password            = '';
    @observable errors              = new FormErrors ();

    //----------------------------------------------------------------//
    @computed get
    body () {

        switch ( this.action ) {

            case LogInController.ACTION.NONE:
                return {
                    email:      this.email,
                    password:   this.password,
                };

            case LogInController.ACTION.CREATE_USER:
                return {
                    verifier:   this.verifier,
                    email:      this.email,
                    username:   this.username,
                    password:   this.password,
                }

            case LogInController.ACTION.RESET_PASSWORD:
                return {
                    verifier:   this.verifier,
                    email:      this.email,
                    password:   this.password,
                }
        }
        return {};
    }

    //----------------------------------------------------------------//
    @computed get
    canSubmit () {

        if ( this.errors.hasErrors ) return false;

        switch ( this.action ) {

            case LogInController.ACTION.NONE:
                return (
                    this.email &&
                    this.password
                );

            case LogInController.ACTION.CREATE_USER:
                return (
                    this.verifier &&
                    this.email &&
                    this.username &&
                    this.password &&
                    this.confirmPassword
                );

            case LogInController.ACTION.RESET_PASSWORD:
                return (
                    this.verifier &&
                    this.email &&
                    this.password &&
                    this.confirmPassword
                );
        }
        return false;
    }

    //----------------------------------------------------------------//
    constructor ( session, action, verifier ) {

        this.action = action || LogInController.ACTION.NONE;
        this.session = session;
        this.verifier = false;

        try {
            if ( this.action  !== LogInController.ACTION.NONE ) {
                
                assert ( verifier );
                const decoded = jwt_decode ( verifier );
                assert ( decoded && decoded.sub );

                const payload = JSON.parse ( decoded.sub );
                assert ( payload && payload.email );

                this.verifier = verifier;
                this.setEmail ( payload.email );
            }
        }
        catch ( error ) {
            console.log ( error );
        }

        this.errors.setValidator ( FormErrors.FIELDS.CONFIRM_PASSWORD, FormErrors.ERRORS.CONFIRM_PASSWORD, () => {
            return (( this.action === LogInController.ACTION.NONE ) || ( this.password === this.confirmPassword ));
        });

        this.errors.setValidator ( FormErrors.FIELDS.EMAIL, FormErrors.ERRORS.INVALID_EMAIL, () => {
            return validator.isEmail ( this.email );
        });

        this.errors.setValidator ( FormErrors.FIELDS.PASSWORD, FormErrors.ERRORS.INVALID_PASSWORD, () => {
            return PASSWORD_REGEX.test ( this.password );
        });
    }

    //----------------------------------------------------------------//
    @computed get
    isActive () {

        return Boolean (
            this.confirmPassword ||
            this.email ||
            this.username ||
            this.password
        );
    }

    //----------------------------------------------------------------//
    @computed get
    hasVerifier () {
        return this.verifier !== false;
    }

    //----------------------------------------------------------------//
    @action
    onSubmit () {

        if ( !this.errors.validate ()) return;

        this.setStep ( LogInController.STEP.BUSY );

        ( async () => {

            try {

                const result = await fetch ( this.url, {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify ( this.body )
                });

                const json = await result.json ();
                if (( json.status === 'OK' ) && ( json.session )) {
                    this.session.login ( json.session );
                    this.reset ();
                }
                else if ( json.status === 'BLOCKED' ) {
                    this.errors.setFormError ( FormErrors.ERRORS.ACCOUNT_BLOCKED );
                }
                else {
                    this.errors.setFormError ( FormErrors.ERRORS.LOGIN_FAILED );
                }
            }
            catch ( error ) {
                console.log ( error );
                this.errors.setFormError ( FormErrors.ERRORS.WEB_CALL );
            }
        })();
    }

    //----------------------------------------------------------------//
    @action
    reset () {
        
        this.step               = LogInController.STEP.IDLE;
        this.confirmPassword    = '';
        this.email              = '';
        this.username           = '';
        this.password           = '';

        this.errors.reset ();
    }

    //----------------------------------------------------------------//
    @action
    setConfirmPassword ( confirmPassword ) {
        this.errors.clearError ( FormErrors.FIELDS.CONFIRM_PASSWORD );
        this.confirmPassword = confirmPassword;
    }

    //----------------------------------------------------------------//
    @action
    setEmail ( email ) {
        this.errors.clearError ( FormErrors.FIELDS.EMAIL );
        this.email = email;
    }

    //----------------------------------------------------------------//
    @action
    setPassword ( password ) {
        this.errors.clearError ( FormErrors.FIELDS.PASSWORD );
        this.password = password;
    }

    //----------------------------------------------------------------//
    @action
    setStep ( step ) {
        this.step = step;
    }

    //----------------------------------------------------------------//
    @action
    setUsername ( username ) {
        this.username = username;
    }

    //----------------------------------------------------------------//
    @computed get
    url () {
        return this.action;
    }
}
