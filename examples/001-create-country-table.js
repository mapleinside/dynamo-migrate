'use strict';

var AWS = require('aws-sdk');

AWS.config.update({
    region: process.env.AWS_REGION,
    endpoint: process.env.DYNAMO_ENDPOINT
});

exports.up = function (next) {
    const dynamodb = new AWS.DynamoDB();

    const params = {
        TableName: process.env.DYNAMO_PREFIX + 'country',
        AttributeDefinitions: [
            {AttributeName: 'code', AttributeType: 'S'}
        ],
        KeySchema: [
            {AttributeName: 'code', KeyType: 'HASH'}
        ],
        ProvisionedThroughput: {ReadCapacityUnits: 1, WriteCapacityUnits: 1}
    };

    dynamodb.createTable(params, function (err) {
        next(err);
    });
};

exports.down = function (next) {
    const dynamodb = new AWS.DynamoDB();

    const params = {
        TableName: process.env.DYNAMO_PREFIX + 'country'
    };

    dynamodb.deleteTable(params, function (err) {
        next(err);
    });
};
