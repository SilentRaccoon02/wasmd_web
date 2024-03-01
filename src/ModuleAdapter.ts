import { type ModuleState } from './Interfaces'

export class ModuleAdapter {
    private readonly _moduleWorker = new Worker(new URL('./ModuleWorker.ts', import.meta.url))
    private _queuedCounter = 0
    private _completeCounter = 0

    public onUpdateState = (state: ModuleState): void => {}
    public onFileComplete = (uuid: string, blob: Blob): void => {}

    public constructor () {
        this._moduleWorker.onmessage = (event) => {
            const data = event.data
            const blob = new Blob([data.array])
            this.onFileComplete(data.uuid, blob)
            this.onUpdateState({
                queued: this._queuedCounter,
                complete: ++this._completeCounter
            })
        }
    }

    public processFile (uuid: string, file: File | string): void {
        if (typeof file === 'string') {
            fetch(file).then(async res => await res.arrayBuffer()).then((arrayBuffer) => {
                this._moduleWorker.postMessage({ uuid, array: arrayBuffer })
            }).catch((reason) => { console.log(reason) })
        } else {
            const bufferReader = new FileReader()

            bufferReader.onload = () => {
                this._moduleWorker.postMessage({ uuid, array: bufferReader.result })
            }

            bufferReader.readAsArrayBuffer(file)
        }

        this.onUpdateState({
            queued: ++this._queuedCounter,
            complete: this._completeCounter
        })
    }
}
