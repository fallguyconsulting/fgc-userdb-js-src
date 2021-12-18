/* eslint-disable no-whitespace-before-property */

import * as config                                          from 'config';
import { RevocableContext }                                 from 'fgc';
import { action, computed, observable, runInAction }        from 'mobx';
import _                                                    from 'lodash';

//================================================================//
// UserManagementController
//================================================================//
export class UserManagementController {

    @observable users           = [];

    //----------------------------------------------------------------//
    constructor ( session ) {

        this.session = session;
        this.revocable = new RevocableContext ();
        
        this.getUsersAsync ();

    }

    //----------------------------------------------------------------//
    @action
    async getUsersAsync () {
        
        try {
            const data = await this.revocable.fetchJSON ( `${ config.SERVICE_URL }/users`, {
                headers:   this.session.getHeaders (),
            });
            if ( data && data.users ) {
                this.setUsers ( data.users );
            }
        }
        catch ( error ) {
            console.log ( error );
        }
    }

    //----------------------------------------------------------------//
    @action
    setUsers ( users ) {
        console.log ( 'SET USERS', users );
        this.users = users || [];
    }

    //----------------------------------------------------------------//
    @action
    async updateRoleAsync ( userID, role ) {

        try {
            
            await this.revocable.fetchJSON ( `${ config.SERVICE_URL }/users/${ userID }/role`, {
                method:    'PUT',
                headers:   this.session.getHeaders ({ 'content-type': 'application/json' }),
                body:      JSON.stringify ({ userID: userID, role: role }),
            });

            runInAction (() => {
                this.usersByID [ userID ].role = role;
            });
        }
        catch ( error ) {
            console.log ( error );
        }
    }

    //----------------------------------------------------------------//
    @computed get
    usersByID () {

        const usersByID = {};
        for ( let user of this.users ) {
            usersByID [ user.userID ] = user;
        }
        return usersByID;
    };
}
