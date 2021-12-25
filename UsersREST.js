// Copyright (c) 2019 Fall Guy LLC All Rights Reserved.

import { PasswordMiddleware }       from './PasswordMiddleware';
import * as roles                   from './roles';
import * as usersMiddleware         from './usersMiddleware';
import * as token                   from './token';
import bcrypt                       from 'bcryptjs';
import * as config                  from 'config';
import crypto                       from 'crypto';
import express                      from 'express';
import { assert, Mailer, rest }     from 'fgc';
import _                            from 'lodash';

const VERIFIER_ACTIONS = {
    REGISTER:   'register',
    RESET:      'reset',
};

//================================================================//
// UsersREST
//================================================================//
export class UsersREST {

    //----------------------------------------------------------------//
    constructor ( model, templates ) {
        
        assert ( templates );

        this.templates      = templates;
        this.model          = model;
        this.mailer         = new Mailer ();
        this.router         = express.Router ();

        const withAuth                      = usersMiddleware.withTokenAuth ( config.SIGNING_KEY_FOR_SESSION );
        const withLogin                     = usersMiddleware.withLogin ( model, true );
        const withPasswordResetAndLogin     = usersMiddleware.withPasswordResetAndLogin ( model, true );
        const withRegisterUserAndLogin      = usersMiddleware.withRegisterUserAndLogin ( model, true );
        const withUser                      = usersMiddleware.withUser ( model );
        const withAdmin                     = usersMiddleware.withAdmin ( model );

        this.router.post    ( '/login',                         withLogin );
        this.router.post    ( '/login/reset',                   withPasswordResetAndLogin );
        this.router.post    ( '/login/register',                withRegisterUserAndLogin );
        this.router.post    ( '/verifier/:actionID',            this.postVerifierEmailRequestAsync.bind ( this ));

        this.router.get     ( '/users/:userID',                 withAuth, this.getUserAsync.bind ( this ));
        this.router.get     ( '/users',                         withAuth, this.getUsersAsync.bind ( this ));
        this.router.put     ( '/users/:userID/role',            withAuth, withAdmin, this.putUserRoleAsync.bind ( this ));
        this.router.get     ( '/invitations/:emailMD5',         withAuth, withAdmin, this.getInvitation.bind ( this ));
        this.router.put     ( '/invitations/:emailMD5',         withAuth, withAdmin, this.putInvitation.bind ( this ));
        this.router.delete  ( '/invitations/:emailMD5',         withAuth, withAdmin, this.deleteInvitation.bind ( this ));
    }

    //----------------------------------------------------------------//
    async deleteInvitation ( request, response ) {

        try {
            console.log ( 'DELETE INVITATION' );
            const emailMD5 = request.params.emailMD5;

            await this.model.deleteInvitationAsync ( emailMD5 );   
        }
        catch ( error ) {
            console.log ( error );
            rest.handleError ( response, error );
            return;
        }
        rest.handleSuccess ( response );
    }

    //----------------------------------------------------------------//
    async getInvitation ( request, response ) {

        try {

            console.log ( 'GET INVITATION' );
            const emailMD5 = request.params.emailMD5;

            const user = await this.model.findUserAsync ( emailMD5 );

            if ( user ) {
                rest.handleSuccess ( response, { user : user });
                return;
            }

            if ( await this.model.hasInvitationAsync (emailMD5 )) {
                rest.handleSuccess ( response, { hasInvitation : true });
                return;
            }
        }
        catch ( error ) {
            rest.handleError ( response, error );
            return;
        }
        rest.handleError ( response, 404 );
    }

    //----------------------------------------------------------------//
    async getUserAsync ( request, response ) {

        const userID = request.params.userID;
        console.log ( 'GET USER:', userID );

        try {
            const user = await this.model.getUserByIDAsync ( userID );
            rest.handleSuccess ( response, { user : user });
        }
        catch ( error ) {
            rest.handleError ( response, error );
        }
    }

    //----------------------------------------------------------------//
    async getUsersAsync ( request, response ) {

        try {

            const query             = request.query || {};
            const searchTerm        = query.search;

            const base              = _.has ( query, 'base' ) ? parseInt ( query.base ) : 0;
            const count             = _.has ( query, 'count' ) ? parseInt ( query.count ) : 20;

            console.log ( searchTerm, base, count );

            const searchResults = await this.model.findUsersAsync ( searchTerm, base, count );

            console.log ( searchResults );

            rest.handleSuccess ( response, { users : searchResults });
        }
        catch ( error ) {
            rest.handleError ( response, error );
        }
    }

    //----------------------------------------------------------------//
    async postVerifierEmailRequestAsync ( request, response ) {

        try {

            const actionID = request.params.actionID;
            console.log ( 'POST VERIFIER EMAIL REQUEST', actionID );
            assert ( Object.values ( VERIFIER_ACTIONS ).includes ( actionID ));

            const email         = request.body.email;
            const emailMD5      = crypto.createHash ( 'md5' ).update ( email ).digest ( 'hex' );

            // if already exists, send a password reset email.
            // do this for both RESET and REGISTER actions.
            const user = await this.model.findUserAsync (emailMD5 );

            if ( user ) {

                if ( roles.check ( user.role, roles.ENTITLEMENTS.CAN_RESET_PASSWORD )) {

                    console.log ( 'SENDING PASSWORD RESET EMAIL' );

                    await this.sendVerifierEmailAsync (
                        email,
                        token.create ( JSON.stringify ({ email: email }), 'localhost', 'self', config.SIGNING_KEY_FOR_PASSWORD_RESET ),
                        false,
                        this.templates.RESET_PASSWORD_EMAIL_SUBJECT,
                        this.templates.RESET_PASSWORD_EMAIL_TEXT_BODY_TEMPLATE,
                        this.templates.RESET_PASSWORD_EMAIL_HTML_BODY_TEMPLATE
                    );
                    rest.handleSuccess ( response );
                    return;
                }
            }
            else {

                // only send a new user email if REGISTER is explicitely requested.
                // this avoids sending new user emails to unregistered users.
                // note that this is only available if there is no invitation table (i.e. anyone can sign up).
                if (( actionID === VERIFIER_ACTIONS.REGISTER ) && ( config.USERSDB_MYSQL_INVITATIONS === false )) {

                    console.log ( 'SENDING SIGNUP EMAIL' );

                    // user doesn't exist, so send a create user email.
                    await this.sendVerifierEmailAsync (
                        email,
                        token.create ( JSON.stringify ({ email: email }), 'localhost', 'self', config.SIGNING_KEY_FOR_REGISTER_USER ),
                        request.body.redirect,
                        this.templates.REGISTER_USER_EMAIL_SUBJECT,
                        this.templates.REGISTER_USER_EMAIL_TEXT_BODY_TEMPLATE,
                        this.templates.REGISTER_USER_EMAIL_HTML_BODY_TEMPLATE
                    );
                    rest.handleSuccess ( response );
                    return;
                }
            }
        }
        catch ( error ) {
            rest.handleError ( response, error );
            return;
        }
        rest.handleError ( response );
    }

    //----------------------------------------------------------------//
    async putInvitation ( request, response ) {

        try {

            console.log ( 'PUT INVITATION' );

            const email         = request.body.email;
            const emailMD5      = request.params.emailMD5;

            console.log ( email, emailMD5 );

            if ( crypto.createHash ( 'md5' ).update ( email ).digest ( 'hex' ) !== emailMD5 ) {
                console.log ( 'emailMD5 did not match!' );
                rest.handleError ( response, 403 );
                return;
            }
                
            if ( !( await this.model.hasUserByEmailMD5Async ( emailMD5 ))) {

                console.log ( 'affirming invitation', emailMD5 );

                await this.model.affirmInvitationAsync (emailMD5 );

                // send (or re-send) the invitation email
                await this.sendVerifierEmailAsync (
                    email,
                    token.create ( JSON.stringify ({ email: email }), 'localhost', 'self', config.SIGNING_KEY_FOR_REGISTER_USER ),
                    request.body.redirect,
                    this.templates.INVITE_USER_EMAIL_SUBJECT,
                    this.templates.REGISTER_USER_EMAIL_TEXT_BODY_TEMPLATE,
                    this.templates.REGISTER_USER_EMAIL_HTML_BODY_TEMPLATE
                );

                rest.handleSuccess ( response );
                return;
            }
            console.log ( 'user already exists...' );
        }
        catch ( error ) {
            console.log ( error );
            rest.handleError ( response, error );
            return;
        }
        rest.handleError ( response );
    }

    //----------------------------------------------------------------//
    async putUserRoleAsync ( request, response ) {

        try {

            const userID    = request.params.userID;
            const role      = request.body.role;

            console.log ( 'PUT ROLE:', userID, role );

            if ( request.user.userID === userID ) {
                rest.handleError ( response, 403 );
                return;
            }

            await this.model.updateRoleAsync ( userID, role );

            rest.handleSuccess ( response );
            return;
        }
        catch ( error ) {
            console.log ( error );
            rest.handleError ( response, error );
            return;
        }
        rest.handleError ( response, 401 );
    }

    //----------------------------------------------------------------//
    async sendVerifierEmailAsync ( email, verifier, redirect, subject, textTemplate, htmlTemplate ) {
        
        const context = {
            verifier: verifier,
            redirect: redirect || '/',
        };

        const text = textTemplate ( context );
        const html = htmlTemplate ( context );

        await this.mailer.mailTransport.sendMail ({
            from:       config.GMAIL_USER,
            to:         email,
            subject:    subject,
            text:       text,
            html:       html,
        });

        return context.verifier;
    }
}