import 'jest';

import {ActionService, ClientValue, Service, ServiceResponse, ServiceResponseData} from './Service';

class TestService implements ActionService {
  UUID = 'p20egen3.TestService';

  // tslint:disable-next-line:no-any
  async handleEvent(service: Service, params: ClientValue<any>):
      Promise<ServiceResponse<ServiceResponseData>> {
    return {success: true, actions: [], data: {}} as
        ServiceResponse<ServiceResponseData>;
  }
}

it('should register TestService', async () => {
  const service = new Service();
  const testServiceId = service.registerActionService(new TestService());
});

it('should prevent services from being registered twice', async () => {
  const service = new Service();
  const testServiceId = service.registerActionService(new TestService());
  expect(() => {
    service.registerActionService(new TestService());
  }).toThrow();
});

it('should allow sending messages to a ActionService', async () => {
  const service = new Service();
  const testServiceId = service.registerActionService(new TestService());
  const action = service.createServiceAction(testServiceId, null, false, true);
  const response = await service.request(action.actionID, null, undefined);
  expect(response.success).toBeTruthy();
});