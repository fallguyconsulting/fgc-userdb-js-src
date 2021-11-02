// Copyright (c) 2019 Fall Guy LLC All Rights Reserved.

import { PasswordMiddleware }       from './PasswordMiddleware';
import * as roles                   from './roles';
import { SessionMiddleware }        from './SessionMiddleware';
import * as token                   from './token';
import bcrypt                       from 'bcryptjs';
import * as consts                  from 'consts';
import crypto                       from 'crypto';
import * as env                     from 'env';
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
    constructor ( db, templates, defaultRoles ) {
        
        assert ( templates );

        this.templates      = templates;
        this.roles          = defaultRoles || [];
        this.db             = db;

        this.mailer = new Mailer ( env );

        this.router = express.Router ();

        this.router.post ( '/login',                this.postLoginAsync.bind ( this ));
        this.router.post ( '/login/reset',          this.postLoginWithPasswordResetAsync.bind ( this ));
        this.router.post ( '/login/register',       this.postLoginWithRegisterUserAsync.bind ( this ));
        this.router.post ( '/verifier/:actionID',   this.postVerifierEmailRequestAsync.bind ( this ));

        const tokenMiddleware       = new token.TokenMiddleware ( env.SIGNING_KEY_FOR_SESSION, 'userID' );
        const sessionMiddleware     = new SessionMiddleware ( this.db );
        
        this.router.get (
            '/users/:userID',
            tokenMiddleware.withTokenAuth (),
            this.getUserAsync.bind ( this )
        );
        
        this.router.get (
            '/users',
            tokenMiddleware.withTokenAuth (),
            this.getUsersAsync.bind ( this )
        );

        // roles

        this.router.put (
            '/users/:userID/role',
            tokenMiddleware.withTokenAuth (),
            sessionMiddleware.isAdmin (),
            this.putUserRoleAsync.bind ( this )
        );

        // invitations

        this.router.get (
            '/invitations/:emailMD5',
            tokenMiddleware.withTokenAuth (),
            sessionMiddleware.isAdmin (),
            this.getInvitation.bind ( this )
        );

        this.router.put (
            '/invitations/:emailMD5',
            tokenMiddleware.withTokenAuth (),
            sessionMiddleware.isAdmin (),
            this.putInvitation.bind ( this )
        );

        this.router.delete (
            '/invitations/:emailMD5',
            tokenMiddleware.withTokenAuth (),
            sessionMiddleware.isAdmin (),
            this.deleteInvitation.bind ( this )
        );
    }

    //----------------------------------------------------------------//
    async deleteInvitation ( request, response ) {

        try {
            console.log ( 'DELETE INVITATION' );
            const emailMD5 = request.params.emailMD5;

            const conn = this.db.makeConnection ();
            await this.db.users.deleteInvitationAsync ( conn, emailMD5 );   
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

            const conn = this.db.makeConnection ();
            const user = await this.db.users.findUserAsync ( conn, emailMD5 );

            if ( user ) {
                rest.handleSuccess ( response, { user : user });
                return;
            }

            if ( await this.db.users.hasInvitationAsync ( conn, emailMD5 )) {
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
            const conn = this.db.makeConnection ();
            const user = await this.db.users.getUserByIDAsync ( conn, userID );
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

            const conn = this.db.makeConnection ();
            const searchResults = await this.db.users.findUsersAsync ( conn, searchTerm, base, count );

            console.log ( searchResults );

            rest.handleSuccess ( response, { users : searchResults });
        }
        catch ( error ) {
            rest.handleError ( response, error );
        }
    }

    //----------------------------------------------------------------//
    makeSession ( user, signingKey ) {

        return {
            token:          token.create ( user.userID, 'localhost', 'self', signingKey ),
            userID:         user.userID,
            username:       user.username,
            emailMD5:       user.emailMD5,
            role:           user.role,
        };
    }

    //----------------------------------------------------------------//
    async postLoginAsync ( request, response ) {

        console.log ( 'POST LOGIN' );

        try {

            const conn          = this.db.makeConnection ();

            const body          = request.body;
            const email         = body.email;
            const emailMD5      = crypto.createHash ( 'md5' ).update ( email ).digest ( 'hex' );

            console.log ( email, emailMD5 );

            const user          = await this.db.users.getUserAsync ( conn, emailMD5 );
            const password      = await this.db.users.getUserPasswordAsync ( conn, user.userID );

            console.log ( user.username, emailMD5 );

            console.log ( 'USER LOGGING IN:', user );

            if ( roles.check ( user.role, roles.ENTITLEMENTS.CAN_LOGIN ) && ( await bcrypt.compare ( body.password, password ))) {
                rest.handleSuccess ( response, { session: this.makeSession ( user, env.SIGNING_KEY_FOR_SESSION )});
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

    //----------------------------------------------------------------//
    async postLoginWithPasswordResetAsync ( request, response ) {

        try {

            console.log ( 'POST LOGIN WITH PASSWORD RESET' );

            const conn          = this.db.makeConnection ();

            const body          = request.body;
            const verifier      = body.verifier;
            const password      = body.password;
            const email         = body.email;
            const emailMD5      = crypto.createHash ( 'md5' ).update ( email ).digest ( 'hex' );

            assert ( verifier );
            const verified = token.verify ( body.verifier, env.SIGNING_KEY_FOR_PASSWORD_RESET );
            assert ( verified && verified.body && verified.body.sub );

            const payload = JSON.parse ( verified.body.sub );
            assert ( payload.email === email );

            const user = await this.db.users.getUserAsync ( conn, emailMD5 );

            if ( roles.check ( user.role, roles.ENTITLEMENTS.CAN_RESET_PASSWORD ) && roles.check ( user.role, roles.ENTITLEMENTS.CAN_LOGIN )) {

                user.password = await bcrypt.hash ( password, env.SALT_ROUNDS );
                await this.db.users.affirmUserAsync ( conn, user );

                rest.handleSuccess ( response, { session: this.makeSession ( user, env.SIGNING_KEY_FOR_SESSION )});
                return;
            }
        }
        catch ( error ) {
            rest.handleError ( response, error );
            return;
        }
        rest.handleError ( response, 401 );
    }

    //----------------------------------------------------------------//
    async postLoginWithRegisterUserAsync ( request, response ) {

        try {

            console.log ( 'POST LOGIN WITH REGISTER USER' );

            const conn          = this.db.makeConnection ();

            const body          = request.body;

            console.log ( 'BODY', body );

            const verifier      = body.verifier;
            const username      = body.username;
            const password      = body.password;
            const email         = body.email;
            const emailMD5      = crypto.createHash ( 'md5' ).update ( email ).digest ( 'hex' );

            // do not overwrite existing users
            if ( await this.db.users.canRegisterUserAsync ( conn, username, emailMD5 )) {

                assert ( verifier );
                const verified = token.verify ( body.verifier, env.SIGNING_KEY_FOR_REGISTER_USER );
                assert ( verified && verified.body && verified.body.sub );

                const payload = JSON.parse ( verified.body.sub );
                assert ( payload.email === email );

                let user = {
                    username:       username,
                    password:       await bcrypt.hash ( password, consts.USERSDM_MYSQL_SALT_ROUNDS ),
                    emailMD5:       emailMD5, // TODO: encrypt plaintext email with user's password and store
                };

                user = await this.db.users.affirmUserAsync ( conn, user );
                rest.handleSuccess ( response, { session: this.makeSession ( user, env.SIGNING_KEY_FOR_SESSION )});
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

    //----------------------------------------------------------------//
    async postVerifierEmailRequestAsync ( request, response ) {

        try {

            const actionID = request.params.actionID;
            console.log ( 'POST VERIFIER EMAIL REQUEST', actionID );
            assert ( Object.values ( VERIFIER_ACTIONS ).includes ( actionID ));

            const conn          = this.db.makeConnection ();

            const email         = request.body.email;
            const emailMD5      = crypto.createHash ( 'md5' ).update ( email ).digest ( 'hex' );

            // if already exists, send a password reset email.
            // do this for both RESET and REGISTER actions.
            const user = await this.db.users.findUserAsync ( conn, emailMD5 );

            if ( user ) {

                if ( roles.check ( user.role, roles.ENTITLEMENTS.CAN_RESET_PASSWORD )) {

                    console.log ( 'SENDING PASSWORD RESET EMAIL' );

                    await this.sendVerifierEmailAsync (
                        email,
                        token.create ( JSON.stringify ({ email: email }), 'localhost', 'self', env.SIGNING_KEY_FOR_PASSWORD_RESET ),
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
                if (( actionID === VERIFIER_ACTIONS.REGISTER ) && ( consts.USERSDB_MYSQL_INVITATIONS === false )) {

                    console.log ( 'SENDING SIGNUP EMAIL' );

                    // user doesn't exist, so send a create user email.
                    await this.sendVerifierEmailAsync (
                        email,
                        token.create ( JSON.stringify ({ email: email }), 'localhost', 'self', env.SIGNING_KEY_FOR_REGISTER_USER ),
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
            
            const conn = this.db.makeConnection ();
    
            if ( !( await this.db.users.hasUserByEmailMD5Async ( conn, emailMD5 ))) {

                console.log ( 'affirming invitation', emailMD5 );

                await this.db.users.affirmInvitationAsync ( conn, emailMD5 );

                // send (or re-send) the invitation email
                await this.sendVerifierEmailAsync (
                    email,
                    token.create ( JSON.stringify ({ email: email }), 'localhost', 'self', env.SIGNING_KEY_FOR_REGISTER_USER ),
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

            const conn = this.db.makeConnection ();
            await this.db.users.updateRoleAsync ( conn, userID, role );

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
            from:       env.GMAIL_USER,
            to:         email,
            subject:    subject,
            text:       text,
            html:       html,
        });

        return context.verifier;
    }
}