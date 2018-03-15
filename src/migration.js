import path from 'path';
import fs from  'fs';
import AWS from 'aws-sdk';
import _ from 'lodash';
import {awsRegion, dynamoEndpoint, dynamoMigrationsTablename, dynamoMigrationsFolder} from './consts';

AWS.config.update({
    region: awsRegion,
    endpoint: dynamoEndpoint
});

export default class MigrationEngine {

    db;

    constructor() {
        this.db = new AWS.DynamoDB();
    }

    static abort(message) {
        console.error('  %s', message);
        process.exit(1);
    }

    static loadMigrations(lastMigration) {

        const last = (lastMigration && !_.isEmpty(lastMigration.Items)) ? parseInt(lastMigration.LastEvaluatedKey.name.S) : 0;

        return fs.readdirSync(dynamoMigrationsFolder)
            .filter(function (file) {
                return file.match(/^\d+.*\.js$/) && parseInt(file) > last;
            })
            .sort()
            .map(function (file) {
                return file.substr(0, file.indexOf('.js'));
            });
    }

    create(migrationName) {
        const migrations = MigrationEngine.loadMigrations();

        const last = parseInt(migrations[migrations.length - 1]) || 0;

        let name = _.padStart(last + 1, 3, '0');

        if (migrationName) {
            name += '-' + migrationName.replace(/\s+/g, '-');
        }

        const template = [
            '\'use strict\''
            , ''
            , 'exports.up = function (next) {'
            , '  next();'
            , '};'
            , ''
            , 'exports.down = function(next){'
            , '  next();'
            , '};'
            , ''
        ].join('\n');

        let path = dynamoMigrationsFolder + '/' + name + '.js';
        fs.writeFileSync(path, template);

        console.log(`${name} : created`);
    }

    /**
     * List all ran migrations on dynamoDB
     * @param params
     */
    list(params) {
        const default_params = {
            TableName: process.env.DYNAMO_PREFIX + dynamoMigrationsTablename,
            Select: 'ALL_ATTRIBUTES',
            ScanIndexForward: false,
            KeyConditions: {
                type: {
                    ComparisonOperator: 'EQ',
                    AttributeValueList: [{S: 'migration'}]
                }
            }
        };

        this.db.query(_.merge(default_params, params), function (err, data) {
            if (err) {
                if (err.code == 'ResourceNotFoundException')
                    MigrationEngine.abort('The list is empty');

                MigrationEngine.abort(err);
            }

            data.Items.forEach(function (element) {
                console.log(`${element.runAt.S} : ${element.name.S}`);
            });
        });
    };

    async up(migrationName, createMigrationTable) {

        if (createMigrationTable) {
            try {
                await this.createMigrationsTable();
            }
            catch (error) {
                MigrationEngine.abort(`Can\'t create migration table : ${err}`);
            }
        }

        let migrations;
        if (migrationName) {
            migrations = [migrationName];
        }
        else {
            const last = await this.getLastRemoteMigration();
            migrations = MigrationEngine.loadMigrations(last);
        }

        try {
            for (let i = 0; i < migrations.length; i++) {
                await this.upOne(migrations[i]);
            }
        }
        catch (err) {
            MigrationEngine.abort(`${migrationName} : ${err}`);
        }


    }

    async upOne(migrationName) {
        return new Promise(async (resolve, reject) => {
            try {
                let exist = await this.findRemoteMigration(migrationName);
                if (!_.isEmpty(exist)) {
                    return reject('Already ran');
                }

                await this.run(migrationName, 'up');
                await this.logMigration(migrationName, 'up');

                console.log(`${migrationName} : up done`);
                resolve();
            }
            catch (err) {
                reject(err);
            }
        });
    }

    async down(migrationName) {

        if (!migrationName) MigrationEngine.abort('You must provide a migration');

        try {
            let exist = await this.findRemoteMigration(migrationName);
            if (_.isEmpty(exist)) {
                throw new Error('Not been run already');
            }

            await this.run(migrationName, 'down');
            await this.logMigration(migrationName, 'down');
        }
        catch (err) {
            MigrationEngine.abort(`${migrationName} : ${err}`);

        }

        console.log(`${migrationName} : down done`);
    }

    run(migrationName, direction) {
        return new Promise((resolve, reject) => {

            const migrationFile = path.resolve(`${dynamoMigrationsFolder}/${migrationName}`);

            try {
                const action = require(migrationFile)[direction];

                function callback(err) {
                    if (err) {
                        return reject(err);
                    }
                    resolve();
                }

                action.apply(this, [callback]);
            }
            catch (err) {
                reject(err);
            }
        });
    }

    findRemoteMigration(migrationName) {
        return new Promise((resolve, reject) => {
            const params = {
                TableName: process.env.DYNAMO_PREFIX + dynamoMigrationsTablename,
                Key: {
                    type: {S: 'migration'},
                    name: {S: migrationName}
                }
            };

            this.db.getItem(params, function (err, data) {
                if (err) return reject('Error while looking if this migration has already been run : ' + err);

                resolve(data);
            });
        });
    }

    getLastRemoteMigration() {
        return new Promise((resolve, reject) => {
            const params = {
                TableName: process.env.DYNAMO_PREFIX + dynamoMigrationsTablename,
                KeyConditions: {
                    type: {
                        ComparisonOperator: 'EQ',
                        AttributeValueList: [{S: 'migration'}]
                    }
                },
                ScanIndexForward: false,
                Limit: 1
            };

            this.db.query(params, function (err, data) {
                if (err) return reject('Error while fetching the last migration : ' + err);
                resolve(data);
            });
        });
    }

    logMigration(migrationName, direction) {
        try {
            return new Promise((resolve, reject) => {
                if ('up' === direction) {
                    const params = {
                        TableName: process.env.DYNAMO_PREFIX + dynamoMigrationsTablename,
                        Item: { // a map of attribute name to AttributeValue
                            type: {S: 'migration'},
                            name: {S: migrationName},
                            runAt: {S: (new Date()).toUTCString()}
                        }
                    };

                    this.db.putItem(params, function (err, data) {
                        if (err) return reject('erreur de log');

                        return resolve();
                    });
                }
                else if ('down' === direction) {
                    const params = {
                        TableName: process.env.DYNAMO_PREFIX + dynamoMigrationsTablename,
                        Key: {
                            type: {S: 'migration'},
                            name: {S: migrationName}
                        }
                    };

                    this.db.deleteItem(params, function (err, data) {
                        if (err) return reject('erreur de log');

                        return resolve();
                    });
                }
            });
        }
        catch (err) {
            throw new Error('CAREFUL, migration couldn\'t be log : ' + err);
        }
    }

    createMigrationsTable() {
        return new Promise((resolve, reject) => {
            this.db.describeTable({TableName: process.env.DYNAMO_PREFIX + dynamoMigrationsTablename}, (error) => {
                if (error && error.code == 'ResourceNotFoundException') {
                    const params = {
                        TableName: process.env.DYNAMO_PREFIX + dynamoMigrationsTablename,
                        AttributeDefinitions: [
                            {AttributeName: 'type', AttributeType: 'S'},
                            {AttributeName: 'name', AttributeType: 'S'}
                        ],
                        KeySchema: [
                            {AttributeName: 'type', KeyType: 'HASH'},
                            {AttributeName: 'name', KeyType: 'RANGE'}
                        ],
                        ProvisionedThroughput: {ReadCapacityUnits: 1, WriteCapacityUnits: 1}
                    };

                    this.db.createTable(params, (err) => {
                        if (err) {
                            console.log(err)
                            reject(err);
                        }

                        //wait until status created to resolve
                        setTimeout(() => {
                            this.db.describeTable({TableName: process.env.DYNAMO_PREFIX + dynamoMigrationsTablename}, (error, data) => {
                                if ('ACTIVE' == data.Table.TableStatus) {
                                    resolve('Table migrations created');

                                }
                            });
                        }, 1000);

                    });
                } else if (error) {
                    reject(error);
                }
                else {
                    resolve('Table migrations already exists');
                }
            });
        });
    }
}

