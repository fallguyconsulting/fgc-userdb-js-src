// Copyright (c) 2019 Fall Guy LLC All Rights Reserved.

import njwt                 from 'njwt';
import secureRandom         from 'secure-random';

//================================================================//
// token
//================================================================//

//----------------------------------------------------------------//
export function create ( subject, issuer, scope, signingKeyBase64 ) {

    const signingKey = Buffer.from ( signingKeyBase64, 'base64' );

    try {
        const claims = {
            iss:        issuer, // https://pancakehermit.com
            sub:        subject,
            scope:      scope, // 'self, admins'
        };
        const jwt = njwt.create ( claims, signingKey );

        // disable expiration (for now)
        delete ( jwt.body.exp );

        const jwt64 = jwt.compact ();
        return jwt64;
    }
    catch ( error ) {
        console.log ( error );
    }
}

//----------------------------------------------------------------//
export function makeSigningKeyBase64 () {

    return secureRandom ( 256, { type: 'Buffer' }).toString ( 'base64' );
}

//----------------------------------------------------------------//
export function verify ( jwt64, signingKeyBase64 ) {

    if ( typeof ( jwt64 ) !== 'string' ) return false;
    if ( jwt64.length === 0 ) return false;

    const signingKey = Buffer.from ( signingKeyBase64, 'base64' );

    try {
        return njwt.verify ( jwt64, signingKey );
    }
    catch ( error ) {
        console.log ( error );
        return false;
    }
}

//================================================================//
// TokenMiddleware
//================================================================//
export class TokenMiddleware {

    //----------------------------------------------------------------//
    constructor ( signingKey, fieldForTokenSub ) {

        this.signingKey = signingKey;
        this.fieldForTokenSub = fieldForTokenSub;
    }

    //----------------------------------------------------------------//
    async parseTokenAsync ( request ) {

        const jwt64 = request.header ( 'X-Auth-Token' ) || false;

        const token = verify ( jwt64, this.signingKey );
        if ( token ) {
            request.token = token;
            if ( this.fieldForTokenSub ) {
                request [ this.fieldForTokenSub ] = token.body.sub;
            }
        }
    }

    //----------------------------------------------------------------//
    withToken () {

        return async ( request, result, next ) => {

            console.log ( 'WITH TOKEN', request.header ( 'X-Auth-Token' ));

            if ( request.method === 'OPTIONS' ) {
                next ();
                return;
            }

            try {
                await this.parseTokenAsync ( request );
                console.log ( 'TOKEN', request.token );
                console.log ( this.fieldForTokenSub, request [ this.fieldForTokenSub ]);
            }
            catch ( error ) {
                console.log ( 'NOPE', error );
            }
            next ();
        };
    }

    //----------------------------------------------------------------//
    withTokenAuth () {

        return async ( request, result, next ) => {

            if ( request.method === 'OPTIONS' ) {
                next ();
                return;
            }

            try {
                await this.parseTokenAsync ( request );
                if ( request.token ) {
                    next ();
                    return;
                }
            }
            catch ( error ) {
                next ( error );
            }
            result.status ( 401 ).send ({});
        };
    }
}
