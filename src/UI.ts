import { type SchedulerState, type ConnectionState, type ModuleState } from './Interfaces'

export class UI {
    private readonly _inputFiles = document.getElementById('input-files') as HTMLInputElement
    private readonly _selectFiles = document.getElementById('select-files') as HTMLButtonElement
    private readonly _processFiles = document.getElementById('process-files') as HTMLButtonElement
    private readonly _downloadFiles = document.getElementById('download-files') as HTMLButtonElement
    private readonly _nodes = document.getElementById('nodes') as HTMLDivElement
    private readonly _appLogs = document.getElementById('app-logs') as HTMLDivElement
    private readonly _connectionLogs = document.getElementById('connection-logs') as HTMLDivElement

    public onProcessFiles = (files: FileList): void => {}
    public onDownloadFiles = (): void => {}

    public constructor () {
        this._inputFiles.onchange = () => {
            const files = this._inputFiles.files
            if (files !== null) { this.addAppLog(`selected ${files.length} files`) }
        }

        this._selectFiles.onclick = () => {
            document.getElementById('input-files')?.click()
        }

        this._processFiles.onclick = () => {
            const files = this._inputFiles.files

            if (files !== null && files.length > 0) {
                this.addAppLog(`processing ${files.length} files`)
                this.onProcessFiles(files)
            } else {
                this.addAppLog('no files selected')
            }
        }

        this._downloadFiles.onclick = () => {
            this.onDownloadFiles()
        }

        this._appLogs.appendChild(document.createElement('div'))
    }

    public addModuleLog (text: string): void {
        (this._appLogs.children[0] as HTMLDivElement).innerText = `[${text}]`
    }

    public addAppLog (text: string): void {
        const count = this._appLogs.childElementCount
        if (count >= 10) { this._appLogs.removeChild(this._appLogs.children[1]) }

        const log = document.createElement('div')
        log.innerText = `> ${text}`
        this._appLogs.appendChild(log)
    }

    public addConnectionLog (text: string): void {
        const count = this._connectionLogs.childElementCount
        if (count >= 10) { this._connectionLogs.removeChild(this._connectionLogs.children[0]) }

        const log = document.createElement('div')
        log.innerText = `> ${text}`
        this._connectionLogs.appendChild(log)
    }

    public addNode (uuid: string): void {
        const connectionState = document.createElement('div')
        const moduleState = document.createElement('div')
        const schedulerState = document.createElement('div')
        const uuidDiv = document.createElement('div')
        const node = document.createElement('div')

        connectionState.className = 'connection-state'
        moduleState.className = 'module-state'
        schedulerState.className = 'scheduler-state'
        uuidDiv.className = 'uuid'
        uuidDiv.innerText = `[${uuid.substring(0, 8)}]`
        node.className = 'node'
        node.id = uuid

        node.appendChild(uuidDiv)
        node.appendChild(connectionState)
        node.appendChild(moduleState)
        node.appendChild(schedulerState)
        this._nodes.appendChild(node)
    }

    public removeNode (uuid: string): void {
        document.getElementById(uuid)?.remove()
    }

    public updateConnectionState (uuid: string, state: ConnectionState): void {
        const node = document.getElementById(uuid)
        if (node === null) { return }

        const connectionState = node.children[1] as HTMLDivElement
        const signaling = `[${state.signaling ?? 'none'} `
        const connection = `${state.connection ?? 'none'} `
        const speed = `${state.speed?.toFixed(2)} Mb/s]`
        connectionState.innerText = signaling + connection + speed
    }

    public updateModuleState (uuid: string, state: ModuleState): void {
        const node = document.getElementById(uuid)
        if (node === null) { return }

        node.className = state.benchmark < 10 ? 'node' : 'node-bold'

        const moduleState = node.children[2] as HTMLDivElement
        const queued = `[queued: ${state.queued} `
        const complete = `complete: ${state.complete} `
        const benchmark = `benchmark: ${state.benchmark.toFixed(2)}]`
        moduleState.innerText = queued + complete + benchmark
    }

    public updateSchedulerState (uuid: string, state: SchedulerState): void {
        const node = document.getElementById(uuid)
        if (node === null) { return }

        const schedulerState = node.children[3] as HTMLDivElement
        const deviation = (state.deviation < 0 ? '' : '+') + state.deviation.toFixed(2)
        schedulerState.innerText = `[deviation: ${deviation} thresh: ${state.thresh}]`
    }

    public clearSchedulerState (): void {
        for (const child of this._nodes.children) {
            const schedulerState = child.children[3] as HTMLDivElement
            schedulerState.innerText = ''
        }
    }
}
