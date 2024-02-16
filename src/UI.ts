import { type ConnectionState, type ModuleState } from './Interfaces'

export class UI {
    private readonly _inputFiles = document.getElementById('input-files') as HTMLInputElement
    private readonly _selectFiles = document.getElementById('select-files') as HTMLButtonElement
    private readonly _processFiles = document.getElementById('process-files') as HTMLButtonElement
    private readonly _downloadFiles = document.getElementById('download-files') as HTMLButtonElement
    private readonly _nodes = document.getElementById('nodes') as HTMLDivElement
    private readonly _logs = document.getElementById('logs') as HTMLDivElement

    public onProcessFiles = (files: FileList): void => {}
    public onDownloadFiles = (): void => {}

    public constructor () {
        this._inputFiles.onchange = () => {
            const files = this._inputFiles.files
            if (files !== null) { this.addLog(`app: selected ${files.length} files`) }
        }

        this._selectFiles.onclick = () => {
            document.getElementById('input-files')?.click()
        }

        this._processFiles.onclick = () => {
            const files = this._inputFiles.files

            if (files !== null && files.length > 0) {
                this.addLog(`processing ${files.length} files`)
                this.onProcessFiles(files)
            } else {
                this.addLog('no files selected')
            }
        }

        this._downloadFiles.onclick = () => {
            this.onDownloadFiles()
        }
    }

    public addLog (text: string): void {
        const count = this._logs.childElementCount
        if (count >= 20) { this._logs.removeChild(this._logs.children[0]) }

        const log = document.createElement('div')
        log.innerText = `> ${text}`
        this._logs.appendChild(log)
    }

    public addNode (uuid: string): void {
        const connectionState = document.createElement('div')
        const moduleState = document.createElement('div')
        const uuidDiv = document.createElement('div')
        const node = document.createElement('div')

        connectionState.className = 'state'
        moduleState.className = 'state'
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
        moduleState.innerText = `(${state.queued})queued (${state.complete})complete`
    }
}
