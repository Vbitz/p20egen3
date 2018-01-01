// tslint:disable:no-any

import * as crypto from 'crypto';

const TOKEN_PREFIX = 'TKN';
const ACTION_PREFIX = 'ACT';

function makeUUID(prefix: string) {
  const randomId = crypto.randomBytes(8).toString('hex');
  return `${prefix}:${randomId}`;
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

export interface ServiceResponse {
  success: boolean;
  actions: ServiceAction[];
  data: ServiceResponseData;
}

export interface ServiceResponseData {}

export interface ServiceErrorData extends ServiceResponseData {
  message: string;
}

export interface SessionCreateData extends ServiceResponseData {
  sessionID: SessionID;
}

export enum InternalServiceAction {
  CreateSession = 'SVC:0'
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

export type ActionCallback = (resp: ServiceResponse) => void;

export interface ActionService {
  handleEvent(service: Service, params: ClientValue<any>, cb: ActionCallback):
      void;
}

export class Service {
  // TODO(jscarsbrook): Add Storage+Session

  private actionMap: Map<ActionID, ActionInfo> = new Map();

  private actionHandlers: Map<ActionID, ActionService> = new Map();

  private createSessionAction: ActionID;

  constructor() {
    this.createSessionAction = this.registerActionWithType(
        InternalServiceAction.CreateSession, true, true);
  }

  getCreateSessionAction(): ActionID {
    return this.createSessionAction;
  }

  createServiceAction(action: InternalServiceAction): ServiceAction {
    return {actionID: this.registerActionWithType(action, null)};
  }

  registerActionWithType(
      action: ActionTarget, params: any, persist?: boolean,
      insecure?: boolean): ActionID {
    const newId = makeUUID(ACTION_PREFIX);

    this.actionMap.set(newId, {
      persist: persist || false,
      shouldValidate: !(insecure || false),
      target: action,
      params
    });

    return newId;
  }

  post(request: ServiceRequest): ServiceResponse {
    return this.handleAction(request);
  }

  createError(msg: string): ServiceResponse {
    return {
      success: false,
      data: {
        message: msg,
      } as ServiceErrorData,
      actions: []
    };
  }

  handleAction(request: ServiceRequest): ServiceResponse {
    const params = this.flagClient(request.actionParams);
    const action = this.actionMap.get(request.actionID);

    if (!action) {
      return this.createError('Bad Request');
    }

    if (action.shouldValidate && !this.validateRequest(request, action)) {
      return this.createError('Unauthorized');
    }

    // Request is now authorized.

    if (!action.persist) {
      this.actionMap.delete(request.actionID);
    }

    if (action.target === InternalServiceAction.CreateSession) {
      return {
        success: true,
        data: {sessionID: makeUUID(TOKEN_PREFIX)} as SessionCreateData,
        // TODO(jscarsbrook): Execute service entry point.
        actions: []
      };
    } else {
      return this.createError('Action not Implemented');
    }
  }

  // Security

  // TODO(jscarsbrook): Fix this. Right now the best approach is to unbox the
  // whole object. I might make it impossible to unbox the whole thing.

  flagClient<T>(value: T): ClientValue<T> {
    return {magic: 'CLIENT', value};
  }

  getObjectValue<Value>(obj: ClientValue<any>, key: string, def: Value):
      ClientValue<Value> {
    const unBoxedValue = this.unboxClient(obj) as any;
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
    return request.sessionID !== undefined;
  }
}
