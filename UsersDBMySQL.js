// Copyright (c) 2019 Fall Guy LLC All Rights Reserved.

import * as roles                                       from './roles';
import { assert, ModelError, ERROR_STATUS }             from 'fgc';
import bcrypt                                           from 'bcryptjs';
import * as config                                      from 'config';
import crypto                                           from 'crypto';
import _                                                from 'lodash';

//================================================================//
// UsersDBMySQL
//================================================================//
export class UsersDBMySQL {

    //----------------------------------------------------------------//
    async affirmInvitationAsync ( emailMD5 ) {

        if ( config.USERSDB_MYSQL_INVITATIONS === false ) return;

        // invitation behavior differes if we are using an invitation table (i.e. membership is invitation-only).
        // if anyone can sign up, then there is no need for an invitation table.

        return this.db.runInConnectionAsync ( async () => {

            const hasInvitation = await this.hasInvitationAsync ( emailMD5 );

            if ( !hasInvitation ) {

                await this.db.query (`
                    INSERT
                    INTO        ${ config.USERSDB_MYSQL_INVITATIONS } ( emailMD5 )
                    VALUES      ( '${ emailMD5 }' )
                `);
            }
        });
    }

    //----------------------------------------------------------------//
    async affirmUserAsync ( user ) {

        return this.db.runInConnectionAsync ( async () => {

            const role = user.role || roles.STANDARD_ROLES.USER;

            const existingUser = ( await this.db.query ( `SELECT id FROM ${ config.USERSDB_MYSQL_TABLE } WHERE username = '${ user.username }' OR emailMD5 = '${ user.emailMD5 }'` ))[ 0 ];

            if ( existingUser ) {

                await this.db.query (`
                    UPDATE  ${ config.USERSDB_MYSQL_TABLE }
                    SET     username    = '${ user.username }',
                            password    = '${ user.password }'
                            emailMD5    = '${ user.emailMD5 }',
                            role        = '${ role }',,
                    WHERE   id          = ${ existingUser.id }
                `);

                user.userID = existingUser.id;
                return await this.onUpdateUserAsync ( user );
            }

            const result = await this.db.query (`
                INSERT
                INTO        ${ config.USERSDB_MYSQL_TABLE } ( username, password, emailMD5, role )
                VALUES      ( '${ user.username }', '${ user.password }', '${ user.emailMD5 }', '${ role }' )
            `);

            assert ( typeof ( result.insertId ) === 'number' );
            user.userID = result.insertId;

            return await this.onNewUserAsync ( user );
        });
    }

    //----------------------------------------------------------------//
    async canRegisterUserAsync ( username, emailMD5 ) {

        // cannot recreate user
        if ( await this.db.hasAsync ( `FROM ${ config.USERSDB_MYSQL_TABLE } WHERE username = '${ username }' OR emailMD5 = '${ emailMD5 }'` )) return false;

        // check invitation
        return config.USERSDB_MYSQL_INVITATIONS ? await this.db.hasAsync ( `FROM ${ config.USERSDB_MYSQL_INVITATIONS } WHERE emailMD5 = '${ emailMD5 }'` ) : true;
    }

    //----------------------------------------------------------------//
    constructor ( db ) {

        this.db = db;
    }

    //----------------------------------------------------------------//
    async deleteInvitationAsync ( emailMD5 ) {

        if ( config.USERSDB_MYSQL_INVITATIONS === false ) return;

        return this.db.runInConnectionAsync ( async () => {

            await this.db.query (`
                DELETE FROM     ${ config.USERSDB_MYSQL_INVITATIONS } 
                WHERE           emailMD5 = ( '${ emailMD5 }' )
            `);
        });
    }

    //----------------------------------------------------------------//
    async findUserAsync ( usernameOrEmailMD5 ) {

        return this.db.runInConnectionAsync ( async () => {

            const row = ( await this.db.query (`
                SELECT      *
                FROM        ${ config.USERSDB_MYSQL_TABLE } 
                WHERE       username = '${ usernameOrEmailMD5 }'
                    OR      emailMD5 = '${ usernameOrEmailMD5 }'
            `))[ 0 ];

            return row ? await this.userFromRowAsync ( row ) : false;
        });
    }

    //----------------------------------------------------------------//
    async findUsersAsync ( searchTerm, base, count ) {
        
        return this.db.runInConnectionAsync ( async () => {

            base    = base || 0;
            count   = count || 256;

            let rows = [];

            if ( searchTerm ) {
                rows = await this.db.query (`
                    SELECT      *
                    FROM        ${ config.USERSDB_MYSQL_TABLE } 
                    WHERE
                        MATCH ( username )
                        AGAINST ( '${ searchTerm }*' IN BOOLEAN MODE )
                    LIMIT ${ base },${ count }
                `);
            }
            else {
                rows = await this.db.query (`
                    SELECT      *
                    FROM        ${ config.USERSDB_MYSQL_TABLE } 
                    LIMIT ${ base },${ count }
                `); 
            }

            const users = [];
            for ( let row of rows ) {
                users.push ( await this.userFromRowAsync ( row ));
            }
            return users;
        });
    }

    //----------------------------------------------------------------//
    formatUserPublicName ( user ) {

        return user.username;
    }

    //----------------------------------------------------------------//
    async getUserAsync ( usernameOrEmailMD5 ) {

        return this.db.runInConnectionAsync ( async () => {
            const user = await this.findUserAsync ( usernameOrEmailMD5 );
            if ( !user ) throw new ModelError ( ERROR_STATUS.NOT_FOUND, 'User does not exist.' );
            return user;
        });
    }

    //----------------------------------------------------------------//
    async getUserByIDAsync ( userID ) {

        return this.db.runInConnectionAsync ( async () => {

            const row = ( await this.db.query (`
                SELECT      *
                FROM        ${ config.USERSDB_MYSQL_TABLE } 
                WHERE       id = ${ userID }
            `))[ 0 ];
            
            if ( !row ) throw new ModelError ( ERROR_STATUS.NOT_FOUND, 'User does not exist.' );
            return await this.userFromRowAsync ( row );
        });
    }

    //----------------------------------------------------------------//
    async getUserPasswordAsync ( userID ) {

        return this.db.runInConnectionAsync ( async () => {

            const row = ( await this.db.query (`
                SELECT      password
                FROM        ${ config.USERSDB_MYSQL_TABLE } 
                WHERE       id = '${ userID }'
            `))[ 0 ];
            
            if ( !row ) throw new ModelError ( ERROR_STATUS.NOT_FOUND, 'User does not exist.' );
            return row.password;
        });
    }

    //----------------------------------------------------------------//
    async hasInvitationAsync ( emailMD5 ) {

        if ( config.USERSDB_MYSQL_INVITATIONS === false ) return true;

        return this.db.runInConnectionAsync ( async () => {
            return await this.db.hasAsync ( `FROM ${ config.USERSDB_MYSQL_INVITATIONS } WHERE emailMD5 = '${ emailMD5 }'` );
        });
    }

    //----------------------------------------------------------------//
    async hasUserByEmailMD5Async ( emailMD5 ) {

        return this.db.runInConnectionAsync ( async () => {

            const row = ( await this.db.query (`
                SELECT      COUNT ( id )
                AS          count
                FROM        ${ config.USERSDB_MYSQL_TABLE }
                WHERE       emailMD5 = '${ emailMD5 }'
            `))[ 0 ];
            
            return row && row.count && row.count > 0;
        });
    }

    //----------------------------------------------------------------//
    async onNewUserAsync ( user ) {
        return user;
    }

    //----------------------------------------------------------------//
    async onUpdateDatabaseAsync () {
    }

    //----------------------------------------------------------------//
    async onUpdateUserAsync ( user ) {
        return user;
    }

    //----------------------------------------------------------------//
    async onUserFromRowAsync ( user ) {
        return user;
    }

    //----------------------------------------------------------------//
    async updateRoleAsync ( userID, role ) {

        assert ( role );
        assert ( _.includes ( roles.STANDARD_ROLES, role ));

        return this.db.runInConnectionAsync ( async () => {

            const row = ( await this.db.query ( `SELECT * FROM ${ config.USERSDB_MYSQL_TABLE } WHERE id = ${ userID }` ))[ 0 ];
            if ( !row ) throw new ModelError ( ERROR_STATUS.NOT_FOUND, 'User does not exist.' );
            
            await this.db.query (`
                UPDATE  ${ config.USERSDB_MYSQL_TABLE }
                SET     role       = '${ role }'
                WHERE   id         = ${ userID }
            `);
        });
    }

    //----------------------------------------------------------------//
    async updateDatabaseAsync () {

        return this.db.runInTransactionAsync ( async () => {

            await this.db.query (`
                CREATE TABLE IF NOT EXISTS ${ config.USERSDB_MYSQL_TABLE } (
                    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
                    username    TEXT,
                    password    TEXT,
                    emailMD5    TEXT NOT NULL,
                    role        TEXT NOT NULL,
                    PRIMARY KEY ( id ),
                    FULLTEXT name_fulltext ( username )
                )
            `);

            if ( config.USERSDB_MYSQL_INVITATIONS ) {

                await this.db.query (`
                    CREATE TABLE IF NOT EXISTS ${ config.USERSDB_MYSQL_INVITATIONS } (
                        id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
                        emailMD5    TEXT NOT NULL,
                        PRIMARY KEY ( id )
                    )
                `);
            }

            const userCount = await this.db.countAsync ( `FROM ${ config.USERSDB_MYSQL_TABLE }` );

            if ( userCount === 0 ) {

                const username      = config.USERSDM_MYSQL_ADMIN_NAME;
                const password      = config.USERSDM_MYSQL_ADMIN_PW;
                const email         = config.USERSDM_MYSQL_ADMIN_EMAIL;
                const emailMD5      = crypto.createHash ( 'md5' ).update ( email ).digest ( 'hex' );

                let user = {
                    username:       username,
                    password:       await bcrypt.hash ( password, config.USERSDM_MYSQL_SALT_ROUNDS ),
                    emailMD5:       emailMD5, // TODO: encrypt plaintext email with user's password and store
                    role:           roles.STANDARD_ROLES.ADMIN,
                };

                await this.affirmUserAsync ( user );
            }

            await this.onUpdateDatabaseAsync ();
        });
    }

    //----------------------------------------------------------------//
    async userFromRowAsync ( row ) {

        return await this.onUserFromRowAsync ({
            userID:         row.id,
            username:       row.username,
            emailMD5:       row.emailMD5,
            role:           row.role,
        });
    }
}
