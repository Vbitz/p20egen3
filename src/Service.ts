// tslint:disable:no-any

import * as crypto from 'crypto';

import {Bag} from './common';
import {Datastore} from './Datastore';

const TOKEN_NS = 'TKN';
const ACTION_NS = 'ACT';

/**
 * Create a random UUID.
 */
function makeUUID() {
  const randomId = crypto.randomBytes(8).toString('hex');
  return randomId;
}

export type SessionID = string;

export type ActionID = string;

export type ActionTarget = InternalServiceAction;

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

export type ActionCallback = (resp: ServiceResponse<ServiceResponseData>) =>
    void;

export interface ActionService {
  handleEvent(service: Service, params: ClientValue<any>, cb: ActionCallback):
      void;
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
export class Service {
  // TODO(jscarsbrook): Add Storage+Session

  // TODO(jscarsbrook): Move all of this into a persistent data store.
  private datastore: Datastore;

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

  createServiceAction(
      action: InternalServiceAction, persist?: boolean,
      insecure?: boolean): ServiceAction {
    return {
      actionID: this.registerActionWithType(action, null, persist, insecure)
    };
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
      ServiceResponse<Data> {
    return this.handleAction(request);
  }

  request<Data extends ServiceResponseData, Params>(
      actionID: ActionID, actionParams: Params,
      sessionID?: SessionID): ServiceResponse<Data> {
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

  handleAction<Data extends ServiceResponseData>(request: ServiceRequest):
      ServiceResponse<Data> {
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
        actions.push(
            this.createServiceAction(InternalServiceAction.Pong, false, false));
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
    } else {
      return this.createError('Action not Implemented') as
          ServiceResponse<Data>;
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
