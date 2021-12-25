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
