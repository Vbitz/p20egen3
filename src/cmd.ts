import * as readline from 'readline';
import * as util from 'util';

import {InternalServiceAction, ServiceImpl as Service, ServicePingData, SessionCreateData} from './Service';

async function main(args: string[]): Promise<never> {
  // Simulate access to back end service with an instance of Service.
  const service = new Service();

  const sessionRequest = await service.request<SessionCreateData, null>(
      service.getCreateSessionAction(), null, undefined);

  if (!sessionRequest.success) {
    throw new Error('Could not create session');
  }

  const rlInstance = readline.createInterface(process.stdin, process.stdout);

  const sessionID = sessionRequest.data.sessionID;

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
      const response = await service.request<ServicePingData, null>(
          service.getPingAction(), null, sessionID);
      if (response.success) {
        console.log(
            '#ping',
            response.data.validLogin ? 'valid login' : 'invalid login');
        const pongResponse = await service.request<ServicePingData, null>(
            response.actions[0].actionID, null, sessionID);
        if (pongResponse.success) {
          console.log(
              '#pong',
              pongResponse.data.validLogin ? 'valid login' : 'invalid login');
        } else {
          console.error('pong failed', response);
        }
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
