// Copyright (c) 2019 Fall Guy LLC All Rights Reserved.

import * as roles                                       from './roles';
import { assert, ModelError, ERROR_STATUS }             from 'fgc';
import bcrypt                                           from 'bcryptjs';
import * as consts                                      from 'consts';
import crypto                                           from 'crypto';
import _                                                from 'lodash';

//================================================================//
// UsersDBMySQL
//================================================================//
export class UsersDBMySQL {

    //----------------------------------------------------------------//
    async affirmInvitationAsync ( conn, emailMD5 ) {


        if ( consts.USERSDB_MYSQL_INVITATIONS === false ) return;

        // invitation behavior differes if we are using an invitation table (i.e. membership is invitation-only).
        // if anyone can sign up, then there is no need for an invitation table.

        return conn.runInConnectionAsync ( async () => {

            const hasInvitation = await this.hasInvitationAsync ( conn, emailMD5 );

            if ( !hasInvitation ) {

                await conn.query (`
                    INSERT
                    INTO        ${ consts.USERSDB_MYSQL_INVITATIONS } ( emailMD5 )
                    VALUES      ( '${ emailMD5 }' )
                `);
            }
        });
    }

    //----------------------------------------------------------------//
    async affirmUserAsync ( conn, user ) {

        return conn.runInConnectionAsync ( async () => {

            const role = user.role || roles.STANDARD_ROLES.USER;

            const existingUser = ( await conn.query ( `SELECT id FROM ${ consts.USERSDB_MYSQL_TABLE } WHERE username = '${ user.username }' OR emailMD5 = '${ user.emailMD5 }'` ))[ 0 ];

            if ( existingUser ) {

                await conn.query (`
                    UPDATE  ${ consts.USERSDB_MYSQL_TABLE }
                    SET     username    = '${ user.username }',
                            password    = '${ user.password }'
                            emailMD5    = '${ user.emailMD5 }',
                            role        = '${ role }',,
                    WHERE   id          = ${ existingUser.id }
                `);

                user.userID = existingUser.id;
            }
            else {

                const result = await conn.query (`
                    INSERT
                    INTO        ${ consts.USERSDB_MYSQL_TABLE } ( username, password, emailMD5, role )
                    VALUES      ( '${ user.username }', '${ user.password }', '${ user.emailMD5 }', '${ role }' )
                `);

                assert ( typeof ( result.insertId ) === 'number' );
                user.userID = result.insertId;
            }

            return user;
        });
    }

    //----------------------------------------------------------------//
    async canRegisterUserAsync ( conn, username, emailMD5 ) {

        // cannot recreate user
        if ( await conn.hasAsync ( `FROM ${ consts.USERSDB_MYSQL_TABLE } WHERE username = '${ username }' OR emailMD5 = '${ emailMD5 }'` )) return false;

        // check invitation
        return consts.USERSDB_MYSQL_INVITATIONS ? await conn.hasAsync ( `FROM ${ consts.USERSDB_MYSQL_INVITATIONS } WHERE emailMD5 = '${ emailMD5 }'` ) : true;
    }

    //----------------------------------------------------------------//
    constructor () {
    }

    //----------------------------------------------------------------//
    async deleteInvitationAsync ( conn, emailMD5 ) {

        if ( consts.USERSDB_MYSQL_INVITATIONS === false ) return;

        return conn.runInConnectionAsync ( async () => {

            await conn.query (`
                DELETE FROM     ${ consts.USERSDB_MYSQL_INVITATIONS } 
                WHERE           emailMD5 = ( '${ emailMD5 }' )
            `);
        });
    }

    //----------------------------------------------------------------//
    async findUserAsync ( conn, usernameOrEmailMD5 ) {

        return conn.runInConnectionAsync ( async () => {

            const row = ( await conn.query (`
                SELECT      *
                FROM        ${ consts.USERSDB_MYSQL_TABLE } 
                WHERE       username = '${ usernameOrEmailMD5 }'
                    OR      emailMD5 = '${ usernameOrEmailMD5 }'
            `))[ 0 ];

            return row ? this.userFromRow ( row ) : false;
        });
    }

    //----------------------------------------------------------------//
    async findUsersAsync ( conn, searchTerm, base, count ) {
        
        return conn.runInConnectionAsync ( async () => {

            base    = base || 0;
            count   = count || 256;

            let rows = [];

            if ( searchTerm ) {
                rows = await conn.query (`
                    SELECT      *
                    FROM        ${ consts.USERSDB_MYSQL_TABLE } 
                    WHERE
                        MATCH ( username )
                        AGAINST ( '${ searchTerm }*' IN BOOLEAN MODE )
                    LIMIT ${ base },${ count }
                `);
            }
            else {
                rows = await conn.query (`
                    SELECT      *
                    FROM        ${ consts.USERSDB_MYSQL_TABLE } 
                    LIMIT ${ base },${ count }
                `); 
            }

            const users = [];
            for ( let row of rows ) {
                users.push ( this.userFromRow ( row ));
            }
            return users;
        });
    }

    //----------------------------------------------------------------//
    formatUserPublicName ( user ) {

        return user.username;
    }

    //----------------------------------------------------------------//
    async getUserAsync ( conn, usernameOrEmailMD5 ) {

        return conn.runInConnectionAsync ( async () => {
            const user = await this.findUserAsync ( conn, usernameOrEmailMD5 );
            if ( !user ) throw new ModelError ( ERROR_STATUS.NOT_FOUND, 'User does not exist.' );
            return user;
        });
    }

    //----------------------------------------------------------------//
    async getUserByIDAsync ( conn, userID ) {

        return conn.runInConnectionAsync ( async () => {

            const row = ( await conn.query (`
                SELECT      *
                FROM        ${ consts.USERSDB_MYSQL_TABLE } 
                WHERE       id = ${ userID }
            `))[ 0 ];
            
            if ( !row ) throw new ModelError ( ERROR_STATUS.NOT_FOUND, 'User does not exist.' );
            return this.userFromRow ( row );
        });
    }

    //----------------------------------------------------------------//
    async getUserPasswordAsync ( conn, userID ) {

        return conn.runInConnectionAsync ( async () => {

            const row = ( await conn.query (`
                SELECT      password
                FROM        ${ consts.USERSDB_MYSQL_TABLE } 
                WHERE       id = '${ userID }'
            `))[ 0 ];
            
            if ( !row ) throw new ModelError ( ERROR_STATUS.NOT_FOUND, 'User does not exist.' );
            return row.password;
        });
    }

    //----------------------------------------------------------------//
    async hasInvitationAsync ( conn, emailMD5 ) {

        if ( consts.USERSDB_MYSQL_INVITATIONS === false ) return true;

        return conn.runInConnectionAsync ( async () => {
            return await conn.hasAsync ( `FROM ${ consts.USERSDB_MYSQL_INVITATIONS } WHERE emailMD5 = '${ emailMD5 }'` );
        });
    }

    //----------------------------------------------------------------//
    async hasUserByEmailMD5Async ( conn, emailMD5 ) {

        return conn.runInConnectionAsync ( async () => {

            const row = ( await conn.query (`
                SELECT      COUNT ( id )
                AS          count
                FROM        ${ consts.USERSDB_MYSQL_TABLE }
                WHERE       emailMD5 = '${ emailMD5 }'
            `))[ 0 ];
            
            return row && row.count && row.count > 0;
        });
    }

    //----------------------------------------------------------------//
    async updateRoleAsync ( conn, userID, role ) {

        assert ( role );
        assert ( _.includes ( roles.STANDARD_ROLES, role ));

        return conn.runInConnectionAsync ( async () => {

            const row = ( await conn.query ( `SELECT * FROM ${ consts.USERSDB_MYSQL_TABLE } WHERE id = ${ userID }` ))[ 0 ];
            if ( !row ) throw new ModelError ( ERROR_STATUS.NOT_FOUND, 'User does not exist.' );
            
            await conn.query (`
                UPDATE  ${ consts.USERSDB_MYSQL_TABLE }
                SET     role       = '${ role }'
                WHERE   id         = ${ userID }
            `);
        });
    }

    //----------------------------------------------------------------//
    async updateDatabaseSchemaAsync ( conn ) {

        return conn.runInTransactionAsync ( async () => {

            await conn.query (`
                CREATE TABLE IF NOT EXISTS ${ consts.USERSDB_MYSQL_TABLE } (
                    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
                    username    TEXT,
                    password    TEXT,
                    emailMD5    TEXT NOT NULL,
                    role        TEXT NOT NULL,
                    PRIMARY KEY ( id ),
                    FULLTEXT name_fulltext ( username )
                )
            `);

            if ( consts.USERSDB_MYSQL_INVITATIONS ) {

                await conn.query (`
                    CREATE TABLE IF NOT EXISTS ${ consts.USERSDB_MYSQL_INVITATIONS } (
                        id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
                        emailMD5    TEXT NOT NULL,
                        PRIMARY KEY ( id )
                    )
                `);
            }

            const userCount = await conn.countAsync ( `FROM ${ consts.USERSDB_MYSQL_TABLE }` );

            if ( userCount === 0 ) {

                const username      = consts.USERSDM_MYSQL_ADMIN_NAME;
                const password      = consts.USERSDM_MYSQL_ADMIN_PW;
                const email         = consts.USERSDM_MYSQL_ADMIN_EMAIL;
                const emailMD5      = crypto.createHash ( 'md5' ).update ( email ).digest ( 'hex' );

                let user = {
                    username:       username,
                    password:       await bcrypt.hash ( password, consts.USERSDM_MYSQL_SALT_ROUNDS ),
                    emailMD5:       emailMD5, // TODO: encrypt plaintext email with user's password and store
                    role:           roles.STANDARD_ROLES.ADMIN,
                };

                await this.affirmUserAsync ( conn, user );
            }
        });
    }

    //----------------------------------------------------------------//
    userFromRow ( row ) {

        return {
            userID:         row.id,
            username:       row.username,
            emailMD5:       row.emailMD5,
            role:           row.role,
        };
    }
}
