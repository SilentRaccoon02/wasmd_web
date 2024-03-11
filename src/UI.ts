import { type ConnectionState, type ModuleState } from './Interfaces'

export class UI {
    private readonly _inputFiles = document.getElementById('input-files') as HTMLInputElement
    private readonly _selectFiles = document.getElementById('select-files') as HTMLButtonElement
    private readonly _processFiles = document.getElementById('process-files') as HTMLButtonElement
    private readonly _downloadFiles = document.getElementById('download-files') as HTMLButtonElement
    private readonly _nodes = document.getElementById('nodes') as HTMLDivElement
    private readonly _appLogs = document.getElementById('app-logs') as HTMLDivElement
    private readonly _connectionsLogs = document.getElementById('connections-logs') as HTMLDivElement

    public onProcessFiles = (files: FileList): void => {}
    public onDownloadFiles = (): void => {}

    public constructor () {
        this._inputFiles.onchange = () => {
            const files = this._inputFiles.files
            if (files !== null) { this.addAppLog(`ui: selected ${files.length} files`) }
        }

        this._selectFiles.onclick = () => {
            document.getElementById('input-files')?.click()
        }

        this._processFiles.onclick = () => {
            const files = this._inputFiles.files

            if (files !== null && files.length > 0) {
                this.addAppLog(`ui: processing ${files.length} files`)
                this.onProcessFiles(files)
            } else {
                this.addAppLog('ui: no files selected')
            }
        }

        this._downloadFiles.onclick = () => {
            this.onDownloadFiles()
        }

        this._appLogs.appendChild(document.createElement('div'))
    }

    public addModuleLog (text: string): void {
        (this._appLogs.children[0] as HTMLDivElement).innerText = `> ${text}`
    }

    public addAppLog (text: string): void {
        const count = this._appLogs.childElementCount
        if (count >= 10) { this._appLogs.removeChild(this._appLogs.children[1]) }

        const log = document.createElement('div')
        log.innerText = `> ${text}`
        this._appLogs.appendChild(log)
    }

    public addConnectionsLog (text: string): void {
        const count = this._connectionsLogs.childElementCount
        if (count >= 10) { this._connectionsLogs.removeChild(this._connectionsLogs.children[0]) }

        const log = document.createElement('div')
        log.innerText = `> ${text}`
        this._connectionsLogs.appendChild(log)
    }

    public addNode (uuid: string): void {
        const connectionState = document.createElement('div')
        const moduleState = document.createElement('div')
        const uuidDiv = document.createElement('div')
        const node = document.createElement('div')

        connectionState.className = 'connection-state'
        moduleState.className = 'module-state'
        uuidDiv.className = 'uuid'
        uuidDiv.innerText = uuid.substring(0, 8)
        node.className = 'node'
        node.id = uuid

        node.appendChild(uuidDiv)
        node.appendChild(connectionState)
        node.appendChild(moduleState)
        this._nodes.appendChild(node)
    }

    public removeNode (uuid: string): void {
        document.getElementById(uuid)?.remove()
    }

    public updateConnectionState (uuid: string, state: ConnectionState): void {
        const node = document.getElementById(uuid)
        if (node === null) { return }

        const connectionState = node.children[1] as HTMLDivElement
        connectionState.innerText = `${state.signaling} ${state.connection}`
    }

    public updateModuleState (uuid: string, state: ModuleState): void {
        const node = document.getElementById(uuid)
        if (node === null) { return }

        const moduleState = node.children[2] as HTMLDivElement
        const queued = `(${state.queued})queued `
        const complete = `(${state.complete})complete `
        const benchmark = `(${(state.benchmark).toFixed(2)})benchmark`
        moduleState.innerText = queued + complete + benchmark
    }
}
