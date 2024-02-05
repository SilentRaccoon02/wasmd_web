import { ModuleAdapter } from './ModuleAdapter'
import { DataType, type ExtendedModule } from './Interfaces'
import { log, updateStates } from './Document'
import { Connections } from './Connections'

export class App {
    private readonly _moduleAdapter: ModuleAdapter
    private readonly _connections = new Connections()
    private readonly _inputFiles = document.getElementById('input-files') as HTMLInputElement
    private readonly _selectFiles = document.getElementById('select-files') as HTMLButtonElement
    private readonly _processFiles = document.getElementById('process-files') as HTMLButtonElement
    private readonly _downloadFiles = document.getElementById('download-files') as HTMLButtonElement
    private readonly _testConnections = document.getElementById('test-connections') as HTMLButtonElement

    public constructor (module: ExtendedModule) {
        this._moduleAdapter = new ModuleAdapter(module)
        this._moduleAdapter.testModule()

        this._selectFiles.onclick = () => {
            const inputFiles = document.getElementById('input-files')
            inputFiles?.click()
        }

        this._inputFiles.onchange = () => {
            const files = this._inputFiles.files
            if (files !== null) { log(`app: ${files.length} files selected`) }
        }

        this._processFiles.onclick = () => {
            const files = this._inputFiles.files

            if (files !== null && files.length > 0) {
                this.processFiles(files)
            } else {
                log('app: no files selected', 'log-red')
            }
        }

        this._testConnections.onclick = () => {
            this._connections.sendViaP2P(DataType.P2P_TEST, '', undefined)
        }

        setInterval(() => { updateStates(this._connections.states()) }, 500)
    }

    private processFiles (files: FileList): void {
        for (const file of files) {
            this._moduleAdapter.processImage(file)
        }
    }
}
