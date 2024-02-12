import { ModuleAdapter } from './ModuleAdapter'
import { log } from './Document'
import { Connections } from './Connections'

import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { DataType } from './Interfaces'

export class App {
    private readonly _moduleAdapter: ModuleAdapter
    private readonly _connections = new Connections()

    private readonly _inputFiles = document.getElementById('input-files') as HTMLInputElement
    private readonly _selectFiles = document.getElementById('select-files') as HTMLButtonElement
    private readonly _processFiles = document.getElementById('process-files') as HTMLButtonElement
    private readonly _downloadFiles = document.getElementById('download-files') as HTMLButtonElement
    private readonly _testConnections = document.getElementById('test-connections') as HTMLButtonElement

    private _selectCounter = 0
    private _queuedCounter = 0
    private _resultCounter = 0
    private _startTime = 0

    public constructor () {
        this._moduleAdapter = new ModuleAdapter((count: number) => {
            this._queuedCounter = count
            this.updateProcess()
        }, (count: number) => {
            this._resultCounter = count
            this.updateProcess()
        })

        this._inputFiles.onchange = () => {
            const files = this._inputFiles.files
            if (files === null) { return }

            this._selectCounter = files.length
            this.updateProcess()
        }

        this._selectFiles.onclick = () => {
            const inputFiles = document.getElementById('input-files')
            inputFiles?.click()
        }

        this._processFiles.onclick = () => {
            const files = this._inputFiles.files

            if (files !== null && files.length > 0) {
                this.processFiles(files)
            } else {
                log('app: no files selected', 'log-red')
            }
        }

        this._downloadFiles.onclick = () => {
            this.downloadFiles()
        }

        this._testConnections.onclick = () => {
            this._connections.sendViaP2P(DataType.P2P_TEST, '', undefined)
        }

        setInterval(() => { this.updateStates() }, 500)
    }

    private processFiles (files: FileList): void {
        this._startTime = performance.now()
        log(`app: processing ${files.length} files`, 'log-green')

        for (const file of files) {
            this._moduleAdapter.processImage(file)
        }
    }

    private downloadFiles (): void {
        const files = this._moduleAdapter.getResult()
        log(`app: downloading ${files.length} files`, 'log-green')

        const zip = new JSZip()
        const folder = zip.folder('result')

        for (const file of files) {
            folder?.file(file.name, file)
        }

        folder?.generateAsync({ type: 'blob' })
            .then((blob) => { saveAs(blob, 'result') })
            .catch((reason) => { console.log(reason) })
    }

    private updateProcess (): void {
        const files = document.getElementById('files')

        if (this._selectCounter === this._resultCounter) {
            const time = Math.round((performance.now() - this._startTime) / 1000)
            log(`app: completed in ${time} seconds`, 'log-green')
        }

        if (files !== null) {
            files.innerText = `selected ${this._selectCounter} queued ${this._queuedCounter} result ${this._resultCounter}`
        }
    }

    private updateStates (): void {
        const states = this._connections.states()
        const nodes = document.getElementById('nodes')

        if (nodes?.children !== undefined) {
            for (const node of nodes.children) {
                if (!states.has(node.id)) { node.remove() }
            }
        }

        for (const entry of states.entries()) {
            const text = `${entry[0]} ${entry[1].signaling} ${entry[1].connection}`
            let node = document.getElementById(entry[0])

            if (node === null) {
                node = document.createElement('div')
                node.className = 'node'
                node.id = entry[0]
                nodes?.appendChild(node)
            }

            node.innerText = text
        }
    }
}
