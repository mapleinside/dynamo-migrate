export default {
    awsRegion: process.env.AWS_REGION || 'us-west-2',
    dynamoEndpoint: process.env.DYNAMO_ENDPOINT || 'https://dynamodb.us-west-2.amazonaws.com',
    dynamoMigrationsTablename: process.env.DYNAMO_MIGRATIONS_TABLENAME || 'migrations',
    dynamoMigrationsFolder: process.env.DYNAMO_MIGRATIONS_FOLDER || 'migrations'
};