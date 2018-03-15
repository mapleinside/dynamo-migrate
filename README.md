# dynamo-migrate

Migration tool for AWS DynamoDB

## Installation

> npm install dynamo-migrate

## Configuration 

You need to setup some env var

- DYNAMO_PREFIX=env_project_ (prefix for your table)
- AWS_ACCESS_KEY_ID=AKXXXXXXXXXXXXXXXXX
- AWS_SECRET_ACCESS_KEY=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

You can override those env var

- DYNAMO_MIGRATIONS_TABLENAME=migrations (name of the table which will save the migrations ran)
- DYNAMO_MIGRATIONS_FOLDER=migrations (local folder where migration files are stored)
- DYNAMO_ENDPOINT=https://dynamodb.us-west-2.amazonaws.com - http://localhost:8000 ([List](http://docs.aws.amazon.com/general/latest/gr/rande.html#ddb_region))
- AWS_REGION=us-west-2


It it strongly suggested to add a npm task in your project 

>  "scripts": {
    "migration": "./node_modules/dynamo-migrate/bin/migrate"
  }

If you want to use ES6 syntax for migrations

>  "scripts": {
    "migration": "babel-node ./node_modules/dynamo-migrate/bin/migrate"
  }



## Commands

### Create

> npm run migration -- create "create country table"

Create a new incremental migration 001-create-country-table.js

### Up

> npm run migration -- up

Migrate up all new migrations since the last migration executed


> npm run migration -- up 002-add-country

Migrate up the given migration

### Down

> npm run migration -- down 002-add-country

Migrate dowm the given migration

### List

> npm run migration -- list

List all the migrations on the remote server and when they have been run

## Require external modules 

If you want to use external modules, you can use the --require option, The command below will require babel-register from the main project to be able to use ES6 into your migrations files

> npm run migration -- up -r "babel-register" 002-add-country

 
 
## License

(The MIT License)

Copyright (c) 2016 Maple Inside

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.