export const awsRegion = process.env.AWS_REGION || 'us-west-2';
export const dynamoEndpoint = process.env.DYNAMO_ENDPOINT ||
  'https://dynamodb.us-west-2.amazonaws.com';
export const dynamoMigrationsTablename = process.env.DYNAMO_MIGRATIONS_TABLENAME || 'migrations';
export const dynamoMigrationsFolder = process.env.DYNAMO_MIGRATIONS_FOLDER || 'migrations';
