// Copyright (c) 2019 Fall Guy LLC All Rights Reserved.

//================================================================//
// PasswordMiddleware
//================================================================//
export class PasswordMiddleware {

    //----------------------------------------------------------------//
    constructor ( headerName, password, fieldForPassword ) {

        this.headerName             = headerName;
        this.password               = password;
        this.fieldForPassword       = fieldForPassword;
    }

    //----------------------------------------------------------------//
    withPassword () {

        return async ( request, result, next ) => {

            if ( request.method === 'OPTIONS' ) {
                next ();
                return;
            }

            const header = request.header ( this.headerName ) || false;

            if ( header === this.password ) {
                request [ this.fieldForPassword ] = header;
            }
            next ();
        };
    }

    //----------------------------------------------------------------//
    withPasswordAuth () {

        return async ( request, result, next ) => {

            if ( request.method === 'OPTIONS' ) {
                next ();
                return;
            }

            const header = request.header ( this.headerName ) || false;

            if ( header === this.password ) {
                request [ this.fieldForPassword ] = header;
                next ();
                return;
            }
            result.status ( 401 ).send ({});
        };
    }
}
