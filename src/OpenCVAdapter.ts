import { type ModuleState } from './Interfaces'

export class OpenCVAdapter {
    private readonly _moduleWorker = new Worker(new URL('./OpenCVWorker.ts', import.meta.url))
    private _queuedCounter = -1
    private _completeCounter = -1
    private _indicatorCounter = 0
    private _benchmark = 0

    public onAddLog = (text: string): void => {}
    public onAddModuleLog = (text: string): void => {}
    public onUpdateState = (state: ModuleState): void => {}
    public onFileComplete = (fileId: string, blob: Blob): void => {}

    public constructor () {
        this._moduleWorker.onmessage = (event) => {
            const data = event.data

            if (Object.keys(data).length === 0) {
                const file = new URL('./benchmark.jpg', import.meta.url).href
                this.processFile('benchmark', file)

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
                    : `file ${this._completeCounter + 1}`
                this.onAddModuleLog(`processing ${task} ${indicator}`)

                return
            }

            const canvas = document.createElement('canvas')
            const context = canvas.getContext('2d') as CanvasRenderingContext2D
            canvas.width = data.width
            canvas.height = data.height
            context.putImageData(data.outImage, 0, 0)

            canvas.toBlob((blob) => {
                if (blob !== null) {
                    if (data.fileId === 'benchmark') {
                        this._benchmark = (1 / data.time)
                        this.onAddLog(`task complete with score ${this._benchmark.toFixed(2)}`)
                    } else {
                        this.onFileComplete(data.fileId, blob)
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
            })
        }
    }

    public processFile (fileId: string, file: File | string): void {
        const inImage = new Image()
        const URLReader = new FileReader()

        URLReader.onload = () => {
            inImage.src = URLReader.result as string
        }

        inImage.onload = () => {
            if (this._queuedCounter !== -1) {
                this.onUpdateState({
                    queued: ++this._queuedCounter,
                    complete: this._completeCounter,
                    benchmark: this._benchmark
                })
            } else {
                this._queuedCounter++
            }

            const canvas = document.createElement('canvas')
            const context = canvas.getContext('2d') as CanvasRenderingContext2D
            canvas.width = inImage.width
            canvas.height = inImage.height
            context.drawImage(inImage, 0, 0)

            const inData = context.getImageData(0, 0, inImage.width, inImage.height).data
            this._moduleWorker.postMessage({ fileId, inData, width: inImage.width, height: inImage.height })
        }

        if (typeof file === 'string') {
            inImage.src = file
        } else {
            URLReader.readAsDataURL(file)
        }
    }
}
