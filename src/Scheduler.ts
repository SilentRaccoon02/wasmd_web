import { type ConnectionState, type ModuleState } from './Interfaces'

interface State {
    connectionState: ConnectionState
    moduleState: ModuleState
}

export class Scheduler {
    private readonly _nodes = new Map<string, State>()

    public addNode (uuid: string): void {
        this._nodes.set(uuid, {
            connectionState: { signaling: undefined, connection: undefined },
            moduleState: { queued: 0, complete: 0, benchmark: 0 }
        })
    }

    public removeNode (uuid: string): void {
        this._nodes.delete(uuid)
    }

    public updateConnectionState (uuid: string, state: ConnectionState): void {
        const node = this._nodes.get(uuid)
        if (node !== undefined) { node.connectionState = state }
    }

    public updateModuleState (uuid: string, state: ModuleState): void {
        const node = this._nodes.get(uuid)
        if (node !== undefined) { node.moduleState = state }
    }

    public schedule (uuid: string, filesCount: number): Map<string, number> {
        let nodesCount = 0

        for (const node of this._nodes.values()) {
            if (node.connectionState.connection === 'connected') {
                nodesCount++
            }
        }

        const quotient = Math.round(filesCount / nodesCount)
        const remainder = filesCount % nodesCount
        const plan = new Map<string, number>()

        for (const node of this._nodes.entries()) {
            if (node[0] === uuid) {
                plan.set(node[0], quotient + remainder)
            } else {
                plan.set(node[0], quotient)
            }
        }

        return plan
    }
}
