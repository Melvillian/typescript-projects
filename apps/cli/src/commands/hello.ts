import { Command } from 'commander';

const hello = new Command('hello')
  .description('Hello world command')
  .action(() => {
    console.log('Hello world!');
  });

export default hello;
