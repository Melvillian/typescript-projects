import fs from 'fs';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

import { Command } from 'commander';

interface PackageJson {
  name?: string;
  version?: string;
}

const require = createRequire(import.meta.url);
const packageInfo = require('../package.json') as PackageJson;
const distDir = path.dirname(fileURLToPath(import.meta.url));

export const main = async () => {
  const commandsDir = path.join(distDir, 'commands');

  const { name, version } = packageInfo;
  if (!name || !version) {
    throw new Error('Package info is not valid, name and version required');
  }

  const program = new Command();

  program.name(name).version(version).showHelpAfterError(true);

  // Dynamically import and register commands
  const commandFiles = fs
    .readdirSync(commandsDir)
    .filter((file) => file.endsWith('.js') && !file.endsWith('.d.ts'));

  const commandModules = await Promise.all(
    commandFiles.map((file) => import(path.join(commandsDir, file))), // eslint-disable-line import/no-dynamic-import
  );

  for (const commandModule of commandModules) {
    if (commandModule.default) {
      program.addCommand(commandModule.default);
    }
  }

  return program.parseAsync(process.argv);
};
