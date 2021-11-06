/* eslint-disable no-whitespace-before-property */

import * as roles                   from './roles';
import * as consts                  from 'consts';
import { assert, StorageContext }   from 'fgc';
import { action, computed, extendObservable, observable, runInAction } from "mobx";

//================================================================//
// SessionController
//================================================================//
export class SessionController {

    @observable isLoggingIn = false;

    //----------------------------------------------------------------//
    constructor () {
        this.storage = new StorageContext ();
        this.storage.persist ( this, 'session', `.userdb.${ consts.USERDB_LOCAL_STORAGE_PREFIX }.gamercert`, {});
    }

    //----------------------------------------------------------------//
    @computed get
    emailMD5 () {
        return this.session.emailMD5 || '';
    }

    //----------------------------------------------------------------//
    finalize () {

        this.storage.finalize ();
    }

    //----------------------------------------------------------------//
    getHeaders ( headers ) {

        if ( this.isLoggedIn ) {
            headers = headers ? _.clone ( headers ) : {};
            headers [ 'X-Auth-Token' ] = this.token;
            headers [ 'content-type' ] = headers [ 'content-type' ] || 'application/json';
        }
        return headers;
    }

    //----------------------------------------------------------------//
    @computed get
    gravatar () {
        return `https://www.gravatar.com/avatar/${ this.emailMD5 }?d=retro&s=128`;
    }

    //----------------------------------------------------------------//
    @computed get
    isAdmin () {
        return ( this.role === roles.STANDARD_ROLES.ADMIN );
    }

    //----------------------------------------------------------------//
    @computed get
    isLoggedIn () {
        return ( this.session.token && ( this.session.token.length > 0 ));
    }

    //----------------------------------------------------------------//
    @action
    login ( session ) {
        if ( session ) {
            console.log ( 'SESSION:', JSON.stringify ( session, null, 4 ));
            this.session = session;
            this.isLoggingIn = false;
        }
        else {
            this.isLoggingIn = true;
        }
    }

    //----------------------------------------------------------------//
    @action
    logout () {
        this.session = {}
        this.isLoggingIn = false;
    }

    //----------------------------------------------------------------//
    @computed get
    role () {
        return this.session.role || '';
    }

    //----------------------------------------------------------------//
    @computed get
    token () {
        return this.session.token || '';
    }

    //----------------------------------------------------------------//
    @computed get
    userID () {
        return this.session.userID || '';
    }

    //----------------------------------------------------------------//
    @computed get
    username () {
        return this.session.username || '';
    }
}
