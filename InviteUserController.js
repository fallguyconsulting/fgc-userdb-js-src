/* eslint-disable no-whitespace-before-property */

import { assert }                               from './assert';
import { FormErrors }                           from './FormErrors';
import * as hooks                               from './hooks';
import { SessionController }                    from './SessionController';
import { SingleColumnContainerView }            from './SingleColumnContainerView';
import * as util                                from './util';
import * as consts                              from 'consts';
import jwt_decode                               from 'jwt-decode';
import { action, computed, extendObservable, observable, observe, runInAction } from 'mobx';
import { observer }                             from 'mobx-react';
import React, { useState }                      from 'react';
import { Redirect, useLocation }                from 'react-router-dom';
import * as UI                                  from 'semantic-ui-react';
import validator                                from 'validator';

//================================================================//
// InviteUserController
//================================================================//
export class InviteUserController {

    @observable email               = '';
    @observable errors              = new FormErrors ();

    //----------------------------------------------------------------//
    @computed get
    canSubmit () {

        if ( this.errors.hasErrors ) return false;
        return Boolean ( this.email );
    }

    //----------------------------------------------------------------//
    constructor ( session ) {

        this.session = session;

        this.errors.setValidator ( FormErrors.FIELDS.EMAIL, FormErrors.ERRORS.INVALID_EMAIL, () => {
            return validator.isEmail ( this.email );
        });
    }

    //----------------------------------------------------------------//
    finalize () {
    }

    //----------------------------------------------------------------//
    @action
    onSubmit ( redirect ) {

        if ( !this.errors.validate ()) return;

        ( async () => {

            try {
                const result = await fetch ( `${ consts.SERVICE_URL }/invitations`, {
                    method: 'POST',
                    headers: this.session.getHeaders ({ 'content-type': 'application/json' }),
                    body: JSON.stringify ({
                        email:      this.email,
                        redirect:   redirect || '',
                    })
                });
                this.reset ();
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
        
        this.email = '';
        this.roles = [];
        this.errors.reset ();
    }

    //----------------------------------------------------------------//
    @action
    setEmail ( email ) {
        this.errors.clearError ( FormErrors.FIELDS.EMAIL );
        this.email = email;
    }
}
