import JSZip from 'jszip'
import saveAs from 'file-saver'
import { Connections } from './Connections'
import { ModuleAdapter } from './ModuleAdapter'
import { THIS_NODE } from './Interfaces'
import { UI } from './UI'

export class App {
    private readonly _ui = new UI()
    private readonly _connections = new Connections()
    private readonly _moduleAdapter = new ModuleAdapter()

    public constructor () {
        this._ui.addNode(THIS_NODE)
        this._ui.updateConnectionState(THIS_NODE, {
            signaling: undefined,
            connection: undefined
        })

        this._ui.onProcessFiles = (files) => {
            for (const file of files) {
                this._moduleAdapter.processImage(file)
            }
        }

        this._ui.onDownloadFiles = () => {
            const files = this._moduleAdapter.getResult()
            this._ui.addLog(`app: downloading ${files.length} files`)

            const zip = new JSZip()
            const folder = zip.folder('result')

            for (const file of files) {
                folder?.file(file.name, file)
            }

            folder?.generateAsync({ type: 'blob' })
                .then((blob) => { saveAs(blob, 'result') })
                .catch((reason) => { console.log(reason) })
        }

        this._connections.onAddLog = (text) => { this._ui.addLog(text) }
        this._connections.onAddNode = (uuid) => { this._ui.addNode(uuid) }
        this._connections.onRemoveNode = (uuid) => { this._ui.removeNode(uuid) }
        this._connections.onUpdateState = (uuid, state) => {
            this._ui.updateConnectionState(uuid, state)
        }

        this._moduleAdapter.onUpdateState = (uuid, state) => {
            this._ui.updateModuleState(uuid, state)
        }
    }
}
