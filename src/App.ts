import JSZip from 'jszip'
import saveAs from 'file-saver'
import { Connections } from './Connections'
import { ModuleAdapter } from './ModuleAdapter'
import { Scheduler } from './Scheduler'
import { DataType } from './Interfaces'
import { UI } from './UI'

export class App {
    private readonly _ui = new UI()
    private readonly _scheduler = new Scheduler()
    private readonly _connections = new Connections()
    private readonly _moduleAdapter = new ModuleAdapter()
    private readonly _completeFiles = new Array<File>()
    private _uuid: string | undefined

    public constructor () {
        this._connections.onUUID = (uuid) => {
            this._uuid = uuid
            this.initUI(uuid)
            this.initScheduler(uuid)
            this.initModuleAdapter(uuid)
        }

        this._connections.onAddLog = (text) => {
            this._ui.addLog(text)
        }

        this._connections.onAddNode = (uuid) => {
            this._ui.addNode(uuid)
            this._scheduler.addNode(uuid)
        }

        this._connections.onRemoveNode = (uuid) => {
            this._ui.removeNode(uuid)
            this._scheduler.removeNode(uuid)
        }

        this._connections.onUpdateState = (uuid, state) => {
            this._ui.updateConnectionState(uuid, state)
            this._scheduler.updateConnectionState(uuid, state)
        }

        this._connections.onReceiveViaP2P = (type, from, data) => {
            if (type === DataType.FILE_PROCESS) {
                this._moduleAdapter.processFile(from, data)
            } else if (type === DataType.FILE_RESULT) {
                fetch(data).then(async res => await res.blob()).then((blob) => {
                    const file = new File([blob], `${this._completeFiles.length}.jpg`)
                    this._completeFiles.push(file)
                }).catch((reason) => { console.log(reason) })
            } else if (type === DataType.MODULE_STATE) {
                this._ui.updateModuleState(from, data)
                this._scheduler.updateModuleState(from, data)
            }
        }
    }

    private readonly initUI = (uuid: string): void => {
        this._ui.addNode(uuid)

        this._ui.updateConnectionState(uuid, {
            signaling: 'stable',
            connection: 'connected'
        })

        this._ui.onProcessFiles = (files: FileList): void => {
            if (this._uuid === undefined) { return }

            const plan = this._scheduler.schedule(this._uuid, files.length)
            let offset = 0

            for (const node of plan) {
                for (let i = offset; i < node[1] + offset; ++i) {
                    if (node[0] === uuid) {
                        this._moduleAdapter.processFile(uuid, files[i])
                        continue
                    }

                    const URLReader = new FileReader()

                    URLReader.onload = () => {
                        this._connections.sendViaP2P(DataType.FILE_PROCESS, node[0], URLReader.result)
                    }

                    URLReader.readAsDataURL(files[i])
                }

                offset += node[1]
            }
        }

        this._ui.onDownloadFiles = () => {
            this._ui.addLog(`ui: downloading ${this._completeFiles.length} files`)

            const zip = new JSZip()
            const folder = zip.folder('result')

            for (const file of this._completeFiles) {
                folder?.file(file.name, file)
            }

            folder?.generateAsync({ type: 'blob' })
                .then((blob) => { saveAs(blob, 'result') })
                .catch((reason) => { console.log(reason) })
        }
    }

    private readonly initScheduler = (uuid: string): void => {
        this._scheduler.addNode(uuid)

        this._scheduler.updateConnectionState(uuid, {
            signaling: 'stable',
            connection: 'connected'
        })
    }

    private readonly initModuleAdapter = (thisUUID: string): void => {
        this._moduleAdapter.onAddLog = (text) => {
            this._ui.addLog(text)
        }

        this._moduleAdapter.onAddModuleLog = (text) => {
            this._ui.addModuleLog(text)
        }

        this._moduleAdapter.onUpdateState = (state) => {
            if (this._uuid === undefined) { return }

            this._ui.updateModuleState(this._uuid, state)
            this._scheduler.updateModuleState(this._uuid, state)
            this._connections.sendViaP2P(DataType.MODULE_STATE, '', state)
        }

        this._moduleAdapter.onFileComplete = (uuid, file) => {
            if (uuid === thisUUID) {
                this._completeFiles.push(new File([file], `${this._completeFiles.length}.jpg`))
            } else {
                const URLReader = new FileReader()

                URLReader.onload = () => {
                    this._connections.sendViaP2P(DataType.FILE_RESULT, uuid, URLReader.result)
                }

                URLReader.readAsDataURL(file)
            }
        }
    }
}
