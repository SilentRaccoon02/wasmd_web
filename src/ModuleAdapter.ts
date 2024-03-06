import { type ModuleState } from './Interfaces'

export class ModuleAdapter {
    private readonly _moduleWorker = new Worker(new URL('./ModuleWorker.ts', import.meta.url))
    private _queuedCounter = 0
    private _completeCounter = 0

    public onAddLog = (text: string): void => {}
    public onAddModuleLog = (text: string): void => {}
    public onUpdateState = (state: ModuleState): void => {}
    public onFileComplete = (uuid: string, blob: Blob): void => {}

    public constructor () {
        this._moduleWorker.onmessage = (event) => {
            const data = event.data

            if (data.text !== undefined) {
                const iter = data.text.match(/Iter\s+\d+/)

                if (iter !== null) {
                    const text = `app: file: ${this._completeCounter + 1} iter: ${iter[0].match(/\d+/)}`
                    this.onAddModuleLog(text)
                }

                return
            }

            const blob = new Blob([data.array])
            this.onAddLog(`app: complete in ${data.time} seconds`)
            this.onFileComplete(data.uuid, blob)
            this.onUpdateState({
                queued: this._queuedCounter,
                complete: ++this._completeCounter
            })
        }
    }

    public processFile (uuid: string, file: File | string): void {
        const image = new Image()
        const URLReader = new FileReader()

        URLReader.onload = () => {
            image.src = URLReader.result as string
        }

        image.onload = () => {
            const megapixels = image.width * image.height / 1000000
            const megabytes = megapixels * 300
            this.onAddLog(`app: ${megapixels.toFixed(2)} megapixels (${megabytes.toFixed(2)} megabytes)`)

            if (megabytes > 3500) {
                this.onAddLog('app: memory limit would be exceeded, skipping')
            } else {
                this.enqueueFile(uuid, file)
            }
        }

        if (typeof file === 'string') {
            image.src = file
        } else {
            URLReader.readAsDataURL(file)
        }
    }

    private enqueueFile (uuid: string, file: File | string): void {
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
