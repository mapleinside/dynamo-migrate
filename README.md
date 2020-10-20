# Node Dynamo Migrate

> Node.js migration tools for AWS DynamoDB

> ❌ Sorry, but this library is no longer maintained. Please find an alternative.

## Configuration 

At first, you need to setup the environment variables:

* `DYNAMO_PREFIX`: database table prefix.
* `AWS_ACCESS_KEY_ID`
* `AWS_SECRET_ACCESS_KEY`

Then, you can override those environment variables:

* `DYNAMO_MIGRATIONS_TABLENAME`: the table name which will save done migrations.
* `DYNAMO_MIGRATIONS_FOLDER`: local directory where migration files are stored.
* `DYNAMO_ENDPOINT`
* `AWS_REGION`: your datacenter region.

It's strongly suggested to add the following scripts to your `package.json`: 

```json
"scripts": {
  "migrate": "node-dynamo-migrate"
}
```

## Commands

### Create

```bash
yarn migration -- create "create country table"
```

Create a new incremental migration `001-create-country-table.js`.

### Up

```bash
yarn migration -- up
```

Migrate up all new migrations since the last executed migration.

```bash
yarn migration -- up 002-add-country
```

Migrate up the given migration.

### Down

```bash
yarn migration -- down 002-add-country
```

Migrate dowm the given migration.

### List

```bash
yarn migration -- list
```

List all the migrations on the remote server and when they have been run.

## Require external modules 

If you want to use external modules, you can use the --require option, The command below will require `babel-register` from the main project to be able to use ES6 into your migrations files

```bash
yarn migration -- up -r "babel-register" 002-add-country
```
 
## License

The MIT License (MIT)

Copyright (c) 2018 Nicolas Cava

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
