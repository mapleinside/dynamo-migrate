import path from 'path';
import fs from 'fs';
import aws from 'aws-sdk';
import _ from 'lodash';

import {
  awsRegion,
  dynamoEndpoint,
  dynamoMigrationsTablename,
  dynamoMigrationsFolder,
} from './Config';
import Log from './Log';

aws.config.update({
  region: awsRegion,
  endpoint: dynamoEndpoint,
});

export default class MigrationEngine {
  constructor() {
    this.db = new aws.DynamoDB();
  }

  static abort(message) {
    Log.error('  %s', message);
    process.exit(1);
  }

  static loadMigrations(lastMigration) {
    const last = (lastMigration && !_.isEmpty(lastMigration.Items)) ?
      parseInt(lastMigration.LastEvaluatedKey.name.S, 10) : 0;

    return fs.readdirSync(dynamoMigrationsFolder)
      .filter(file => file.match(/^\d+.*\.js$/) && parseInt(file, 10) > last)
      .sort()
      .map(file => file.substr(0, file.indexOf('.js')));
  }

  static create(migrationName) {
    const migrations = MigrationEngine.loadMigrations();
    const last = parseInt(migrations[migrations.length - 1], 10) || 0;

    let name = _.padStart(last + 1, 3, '0');

    if (migrationName) name += `-${migrationName.replace(/\s+/g, '-')}`;

    const template = [
      'exports.up = function (next) {',
      '  next();',
      '};',
      '',
      'exports.down = function(next){',
      '  next();',
      '};',
      '',
    ].join('\n');
    const dynamoPath = `${dynamoMigrationsFolder}/${name}.js`;

    fs.writeFileSync(dynamoPath, template);

    Log.info(`${name}: created`);
  }

  list(params) {
    const defaultParams = {
      TableName: process.env.DYNAMO_PREFIX + dynamoMigrationsTablename,
      Select: 'ALL_ATTRIBUTES',
      ScanIndexForward: false,
      KeyConditions: {
        type: {
          ComparisonOperator: 'EQ',
          AttributeValueList: [{ S: 'migration' }],
        },
      },
    };

    this.db.query(_.merge(defaultParams, params), (err, data) => {
      if (err) {
        if (err.code === 'ResourceNotFoundException') MigrationEngine.abort('The list is empty');

        MigrationEngine.abort(err);
      }

      data.Items.forEach(element => Log.info(`${element.runAt.S}: ${element.name.S}`));
    });
  }

  async up(migrationName, createMigrationTable) {
    if (createMigrationTable) {
      try {
        await this.createMigrationsTable();
      } catch (error) {
        MigrationEngine.abort(`Can't create migration table: ${error}`);
      }
    }

    let migrations = null;

    if (migrationName) {
      migrations = [migrationName];
    } else {
      const last = await this.getLastRemoteMigration();

      migrations = MigrationEngine.loadMigrations(last);
    }

    try {
      for (let i = 0; i < migrations.length; i += 1) {
        this.upOne(migrations[i]).then();
      }
    } catch (err) {
      MigrationEngine.abort(`${migrationName}: ${err}`);
    }
  }

  async upOne(migrationName) {
    return new Promise(async (resolve, reject) => {
      try {
        const exist = await this.findRemoteMigration(migrationName);

        if (!_.isEmpty(exist)) return reject(new Error('Already ran'));

        await this.run(migrationName, 'up');
        await this.logMigration(migrationName, 'up');

        Log.info(`${migrationName}: up done`);

        return resolve();
      } catch (err) {
        return reject(err);
      }
    });
  }

  async down(migrationName) {
    if (!migrationName) MigrationEngine.abort('You must provide a migration');

    try {
      const exist = await this.findRemoteMigration(migrationName);

      if (_.isEmpty(exist)) throw new Error('Not been run already');

      await this.run(migrationName, 'down');
      await this.logMigration(migrationName, 'down');
    } catch (err) {
      MigrationEngine.abort(`${migrationName}: ${err}`);
    }

    Log.info(`${migrationName}: down done`);
  }

  run(migrationName, direction) {
    return new Promise((resolve, reject) => {
      const migrationFile = path.resolve(`${dynamoMigrationsFolder}/${migrationName}`);

      try {
        // eslint-disable-next-line global-require, import/no-dynamic-require
        const action = require(migrationFile)[direction];

        const callback = (err) => {
          if (err) return reject(err);

          return resolve();
        };

        action.apply(this, [callback]);
      } catch (err) {
        reject(err);
      }
    });
  }

  findRemoteMigration(migrationName) {
    return new Promise((resolve, reject) => {
      const params = {
        TableName: process.env.DYNAMO_PREFIX + dynamoMigrationsTablename,
        Key: {
          type: { S: 'migration' },
          name: { S: migrationName },
        },
      };

      this.db.getItem(params, (err, data) => {
        if (err) {
          const message = `Error while looking if this migration has already been run: ${err}`;

          return reject(new Error(message));
        }

        return resolve(data);
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
            AttributeValueList: [{ S: 'migration' }],
          },
        },
        ScanIndexForward: false,
        Limit: 1,
      };

      this.db.query(params, (err, data) => {
        if (err) return reject(new Error(`Error while fetching the last migration: ${err}`));

        return resolve(data);
      });
    });
  }

  logMigration(migrationName, direction) {
    try {
      return new Promise((resolve, reject) => {
        if (direction === 'up') {
          const params = {
            TableName: process.env.DYNAMO_PREFIX + dynamoMigrationsTablename,
            Item: {
              type: { S: 'migration' },
              name: { S: migrationName },
              runAt: { S: (new Date()).toUTCString() },
            },
          };

          this.db.putItem(params, (err) => {
            if (err) return reject();

            return resolve();
          });
        } else if (direction === 'down') {
          const params = {
            TableName: process.env.DYNAMO_PREFIX + dynamoMigrationsTablename,
            Key: {
              type: { S: 'migration' },
              name: { S: migrationName },
            },
          };

          this.db.deleteItem(params, (err) => {
            if (err) return reject();

            return resolve();
          });
        }
      });
    } catch (err) {
      throw new Error(`Careful, migration couldn't be logged: ${err}`);
    }
  }

  createMigrationsTable() {
    return new Promise((resolve, reject) => {
      const config = { TableName: process.env.DYNAMO_PREFIX + dynamoMigrationsTablename };

      this.db.describeTable(config, (error) => {
        if (error && error.code === 'ResourceNotFoundException') {
          const params = {
            TableName: process.env.DYNAMO_PREFIX + dynamoMigrationsTablename,
            AttributeDefinitions: [{
              AttributeName: 'type',
              AttributeType: 'S',
            },
            {
              AttributeName: 'name',
              AttributeType: 'S',
            }],
            KeySchema: [{
              AttributeName: 'type',
              KeyType: 'HASH',
            },
            {
              AttributeName: 'name',
              KeyType: 'RANGE',
            }],
            ProvisionedThroughput: {
              ReadCapacityUnits: 1,
              WriteCapacityUnits: 1,
            },
          };

          this.db.createTable(params, (err) => {
            if (err) {
              Log.error(err);

              reject(err);
            }

            setTimeout(() => {
              this.db.describeTable(config, (descriveTableError, data) => {
                if (data.Table.TableStatus === 'ACTIVE') {
                  resolve('Table migrations created');
                }
              });
            }, 1000);
          });
        } else if (error) {
          reject(error);
        } else {
          resolve('Table migrations already exists');
        }
      });
    });
  }
}
