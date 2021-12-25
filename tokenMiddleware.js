// Copyright (c) 2019 Fall Guy LLC All Rights Reserved.

import token                from './token';
import secureRandom         from 'secure-random';

//----------------------------------------------------------------//
export async function parseTokenAsync ( request, signingKey, fieldname ) {

    const jwt64 = request.header ( 'X-Auth-Token' ) || false;

    const token = verify ( jwt64, signingKey );
    if ( token ) {
        request.token = token;
        if ( fieldname ) {
            request [ fieldname ] = token.body.sub;
        }
    }
}

//----------------------------------------------------------------//
export function withToken ( signingKey, fieldname ) {

    return async ( request, response, next ) => {

        console.log ( 'WITH TOKEN', request.header ( 'X-Auth-Token' ));

        if ( request.method === 'OPTIONS' ) {
            next ();
            return;
        }

        try {
            await parseTokenAsync ( request, signingKey, fieldname );
        }
        catch ( error ) {
            console.log ( 'NOPE', error );
        }
        next ();
    };
}

//----------------------------------------------------------------//
export function withTokenAuth ( signingKey, fieldname ) {

    return async ( request, response, next ) => {

        if ( request.method === 'OPTIONS' ) {
            next ();
            return;
        }

        try {
            await parseTokenAsync ( request, signingKey, fieldname );
            if ( request.token ) {
                next ();
                return;
            }
        }
        catch ( error ) {
            next ( error );
        }
        response.status ( 401 ).send ({});
    };
}
