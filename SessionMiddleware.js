// Copyright (c) 2019 Fall Guy LLC All Rights Reserved.

import * as roles from './roles';

//================================================================//
// SessionMiddleware
//================================================================//
export class SessionMiddleware {

    //----------------------------------------------------------------//
    constructor ( db ) {
        
        this.db         = db;
    }

    //----------------------------------------------------------------//
    checkEntitlement ( entitlement ) {
        
        return this.checkUser (( user ) => { return roles.check ( user.role, entitlement ); });
    }

    //----------------------------------------------------------------//
    checkUser ( checkUser ) {
        
        return async ( request, result, next ) => {

            if ( request.method === 'OPTIONS' ) {
                next ();
                return;
            }

            if ( request.userID ) {
          
                const conn = this.db.makeConnection ();
                const user = await this.db.users.getUserByIDAsync ( conn, request.userID );

                if ( user ) {
                    if ( !checkUser || checkUser ( user )) {
                        request.user = user;
                        next ();
                        return;
                    }
                }
            }
            result.status ( 401 ).send ({});
        };
    }

    //----------------------------------------------------------------//
    isAdmin () {
        
        return this.checkUser (( user ) => { return ( user.role === roles.STANDARD_ROLES.ADMIN ); });
    }
}
