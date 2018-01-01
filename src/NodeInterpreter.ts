import {ActionCallback, ActionService, ClientValue, Service, ServiceRequest} from './Service';

interface InterpreterServiceRequest {}

interface InterpreterServiceResponse {}

export class NodeInterpreter {}

export class NodeInterpreterService extends NodeInterpreter implements
    ActionService {
  handleEvent(service: Service, params: ClientValue<{}>, cb: ActionCallback):
      void {
    const requestParams =
        service.unboxClient(params) as InterpreterServiceRequest;
  }
}
