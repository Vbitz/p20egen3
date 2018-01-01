import { ActionService, Service, ServiceRequest, ActionCallback, ClientValue } from "./Service";

interface InterpreterServiceRequest {

}

interface InterpreterServiceResponse {

}

export class NodeInterpreter {

}

export class NodeInterpreterService extends NodeInterpreter implements ActionService {
    handleEvent(service: Service, params: ClientValue<any>, cb: ActionCallback): void {
        const requestParams = service.unboxClient(params) as InterpreterServiceRequest;
    }
}
