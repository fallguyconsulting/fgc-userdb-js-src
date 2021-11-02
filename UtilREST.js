// Copyright (c) 2019 Fall Guy LLC All Rights Reserved.

import { token }        from './token';
import express          from 'express';

//================================================================//
// UtilREST
//================================================================//
export class UtilREST {

    //----------------------------------------------------------------//
    constructor () {
        
        this.router = express.Router ();
        this.router.get     ( '/signing-key',       this.getSigningKeyAsync.bind ( this ));
    }

    //----------------------------------------------------------------//
    async getSigningKeyAsync ( request, response ) {

        response.json ({ keyBase64: token.makeSigningKeyBase64 ()});
    }
}
