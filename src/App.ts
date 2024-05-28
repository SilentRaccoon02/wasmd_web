import JSZip from 'jszip'
import saveAs from 'file-saver'
import { Connections } from './Connections'
import { ModuleAdapter } from './ModuleAdapter'
// import { OpenCVAdapter } from './OpenCVAdapter'
import { UI } from './UI'
import { type ConnectionState, type ModuleState, DataType, type Data, type IAction } from './Interfaces'
import { v4 as uuidv4 } from 'uuid'

interface Task {
    sourceFile: File
    resultFile: File | undefined
    node: string | undefined
}

interface State {
    connectionState: ConnectionState
    moduleState: ModuleState
}

export class App {
    private static readonly thresh = 2
    private static readonly speedFactor = 0.8
    private static readonly benchmarkFactor = 0.2

    private _uuid: string | undefined
    private readonly _ui = new UI()
    private readonly _connections = new Connections()
    private readonly _moduleAdapter = new ModuleAdapter()

    private readonly _actions = new Map<DataType, IAction>()
    private readonly _nodes = new Map<string, State>()
    private readonly _tasks = new Map<string, Task>()
    private readonly _dict = new Map<string, string>()

    private _time = 0
    private _schedule = false

    public constructor () {
        this._actions.set(DataType.FILE_PROCESS, this.onProcessFile)
        this._actions.set(DataType.FILE_RESULT, this.onResultFile)
        this._actions.set(DataType.MODULE_STATE, this.onModuleState)

        this._connections.onUUID = (uuid) => {
            this._uuid = uuid
            this.addNode(uuid)

            this.updateConnectionState(uuid, {
                signaling: undefined,
                connection: undefined,
                speed: 10
            })

            this.updateModuleState(uuid, {
                queued: 0,
                complete: 0,
                benchmark: 0
            })

            this.prepareUI()
            this.prepareModuleAdapter()
        }

        this._connections.onOpen = (uuid) => {
            if (this._uuid === undefined) { return }
            const state = this._nodes.get(this._uuid)?.moduleState
            if (state === undefined) { return }
            this._connections.send(DataType.MODULE_STATE, uuid, state)
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
            if (this._schedule) { this.processFiles() }
        }).catch((reason) => { console.log(reason) })
    }

    private readonly onModuleState = (data: Data): void => {
        if (data.from === undefined) { return }
        this.updateModuleState(data.from, data.data)
    }

    private addNode (uuid: string): void {
        this._nodes.set(uuid, {
            connectionState: { signaling: undefined, connection: undefined, speed: 10 },
            moduleState: { queued: 0, complete: 0, benchmark: 0 }
        })

        this._ui.addNode(uuid)
        this.updateConnectionState(uuid, {
            signaling: undefined,
            connection: undefined,
            speed: 10
        })
    }

    private removeNode (uuid: string): void {
        this._nodes.delete(uuid)
        this._ui.removeNode(uuid)

        for (const task of this._tasks.values()) {
            if (task.node === uuid) { task.node = undefined }
        }
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

        if (state.benchmark === 0) {
            for (const task of this._tasks.values()) {
                if (task.node === uuid) { task.node = undefined }
            }
        }

        if (this._schedule) { this.processFiles() }
        this._ui.updateModuleState(uuid, state)
    }

    private prepareUI (): void {
        this._ui.onProcessFiles = (files: FileList): void => {
            for (const file of files) {
                const fileId = uuidv4()
                this._tasks.set(fileId, {
                    sourceFile: file,
                    resultFile: undefined,
                    node: undefined
                })
            }

            this._time = performance.now()
            this._schedule = true
            this.processFiles()
        }

        this._ui.onDownloadFiles = () => {
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

    private prepareModuleAdapter (): void {
        this._moduleAdapter.onAddLog = (text) => { this._ui.addAppLog(text) }
        this._moduleAdapter.onAddModuleLog = (text) => { this._ui.addModuleLog(text) }

        this._moduleAdapter.onUpdateState = (state) => {
            if (this._uuid === undefined) { return }

            this.updateModuleState(this._uuid, state)
            this._connections.send(DataType.MODULE_STATE, '', state)
        }

        this._moduleAdapter.onFileComplete = (fileId, blob) => {
            const to = this._dict.get(fileId)
            this._dict.delete(fileId)
            if (to === undefined) { return }

            if (to === this._uuid) {
                const task = this._tasks.get(fileId)
                if (task === undefined) { return }

                task.resultFile = new File([blob], `${task.sourceFile.name}.jpg`)
                return
            }

            const URLReader = new FileReader()

            URLReader.onload = () => {
                this._connections.send(DataType.FILE_RESULT, to, {
                    fileId,
                    resultFile: URLReader.result
                })
            }

            URLReader.readAsDataURL(blob)
        }
    }

    private readonly processFiles = (): void => {
        const unscheduled = this.findUnscheduledTask()

        if (unscheduled === undefined) {
            if (this.checkComplete()) {
                this._schedule = false
                const time = (performance.now() - this._time) / 1000
                this._ui.addAppLog(`work complete in ${time.toFixed(2)} seconds`)
                this._ui.clearSchedulerState()
            }

            return
        }

        const uuid = this.selectNode()
        if (uuid !== undefined) { this.scheduleTask(uuid, unscheduled) }
    }

    private findUnscheduledTask (): [string, Task] | undefined {
        for (const task of this._tasks.entries()) {
            if (task[1].resultFile === undefined && task[1].node === undefined) {
                return task
            }
        }

        return undefined
    }

    private checkComplete (): boolean {
        for (const task of this._tasks.values()) {
            if (task.resultFile === undefined) {
                return false
            }
        }

        return true
    }

    private selectNode (): string | undefined {
        let totalCount = 0
        let totalSpeed = 0
        let totalBenchmark = 0

        for (const node of this._nodes.entries()) {
            if (node[1].moduleState.benchmark > 0) {
                totalCount++
                totalSpeed += node[1].connectionState.speed ?? 10
                totalBenchmark += node[1].moduleState.benchmark
            }
        }

        let minNode
        let minDelta = Number.MAX_SAFE_INTEGER
        const avgSpeed = totalSpeed === 0 ? 0 : totalSpeed / totalCount
        const avgBenchmark = totalBenchmark === 0 ? 0 : totalBenchmark / totalCount

        for (const node of this._nodes.entries()) {
            const speed = node[1].connectionState.speed ?? 10
            const benchmark = node[1].moduleState.benchmark
            if (benchmark === 0) { continue }

            const queued = node[1].moduleState.queued
            const complete = node[1].moduleState.complete
            const delta = queued - complete

            const speedDeviation = (speed - avgSpeed) / avgSpeed
            const benchmarkDeviation = (benchmark - avgBenchmark) / avgBenchmark
            const deviation = App.speedFactor * speedDeviation + App.benchmarkFactor * benchmarkDeviation

            const thresh = Math.round(App.thresh * deviation + App.thresh)
            this._ui.updateSchedulerState(node[0], { deviation, thresh })

            if (delta < minDelta && delta < thresh) {
                minDelta = delta
                minNode = node[0]
            }
        }

        return minNode
    }

    private scheduleTask (uuid: string, task: [string, Task]): void {
        task[1].node = uuid

        if (uuid === this._uuid) {
            this._dict.set(task[0], uuid)
            this._moduleAdapter.processFile(task[0], task[1].sourceFile)
            return
        }

        const URLReader = new FileReader()

        URLReader.onload = () => {
            this._connections.send(DataType.FILE_PROCESS, uuid, {
                fileId: task[0],
                sourceFile: URLReader.result
            })
        }

        URLReader.readAsDataURL(task[1].sourceFile)
    }
}
