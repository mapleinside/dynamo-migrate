import MigrationEngine from './migration';

let migration = new MigrationEngine();

let options = {args: []};

const args = process.argv.slice(2);

const usage = [
    ''
    , '  Usage: migrate [options] [command]'
    , ''
    , '  Options:'
    , ''
    , '     -r, --require <module>   require the given module'
    , ''
    , '  Commands:'
    , ''
    , '     down   [name]    Migrate down the given migration'
    , '     up     [name]    Migrate up all new migrations (the default command) or the given one if provided'
    , '     create [title]   Create a new migration file with optional [title]'
    , '     list             List all the migrations on the remote server and when they have been run'
    , ''
].join('\n');

function required() {
    if (args.length) return args.shift();
    MigrationEngine.abort(arg + ' requires an argument');
}

let arg;
while (arg = args.shift()) {
    switch (arg) {

        case '-h':
        case '--help':
        case 'help':
            console.log(usage);
            process.exit();
            break;
        case '-r':
        case '--require':
            require(required());
            break;
        default:
            if (options.command) {
                options.args.push(arg);
            } else {
                options.command = arg;
            }
    }
}

const commands = {
    up: function (migrationName) {
        migration.up(migrationName, true);
    },

    down: function (migrationName) {
        migration.down(migrationName);
    },

    create: function (migrationName) {
        migration.create(migrationName);
    },

    list: function () {
        migration.list();
    }
};

let command = options.command || 'up';
if (!(command in commands)) MigrationEngine.abort(`unknown command "${command}"`);

command = commands[command];
command.apply(this, options.args);


