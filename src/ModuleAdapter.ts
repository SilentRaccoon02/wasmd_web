import { type ModuleState } from './Interfaces'

export class ModuleAdapter {
    private readonly _moduleWorker = new Worker(new URL('./ModuleWorker.ts', import.meta.url))
    private _queuedCounter = -1
    private _completeCounter = -1
    private _indicatorCounter = 0
    private _benchmark = 0

    public onAddLog = (text: string): void => {}
    public onAddModuleLog = (text: string): void => {}
    public onUpdateState = (state: ModuleState): void => {}
    public onFileComplete = (uuid: string, blob: Blob): void => {}

    public constructor () {
        this._moduleWorker.onmessage = (event) => {
            const data = event.data

            if (Object.keys(data).length === 0) {
                this.processFile('benchmark', new URL('./benchmark.jpg', import.meta.url).href)

                return
            }

            if (data.text !== undefined) {
                let indicator

                if (this._indicatorCounter === 0) {
                    indicator = '\\'
                    this._indicatorCounter = 1
                } else {
                    indicator = '/'
                    this._indicatorCounter = 0
                }

                const task = this._completeCounter === -1
                    ? 'benchmark'
                    : 'file'
                // : `file ${this._completeCounter + 1}` TODO filename
                const text = `processing ${task} ${indicator}`
                this.onAddModuleLog(text)

                return
            }

            const blob = new Blob([data.array])

            if (data.uuid === 'benchmark') {
                this._benchmark = (1 / data.time * 100)
                this.onAddLog(`task complete with score ${this._benchmark.toFixed(2)}`)
            } else {
                this.onFileComplete(data.uuid, blob)
                this.onAddLog(`task complete in ${data.time.toFixed(2)} seconds`)
            }

            this.onUpdateState({
                queued: this._queuedCounter,
                complete: ++this._completeCounter,
                benchmark: this._benchmark
            })

            if (this._queuedCounter === this._completeCounter) {
                this.onAddModuleLog('ready')
            }
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
            this.onAddLog(`task requires ${megabytes.toFixed(2)} Mb of RAM`)

            if (megabytes > 3500) {
                this.onAddLog('RAM limit would be exceeded, skipping task')
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

        if (this._queuedCounter !== -1) {
            this.onUpdateState({
                queued: ++this._queuedCounter,
                complete: this._completeCounter,
                benchmark: this._benchmark
            })
        } else {
            this._queuedCounter++
        }
    }
}
