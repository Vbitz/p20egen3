import {Bag, makeUUID} from './common';
import {ActionService, ClientValue, Service, ServiceRequest, ServiceResponse, ServiceResponseData} from './Service';

interface InterpreterServiceRequest {}

interface InterpreterServiceResponse {}

/**
 * The interpreter is designed to use a flowchart for nodes but the runtime
 * representation is closely related to an abstract syntax tree.
 */

/*
 * # Node List
 * - OnLoad
 * - ServerLog
 * - ShutdownServer
 */

export type NodeID = string;

export interface BaseNode { id: NodeID; }

export interface Edge extends BaseNode {
  type: 'Edge';
  nextId: NodeID;
}

export interface StringLiteral {
  type: 'Literal';
  value: string;
}

export interface NumberLiteral {
  type: 'Literal';
  value: number;
}

export interface BooleanLiteral {
  type: 'Literal';
  value: boolean;
}

export type Literal = StringLiteral|NumberLiteral|BooleanLiteral;

export interface NodeOnLoad extends BaseNode {
  type: 'OnLoad';
  next: Edge[];
}

export interface NodeServerLog extends BaseNode {
  type: 'ServerLog';
  message: Edge|StringLiteral;
  next: Edge[];
}

export interface NodeShutdownServer extends BaseNode { type: 'ShutdownServer'; }

export type ExportNode = NodeOnLoad|NodeServerLog|NodeShutdownServer;

export type Node = ExportNode|Edge|Literal;

export interface NodeDescription { nodes: ExportNode[]; }

export type ThreadID = string;

interface Thread {
  nextNode: NodeID;
  // tslint:disable-next-line:no-any
  localStorage: Map<symbol, any>;
}

export class NodeInterpreter {
  private nodeGraph: Map<NodeID, Node> = new Map();
  private threads: Map<ThreadID, Thread> = new Map();

  loadTree(graph: NodeDescription) {
    graph.nodes.forEach((node) => {
      this.nodeGraph.set(node.id, node);
    });

    const loadNodes = graph.nodes.filter((node) => node.type === 'OnLoad');

    loadNodes.forEach((node) => {
      this.createThread(node.id);
    });
  }

  next(): boolean {
    this.threads.forEach((value, key) => {
      const keep = this.stepThread(value);
      if (!keep) {
        this.threads.delete(key);
      }
    });

    return this.threads.size > 0;
  }

  private createThread(start: NodeID): ThreadID {
    const newId = makeUUID();

    this.threads.set(newId, {
      nextNode: start,
      localStorage: new Map(),
    });

    return newId;
  }

  private getNode(id: NodeID): Node {
    const node = this.nodeGraph.get(id);
    if (node === undefined) {
      throw new Error(`Attempt to get undefined node: ${id}`);
    }
    return node;
  }

  /**
   * Kill all threads instantly.
   */
  private shutdownServer() {
    this.threads.clear();
    // TODO(jscarsbrook): Look for OnShutdown nodes and execute all of them
    // first. If shutdownServer is called again then clear all those threads as
    // well.
  }

  private stepThread(thread: Thread): boolean {
    const nextNode = this.getNode(thread.nextNode);
    if (nextNode.type === 'OnLoad') {
      nextNode.next.forEach((next) => {
        this.createThread(next.nextId);
      });
      return false;
    } else if (nextNode.type === 'Edge') {
      throw new Error('Attempt to evaluate Edge');
    } else if (nextNode.type === 'Literal') {
      throw new Error('Attempt to evaluate Literal');
    } else if (nextNode.type === 'ServerLog') {
      console.log(
          `Log from thread: ${this.getValue(thread, nextNode.message)}`);
      nextNode.next.forEach((next) => {
        this.createThread(next.nextId);
      });
      return false;
    } else if (nextNode.type === 'ShutdownServer') {
      this.shutdownServer();
      return false;
    } else {
      throw new Error(`Node not implemented: ${(nextNode as Node).type}`);
    }
  }

  private getValue(thread: Thread, node: Node): string|number|boolean {
    if (node.type === 'Literal') {
      return node.value;
    } else {
      throw new Error(`getValue not implemented for: ${node.type}`);
    }
  }
}

export class NodeInterpreterService extends NodeInterpreter implements
    ActionService {
  UUID = 'p20egen3.NodeInterpreterService';

  // tslint:disable-next-line:no-any
  async handleEvent(service: Service, params: ClientValue<any>):
      Promise<ServiceResponse<ServiceResponseData>> {
    return {actions: [], data: {}, success: true};
  }
}

async function main(args: string[]): Promise<number> {
  const interpreter: NodeInterpreter = new NodeInterpreter();

  interpreter.loadTree({
    nodes: [
      {
        id: '1',
        type: 'OnLoad',
        next: [{id: 'edge1', type: 'Edge', nextId: '2'}]
      },
      {
        id: '2',
        type: 'ServerLog',
        message: {id: 'lit2', type: 'Literal', value: 'Hello, World'},
        next: []
      }
    ]
  });

  while (interpreter.next()) {
  }

  return 0;
}

if (process.mainModule === module) {
  main(process.argv).then((ret) => {
    process.exitCode = ret;
  });
}