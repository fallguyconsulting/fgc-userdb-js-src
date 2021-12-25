// Copyright (c) 2019 Fall Guy LLC All Rights Reserved.

import * as roles                   from './roles';
import * as token                   from './token';
import * as tokenMiddleware         from './tokenMiddleware';
import bcrypt                       from 'bcryptjs';
import * as config                  from 'config';
import { assert, rest }             from 'fgc';

// TODO: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite

//----------------------------------------------------------------//
export function finishLogin ( user, finish, request, response, next ) {

    const session = makeSession ( user, config.SIGNING_KEY_FOR_SESSION );

    if ( finish ) {
        rest.handleSuccess ( response, { session: session });
        next ();
    }
    else {
        request.user        = user;
        request.session     = session;
    }
}

//----------------------------------------------------------------//
function makeSession ( user, signingKey ) {

    return {
        token:          token.create ( user.userID, 'localhost', 'self', signingKey ),
        userID:         user.userID,
        username:       user.username,
        emailMD5:       user.emailMD5,
        role:           user.role,
    };
}

//----------------------------------------------------------------//
export function withAdmin ( model ) {
    
    return withUser ( model, ( user ) => { return user.role === roles.STANDARD_ROLES.ADMIN; });
}

//----------------------------------------------------------------//
export function withEntitlement ( model, entitlement ) {
    
    return withUser ( model, ( user ) => { return roles.check ( user.role, entitlement ); });
}

//----------------------------------------------------------------//
export function withLogin ( model, finish ) {

    return async ( request, response, next ) => {

        try {

            const body          = request.body;
            const username      = body.username || false;
            const email         = body.email || false;

            const usernameOrEmailMD5 = username || crypto.createHash ( 'md5' ).update ( email ).digest ( 'hex' );

            const user          = await model.getUserAsync ( usernameOrEmailMD5 );
            const password      = await model.getUserPasswordAsync ( user.userID );

            if ( roles.check ( user.role, roles.ENTITLEMENTS.CAN_LOGIN ) && ( await bcrypt.compare ( body.password, password ))) {
                finishLogin ( user, finish, request, response, next );
                return;
            }
        }
        catch ( error ) {
            console.log ( error );
            rest.handleError ( response, error );
            return;
        }
        rest.handleError ( response, 401 );
    }
}

//----------------------------------------------------------------//
export function withPasswordResetAndLogin ( model, finish ) {

    return async ( request, response, next ) => {

        try {

            console.log ( 'POST LOGIN WITH PASSWORD RESET' );

            const body          = request.body;
            const verifier      = body.verifier;
            const password      = body.password;
            const email         = body.email;
            const emailMD5      = crypto.createHash ( 'md5' ).update ( email ).digest ( 'hex' );

            assert ( verifier );
            const verified = token.verify ( body.verifier, config.SIGNING_KEY_FOR_PASSWORD_RESET );
            assert ( verified && verified.body && verified.body.sub );

            const payload = JSON.parse ( verified.body.sub );
            assert ( payload.email === email );

            const user = await this.model.getUserAsync (emailMD5 );

            if ( roles.check ( user.role, roles.ENTITLEMENTS.CAN_RESET_PASSWORD ) && roles.check ( user.role, roles.ENTITLEMENTS.CAN_LOGIN )) {

                user.password = await bcrypt.hash ( password, config.SALT_ROUNDS );
                await this.model.affirmUserAsync ( user );
                finishLogin ( user, finish, request, response, next );
                return;
            }
        }
        catch ( error ) {
            rest.handleError ( response, error );
            return;
        }
        rest.handleError ( response, 401 );
    }
}

//----------------------------------------------------------------//
export function withRegisterUserAndLogin ( request, response ) {

    return async ( request, response, next ) => {

        try {

            console.log ( 'POST LOGIN WITH REGISTER USER' );

            const body          = request.body;

            console.log ( 'BODY', body );

            const verifier      = body.verifier;
            const username      = body.username;
            const password      = body.password;
            const email         = body.email;
            const emailMD5      = crypto.createHash ( 'md5' ).update ( email ).digest ( 'hex' );

            // do not overwrite existing users
            if ( await this.model.canRegisterUserAsync ( username, emailMD5 )) {

                assert ( verifier );
                const verified = token.verify ( body.verifier, config.SIGNING_KEY_FOR_REGISTER_USER );
                assert ( verified && verified.body && verified.body.sub );

                const payload = JSON.parse ( verified.body.sub );
                assert ( payload.email === email );

                let user = {
                    username:       username,
                    password:       await bcrypt.hash ( password, config.USERSDM_MYSQL_SALT_ROUNDS ),
                    emailMD5:       emailMD5, // TODO: encrypt plaintext email with user's password and store
                };

                user = await this.model.affirmUserAsync ( user );
                finishLogin ( user, finish, request, response, next );
                return;
            }
        }
        catch ( error ) {
            console.log ( error );
            rest.handleError ( response, error );
            return;
        }
        rest.handleError ( response, 401 );
    }
}

//----------------------------------------------------------------//
export function withTokenAuth ( signingKey ) {

    return tokenMiddleware.withTokenAuth ( signingKey, 'userID' );
}

//----------------------------------------------------------------//
export function withUser ( model, checkUser ) {
    
    return async ( request, response, next ) => {

        if ( request.method === 'OPTIONS' ) {
            next ();
            return;
        }

        if ( request.userID ) {
            
            const user = await model.getUserByIDAsync ( request.userID );

            if ( user && ( !checkUser || checkUser ( user ))) {
                if ( !checkUser || checkUser ( user )) {
                    request.user = user;
                    next ();
                    return;
                }
            }
        }
        response.status ( 401 ).send ({});
    };
}
