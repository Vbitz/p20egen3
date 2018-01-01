import * as readline from 'readline';
import * as util from 'util';

import {InternalServiceAction, Service, SessionCreateData} from './Service';

async function main(args: string[]): Promise<never> {
  // Simulate access to back end service with an instance of Service.
  const service = new Service();

  const sessionRequest = service.post({
    actionID: service.getCreateSessionAction(),
    actionParams: null,
    sessionID: undefined,
  });

  if (!sessionRequest.success) {
    throw new Error('Could not create session');
  }

  const rlInstance = readline.createInterface(process.stdin, process.stdout);

  const sessionID = (sessionRequest.data as SessionCreateData).sessionID;

  console.log('Created Session with ID: ' + sessionID);

  const actions = sessionRequest.actions;

  let running = true;

  const question = (question: string) => {
    return new Promise((resolve, reject) => {
             rlInstance.question(question, (answer) => {
               resolve(answer);
             });
           }) as Promise<string>;
  };

  while (running) {
    const answer = await question('> ');
    if (answer === 'exit') {
      running = false;
    } else if (answer === 'ping') {
      const response = service.post(
          {actionID: service.getPingAction(), actionParams: null, sessionID});
      if (response.success) {
        console.log('pong');
      } else {
        console.error('ping failed', response);
      }
    } else {
      console.error('Command not found:', answer);
    }
  }

  process.exit(0);

  throw new Error('Unreachable');
}

if (process.mainModule === module) {
  main(process.argv).then((exit) => {});
}
