import JSZip from 'jszip'
import saveAs from 'file-saver'
import { Connections } from './Connections'
import { ModuleAdapter } from './ModuleAdapter'
import { UI } from './UI'
import { type ConnectionState, DataType, type ModuleState, type IAction, type Data } from './Interfaces'
import { v4 as uuidv4 } from 'uuid'

interface Task {
    sourceFile: File
    resultFile: File | undefined
    scheduled: boolean
}

interface State {
    connectionState: ConnectionState
    moduleState: ModuleState
}

export class App {
    private _uuid: string | undefined
    private readonly _ui = new UI()
    private readonly _connections = new Connections()
    private readonly _moduleAdapter = new ModuleAdapter()

    private readonly _actions = new Map<DataType, IAction>()
    private readonly _nodes = new Map<string, State>()
    private readonly _tasks = new Map<string, Task>()
    private readonly _dict = new Map<string, string>()

    public constructor () {
        this._actions.set(DataType.FILE_PROCESS, this.onProcessFile)
        this._actions.set(DataType.FILE_RESULT, this.onResultFile)
        this._actions.set(DataType.MODULE_STATE, this.onModuleState)

        this._connections.onUUID = (uuid) => {
            this._uuid = uuid
            this.addNode(uuid)

            this.updateConnectionState(uuid, {
                signaling: 'stable',
                connection: 'connected',
                speed: 9
            })

            this.updateModuleState(uuid, {
                queued: 0,
                complete: 0,
                benchmark: 0
            })

            this.prepareUI(uuid)
            this.prepareModuleAdapter(uuid)
        }

        this._connections.onOpen = (uuid) => {
            if (this._uuid === undefined) { return }
            const state = this._nodes.get(uuid)?.moduleState
            if (state === undefined) { return }
            this._connections.sendViaP2P(DataType.MODULE_STATE, uuid, state)
        }

        this._connections.onAddLog = (text) => { this._ui.addConnectionLog(text) }
        this._connections.onAddNode = (uuid) => { this.addNode(uuid) }
        this._connections.onRemoveNode = (uuid) => { this.removeNode(uuid) }
        this._connections.onUpdateState = (uuid, state) => { this.updateConnectionState(uuid, state) }
        this._connections.onReceiveViaP2P = (data) => { this._actions.get(data.type)?.(data) }
    }

    private readonly onProcessFile = (data: Data): void => {
        if (data.from === undefined) { return }

        this._dict.set(data.data.fileId, data.from)
        this._moduleAdapter.processFile(data.data.fileId, data.data.sourceFile)
    }

    private readonly onResultFile = (data: Data): void => {
        fetch(data.data.resultFile).then(async res => await res.blob()).then((blob) => {
            const task = this._tasks.get(data.data.fileId)
            if (task === undefined) { return }
            task.resultFile = new File([blob], `${task.sourceFile.name}.jpg`)
        }).catch((reason) => { console.log(reason) })
    }

    private readonly onModuleState = (data: Data): void => {
        if (data.from === undefined) { return }
        this.updateModuleState(data.from, data.data)
    }

    private addNode (uuid: string): void {
        this._nodes.set(uuid, {
            connectionState: { signaling: undefined, connection: undefined, speed: 0 },
            moduleState: { queued: 0, complete: 0, benchmark: 0 }
        })

        this._ui.addNode(uuid)
    }

    private removeNode (uuid: string): void {
        this._nodes.delete(uuid)
        this._ui.removeNode(uuid)
    }

    private updateConnectionState (uuid: string, state: ConnectionState): void {
        const node = this._nodes.get(uuid)
        if (node === undefined) { return }

        const signaling = state.signaling ?? node.connectionState.signaling
        const connection = state.connection ?? node.connectionState.connection
        const speed = state.speed ?? node.connectionState.speed
        node.connectionState = { signaling, connection, speed }

        this._ui.updateConnectionState(uuid, node.connectionState)
    }

    private updateModuleState (uuid: string, state: ModuleState): void {
        const node = this._nodes.get(uuid)
        if (node !== undefined) { node.moduleState = state }

        this._ui.updateModuleState(uuid, state)
    }

    private readonly prepareUI = (uuid: string): void => {
        this._ui.onProcessFiles = (files: FileList): void => {
            for (const file of files) {
                const fileId = uuidv4()
                this._tasks.set(fileId, {
                    sourceFile: file,
                    resultFile: undefined,
                    scheduled: false
                })
            }

            const schedule = (node: [string, State]): boolean => {
                for (const task of this._tasks.entries()) {
                    if (!task[1].scheduled) {
                        if (node[0] === uuid) {
                            this._dict.set(task[0], uuid)
                            this._moduleAdapter.processFile(task[0], task[1].sourceFile)
                            task[1].scheduled = true
                            return true
                        }

                        const URLReader = new FileReader()

                        URLReader.onload = () => {
                            this._connections.sendViaP2P(DataType.FILE_PROCESS, node[0], {
                                fileId: task[0],
                                sourceFile: URLReader.result
                            })
                        }

                        URLReader.readAsDataURL(task[1].sourceFile)
                        task[1].scheduled = true
                        return true
                    }
                }

                return false
            }

            let ready = false

            while (!ready) {
                for (const node of this._nodes) {
                    const value = schedule(node)
                    if (!value) { ready = true }
                }
            }
        }

        this._ui.onDownloadFiles = () => {
            console.log(this._tasks)
            this._ui.addAppLog('ui: downloading files')

            const zip = new JSZip()
            const folder = zip.folder('result')

            for (const task of this._tasks.values()) {
                if (task.resultFile !== undefined) {
                    folder?.file(task.resultFile.name, task.resultFile)
                }
            }

            folder?.generateAsync({ type: 'blob' })
                .then((blob) => { saveAs(blob, 'result') })
                .catch((reason) => { console.log(reason) })
        }
    }

    private readonly prepareModuleAdapter = (uuid: string): void => {
        this._moduleAdapter.onAddLog = (text) => { this._ui.addAppLog(text) }
        this._moduleAdapter.onAddModuleLog = (text) => { this._ui.addModuleLog(text) }

        this._moduleAdapter.onUpdateState = (state) => {
            if (this._uuid === undefined) { return }

            this.updateModuleState(this._uuid, state)
            this._connections.sendViaP2P(DataType.MODULE_STATE, '', state)
        }

        this._moduleAdapter.onFileComplete = (fileId, blob) => {
            const to = this._dict.get(fileId)
            this._dict.delete(fileId)
            if (to === undefined) { return }

            if (to === uuid) {
                const task = this._tasks.get(fileId)
                if (task === undefined) { return }

                task.resultFile = new File([blob], `${task.sourceFile.name}.jpg`)
                return
            }

            const URLReader = new FileReader()

            URLReader.onload = () => {
                this._connections.sendViaP2P(DataType.FILE_RESULT, to, {
                    fileId,
                    resultFile: URLReader.result
                })
            }

            URLReader.readAsDataURL(blob)
        }
    }
}
