import { ModuleAdapter } from './ModuleAdapter'
import { DataType, type ExtendedModule } from './Interfaces'
import { log } from './Document'
import { Connections } from './Connections'

import JSZip from 'jszip'
import { saveAs } from 'file-saver'

export class App {
    private readonly _moduleAdapter: ModuleAdapter
    private readonly _connections = new Connections()
    private readonly _inputFiles = document.getElementById('input-files') as HTMLInputElement
    private readonly _selectFiles = document.getElementById('select-files') as HTMLButtonElement
    private readonly _processFiles = document.getElementById('process-files') as HTMLButtonElement
    private readonly _downloadFiles = document.getElementById('download-files') as HTMLButtonElement
    private readonly _testConnections = document.getElementById('test-connections') as HTMLButtonElement
    private _selectCounter = 0
    private _resultCounter = 0
    private _startTime = 0

    public constructor (module: ExtendedModule) {
        this._moduleAdapter = new ModuleAdapter(module, (count: number) => {
            const time = Math.floor((performance.now() - this._startTime) / 1000)
            this._resultCounter = count
            this.updateProcess(time)
        })

        this._moduleAdapter.testModule()

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
            this._startTime = performance.now()
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
        for (const file of files) {
            this._moduleAdapter.processImage(file)
            console.log('process')
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

    private updateProcess (time: number = 0): void {
        const files = document.getElementById('files')

        if (files !== null) {
            files.innerText = `selected ${this._selectCounter} result ${this._resultCounter} time ${time}`
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
