import 'jest';

import {ActionID, Service, ServiceErrorData, ServicePingData, SessionCreateData} from './Service';

it('should initialize correctly', () => {
  const service = new Service();

  const response = service.request(service.getPingAction(), null, undefined);

  expect(response.success).toBeTruthy();
});

it('should return an error if the action is not specified', () => {
  const service = new Service();

  // tslint:disable-next-line:no-any
  const response = service.post({} as any);

  expect(response.success).toBeFalsy();

  expect((response.data as ServiceErrorData).message).toEqual('Bad Request');
});

it('should return an error if the action is invalid', () => {
  const service = new Service();

  const response = service.request('hello', null, undefined);

  expect(response.success).toBeFalsy();

  expect((response.data as ServiceErrorData).message).toEqual('Bad Request');
});

it('should successfully create a session', () => {
  const service = new Service();

  // Create a new Session
  const createResponse =
      service.request(service.getCreateSessionAction(), null, undefined);

  expect(createResponse.success).toBeTruthy();

  const sessionID = (createResponse.data as SessionCreateData).sessionID;

  expect(sessionID).not.toBeUndefined();

  // Ping the service and make sure the session was created.
  const pingResponse =
      service.request(service.getPingAction(), null, sessionID);

  expect(pingResponse.success).toBeTruthy();

  // Make sure this request had it's session id validated
  expect((pingResponse.data as ServicePingData).validLogin).toBeTruthy();

  // Pong the server with the action provided
  expect(pingResponse.actions).toHaveLength(1);

  const pongResponse =
      service.request(pingResponse.actions[0].actionID, null, sessionID);

  expect(pongResponse.success).toBeTruthy();
});

it('should not validate invalid tokens', () => {
  const service = new Service();

  // Ping the service and make sure the session was created.
  const pingResponse =
      service.request(service.getPingAction(), null, 'badsession');

  expect(pingResponse.success).toBeTruthy();

  // Make sure this request had it's session id validated
  expect((pingResponse.data as ServicePingData).validLogin).toBeFalsy();
});

it('Should deny pong responses from bad sessions', () => {
  const service = new Service();

  // Create a new Session
  const createResponse =
      service.request(service.getCreateSessionAction(), null, undefined);

  expect(createResponse.success).toBeTruthy();

  const sessionID = (createResponse.data as SessionCreateData).sessionID;

  expect(sessionID).not.toBeUndefined();

  // Ping the service and make sure the session was created.
  const pingResponse =
      service.request(service.getPingAction(), null, sessionID);

  expect(pingResponse.success).toBeTruthy();

  // Make sure this request had it's session id validated
  expect((pingResponse.data as ServicePingData).validLogin).toBeTruthy();

  // Pong the server with the action provided
  expect(pingResponse.actions).toHaveLength(1);
});