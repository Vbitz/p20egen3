// tslint:disable:no-any

import {Bag, makeUUID} from './common';
import {Datastore} from './Datastore';

const TOKEN_NS = 'TKN';
const ACTION_NS = 'ACT';
const ACTIONSERVICE_NS = 'SVC';

export type SessionID = string;

export type ActionID = string;

export type ActionTarget = InternalServiceAction|ActionServiceId;

export interface ServiceRequest {
  sessionID: SessionID|undefined;
  actionID: ActionID;
  actionParams: any;
}

export interface ServiceAction { actionID: ActionID; }

export interface ServiceResponse<Data extends ServiceResponseData> {
  success: boolean;
  actions: ServiceAction[];
  data: Data;
}

export interface ServiceResponseData { message?: string; }

export interface ServiceErrorData extends ServiceResponseData {
  message: string;
}

export interface SessionCreateData extends ServiceResponseData {
  sessionID: SessionID;
}

export interface ServicePingData extends ServiceResponseData {
  validLogin: boolean;
}

export enum InternalServiceAction {
  CreateSession = 'SVC:0',
  Ping = 'SVC:1',
  Pong = 'SVC:2'
}

export interface ClientValue<T> {
  magic: 'CLIENT';
  value: T;
}

export interface ActionInfo {
  persist: boolean;
  shouldValidate: boolean;
  target: ActionTarget;
  params: any;
}

export interface ActionService {
  handleEvent(service: Service, params: ClientValue<any>):
      Promise<ServiceResponse<ServiceResponseData>>;

  UUID: ActionServiceId;
}

export type ActionServiceId = string;

function error(): never {
  throw new Error('Not Implemented');
}

export interface Service {
  getCreateSessionAction(): ActionID;

  getPingAction(): ActionID;

  post<Data extends ServiceResponseData>(request: ServiceRequest):
      Promise<ServiceResponse<Data>>;
}

/**
 * Base class representing a running service. Provides a set of RPC endpoints
 * and methods for allocating RPC calls to users.
 *
 * The main difference with this system is it facilitates highly stateful RPC
 * calls by allocating RPCs to users. Rather then discovering the complete list
 * of methods the server provides the client with a list of RPC methods they can
 * call at a given time which can then then be executed by replying to the
 * server.
 */
export class ServiceImpl implements Service {
  private datastore: Datastore;
  private serviceMap: Map<ActionServiceId, ActionService> = new Map();

  private createSessionAction: ActionID;

  private pingAction: ActionID;

  constructor() {
    this.datastore = new Datastore();

    this.createSessionAction = this.registerActionWithType(
        InternalServiceAction.CreateSession, null, true, true);

    this.pingAction = this.registerActionWithType(
        InternalServiceAction.Ping, null, true, true);
  }

  getCreateSessionAction(): ActionID {
    return this.createSessionAction;
  }

  getPingAction(): ActionID {
    return this.pingAction;
  }

  createInternalAction(
      action: InternalServiceAction, persist?: boolean,
      insecure?: boolean): ServiceAction {
    return {
      actionID: this.registerActionWithType(action, null, persist, insecure)
    };
  }

  createServiceAction(
      service: ActionServiceId, params: any, persist?: boolean,
      insecure?: boolean): ServiceAction {
    return {
      actionID: this.registerActionWithType(service, null, persist, insecure)
    };
  }

  registerActionService(service: ActionService): ActionServiceId {
    if (this.serviceMap.has(service.UUID)) {
      throw new Error(`Service: ${service.UUID} is already registered`);
    }
    this.serviceMap.set(service.UUID, service);
    return service.UUID;
  }

  registerActionWithType(
      action: ActionTarget, params: any, persist?: boolean,
      insecure?: boolean): ActionID {
    const newId = makeUUID();

    this.datastore.put(ACTION_NS, newId, {
      persist: persist || false,
      shouldValidate: !(insecure || false),
      target: action,
      params
    });

    return newId;
  }

  post<Data extends ServiceResponseData>(request: ServiceRequest):
      Promise<ServiceResponse<Data>> {
    return this.handleAction(request);
  }

  request<Data extends ServiceResponseData, Params>(
      actionID: ActionID, actionParams: Params,
      sessionID?: SessionID): Promise<ServiceResponse<Data>> {
    return this.handleAction({actionID, actionParams, sessionID});
  }

  createError(msg: string): ServiceResponse<ServiceErrorData> {
    return {
      success: false,
      data: {
        message: msg,
      } as ServiceErrorData,
      actions: []
    };
  }

  async handleAction<Data extends ServiceResponseData>(request: ServiceRequest):
      Promise<ServiceResponse<Data>> {
    if (!request.actionID) {
      return this.createError('Bad Request') as ServiceResponse<Data>;
    }

    const params = this.flagClient(request.actionParams);
    const action =
        this.datastore.get<ActionInfo|null>(ACTION_NS, request.actionID, null);

    if (!action) {
      return this.createError('Bad Request') as ServiceResponse<Data>;
    }

    const validated = this.validateRequest(request, action);

    if (action.shouldValidate && !validated) {
      return this.createError('Unauthorized') as ServiceResponse<Data>;
    }

    // Request is now authorized.

    if (!action.persist) {
      this.datastore.delete(ACTION_NS, request.actionID);
    }

    const internalServiceResponse =
        await this.handleInternalAction<Data>(action, params, validated);

    if (internalServiceResponse) {
      return internalServiceResponse;
    } else if (this.serviceMap.has(action.target)) {
      return (this.serviceMap.get(action.target) || error())
                 .handleEvent(this, params) as Promise<ServiceResponse<any>>;
    } else {
      return this.createError('Action not Implemented') as
          ServiceResponse<Data>;
    }
  }

  async handleInternalAction<Data extends ServiceResponseData>(
      action: ActionInfo, params: ClientValue<any>,
      validated: boolean): Promise<ServiceResponse<Data>|null> {
    if (action.target === InternalServiceAction.CreateSession) {
      const newSessionId = makeUUID();

      this.datastore.put(TOKEN_NS, newSessionId, true);

      return {
        success: true,
        data: {sessionID: newSessionId} as SessionCreateData,
        // TODO(jscarsbrook): Execute service entry point.
        actions: []
      } as ServiceResponse<any>;
    } else if (action.target === InternalServiceAction.Ping) {
      const actions: ServiceAction[] = [];
      if (validated) {
        actions.push(this.createInternalAction(
            InternalServiceAction.Pong, false, false));
      }
      return {
        success: true,
        data: {validLogin: validated} as ServicePingData,
        actions
      } as ServiceResponse<any>;
    } else if (action.target === InternalServiceAction.Pong) {
      return {
        success: true,
        data: {validLogin: validated} as ServicePingData,
        actions: []
      } as ServiceResponse<any>;
    } else if (this.serviceMap.has(action.target)) {
      return (this.serviceMap.get(action.target) || error())
                 .handleEvent(this, params) as Promise<ServiceResponse<any>>;
    } else {
      return null;
    }
  }

  // Security

  // TODO(jscarsbrook): Fix this. Right now the best approach is to unbox the
  // whole object. I might make it impossible to unbox the whole thing.

  flagClient<T>(value: T): ClientValue<T> {
    return {magic: 'CLIENT', value};
  }

  getObjectValue<Obj, Key extends keyof Obj, Value>(
      obj: ClientValue<Obj>, key: Key, def: Obj[Key]): ClientValue<Obj[Key]> {
    const unBoxedValue = this.unboxClient(obj);
    if (!unBoxedValue.hasOwnProperty(key)) {
      return this.flagClient(def);
    } else {
      return this.flagClient(unBoxedValue[key]);
    }
  }

  unboxClient<T>(value: ClientValue<T>): T {
    if (value.magic !== 'CLIENT') {
      throw new Error('Corrupt Client Value');
    }

    return value.value;
  }

  validateRequest(request: ServiceRequest, action: ActionInfo): boolean {
    // Check to make sure the session exists and has an entry in the valid
    // session map.
    return request.sessionID !== undefined &&
        this.datastore.has(TOKEN_NS, request.sessionID);
  }
}
