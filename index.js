import MigrationEngine from './lib/MigrationEngine';
import Log from './lib/Log';

const migration = new MigrationEngine();
const options = { args: [] };
const args = process.argv.slice(2);
const usage = [
  '',
  '  Usage: migrate [options] [command]',
  '',
  '  Options:',
  '',
  '     -r, --require <module>   require the given module',
  '',
  '  Commands:',
  '',
  '     down   [name]    Migrate down the given migration',
  '     up     [name]    Migrate up all new migrations (the default command) or the given ' +
    'one if provided',
  '     create [title]   Create a new migration file with optional [title]',
  '     list             List all the migrations on the remote server and when they have been run',
  '',
].join('\n');

let arg = null;
let command = null;

function required() {
  if (args.length) return args.shift();

  return MigrationEngine.abort(`${arg} requires an argument`);
}

// eslint-disable-next-line no-cond-assign
while (arg = args.shift()) {
  switch (arg) {
    case '-h':
    case '--help':
    case 'help':
      Log.info(usage);
      process.exit();
      break;
    case '-r':
    case '--require':
      // eslint-disable-next-line global-require, import/no-dynamic-require
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
  up(migrationName) {
    migration.up(migrationName, true);
  },
  down(migrationName) {
    migration.down(migrationName);
  },
  create(migrationName) {
    MigrationEngine.create(migrationName);
  },
  list() {
    migration.list();
  },
};

command = options.command || 'up';

if (!(command in commands)) MigrationEngine.abort(`Unknown command \`${command}\``);

command = commands[command];

command.apply(this, options.args);
