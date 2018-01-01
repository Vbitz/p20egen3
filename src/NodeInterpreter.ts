import {ActionService, ClientValue, Service, ServiceRequest, ServiceResponse, ServiceResponseData} from './Service';

interface InterpreterServiceRequest {}

interface InterpreterServiceResponse {}

export class NodeInterpreter {}

export class NodeInterpreterService extends NodeInterpreter implements
    ActionService {
  UUID = 'p20egen3.NodeInterpreterService';

  // tslint:disable-next-line:no-any
  async handleEvent(service: Service, params: ClientValue<any>):
      Promise<ServiceResponse<ServiceResponseData>> {
    return {actions: [], data: {}, success: true};
  }
}
