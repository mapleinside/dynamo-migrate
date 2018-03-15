// this migration is using ES6 so you must use the -r "babel-register" to require babel from your main project

import AWS from 'aws-sdk';

AWS.config.update({
    region: process.env.AWS_REGION,
    endpoint: process.env.DYNAMO_ENDPOINT
});

export function up(next) {
    const docClient = new AWS.DynamoDB.DocumentClient();

    const params = {
        TableName: process.env.DYNAMO_PREFIX + 'country',
        Item: {
            code: 'CA',
            name: 'Canada',
            regions: ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', "NU", 'ON', 'PE', 'QC', 'SK', 'YT']
        }
    };

    docClient.put(params, function (err, data) {
        next(err);
    });
}

export function down(next) {
    const docClient = new AWS.DynamoDB.DocumentClient();

    const params = {
        TableName: process.env.DYNAMO_PREFIX + 'country',
        Key: {
            code: 'CA'
        }
    };

    docClient.delete(params, function (err, data) {
        next(err);
    });
}
