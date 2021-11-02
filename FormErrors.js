/* eslint-disable no-whitespace-before-property */

import { assert }                               from 'fgc';
import jwt_decode                               from 'jwt-decode';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                             from 'mobx-react';
import React, { useState }                      from 'react';
import { Redirect, useLocation }                from 'react-router-dom';
import * as UI                                  from 'semantic-ui-react';

//================================================================//
// FormErrors
//================================================================//
export class FormErrors {

    static ERRORS = {
        CONFIRM_PASSWORD:       'CONFIRM_PASSWORD',
        INVALID_EMAIL:          'INVALID_EMAIL',
        INVALID_PASSWORD:       'INVALID_PASSWORD',
        LOGIN_FAILED:           'LOGIN_FAILED',
        WEB_CALL:               'WEB_CALL',
        ACCOUNT_BLOCKED:        'ACCOUNT_BLOCKED'
    };

    static FIELDS = {
        CONFIRM_PASSWORD:       'CONFIRM_PASSWORD',
        EMAIL:                  'EMAIL',
        PASSWORD:               'PASSWORD',
    };

    @observable errors              = false;
    @observable formError           = false;

    //----------------------------------------------------------------//
    @action
    assert ( field, error, condition ) {

        if ( !condition ) {
            const errors = this.errors || {};
            errors [ field ] = error;
            this.errors = errors;
        }
    }

    //----------------------------------------------------------------//
    @action
    clearError ( field ) {

        if ( this.errors ) {
            delete this.errors [ field ];
            if ( Object.keys ( this.errors ).length === 0 ) {
                this.errors = false;
            }
        }
        this.formError = false;
    }

    //----------------------------------------------------------------//
    constructor () {
    }

    //----------------------------------------------------------------//
    getErrorMessage ( error ) {

        switch ( error ) {
            case FormErrors.ERRORS.CONFIRM_PASSWORD:    return 'Password mismatch.';
            case FormErrors.ERRORS.INVALID_EMAIL:       return 'Please enter a valid email address.';
            case FormErrors.ERRORS.INVALID_PASSWORD:    return 'Password contains illegal characters.';
            case FormErrors.ERRORS.LOGIN_FAILED:        return 'Login failed.';
            case FormErrors.ERRORS.WEB_CALL:            return 'Web error. Please report or try again later.';
            case FormErrors.ERRORS.ACCOUNT_BLOCKED:     return 'Account has been blocked.';
        }
        return 'Validation error.';
    }

    //----------------------------------------------------------------//
    hasError ( field, error, format ) {

        return ( this.errors && ( this.errors [ field ] === error ))
            ? format || { content: this.getErrorMessage ( error ), pointing: 'below' }
            : false;
    }

    //----------------------------------------------------------------//
    @computed get
    hasErrors () {

        return ( this.errors !== false );
    }

    //----------------------------------------------------------------//
    hasFormError ( error, format ) {

        return ( this.formError && ( !error || ( error === this.formError )))
            ? format || this.getErrorMessage ( this.formError )
            : false;
    }

    //----------------------------------------------------------------//
    @action
    reset () {

        this.errors         = false;
        this.formError      = false;
    }

    //----------------------------------------------------------------//
    setError ( field, error ) {

        this.assert ( field, error, false );
    }

    //----------------------------------------------------------------//
    @action
    setFormError ( error ) {

        this.formError = error;
    }

    //----------------------------------------------------------------//
    setValidator ( field, error, validate ) {

        const validators = this.validators || {};
        validators [ field ] = {
            validate:   validate,
            error:      error,
        }
        this.validators = validators;
    }

    //----------------------------------------------------------------//
    validate () {

        this.reset ();
        if ( this.validators ) {
            for ( let fieldName in this.validators ) {
                const validator = this.validators [ fieldName ];
                this.assert ( fieldName, validator.error, validator.validate ());
            }
        }
        return !this.hasErrors;
    }
}
