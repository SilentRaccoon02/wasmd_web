import { type ModuleState } from '../Interfaces'

export class OpenCVAdapter {
    private readonly _moduleWorker = new Worker(new URL('./OpenCVWorker.ts', import.meta.url))
    private _queuedCounter = 0
    private _completeCounter = 0
    private readonly _benchmark = 0

    public onUpdateState = (state: ModuleState): void => {}
    public onFileComplete = (uuid: string, blob: Blob): void => {}

    public constructor () {
        this._moduleWorker.onmessage = (event) => {
            const data = event.data

            const canvas = document.createElement('canvas')
            const context = canvas.getContext('2d') as CanvasRenderingContext2D
            canvas.width = data.width
            canvas.height = data.height
            context.putImageData(data.outImage, 0, 0)

            canvas.toBlob((blob) => {
                if (blob !== null) {
                    this.onFileComplete(data.uuid, blob)
                    this.onUpdateState({
                        queued: this._queuedCounter,
                        complete: ++this._completeCounter,
                        benchmark: this._benchmark
                    })
                }
            })
        }
    }

    public processFile (uuid: string, file: File | string): void {
        const inImage = new Image()
        const URLReader = new FileReader()

        URLReader.onload = () => {
            inImage.src = URLReader.result as string
        }

        inImage.onload = () => {
            this.onUpdateState({
                queued: ++this._queuedCounter,
                complete: this._completeCounter,
                benchmark: this._benchmark
            })

            const canvas = document.createElement('canvas')
            const context = canvas.getContext('2d') as CanvasRenderingContext2D
            canvas.width = inImage.width
            canvas.height = inImage.height
            context.drawImage(inImage, 0, 0)

            const inData = context.getImageData(0, 0, inImage.width, inImage.height).data
            this._moduleWorker.postMessage({ uuid, inData, width: inImage.width, height: inImage.height })
        }

        if (typeof file === 'string') {
            inImage.src = file
        } else {
            URLReader.readAsDataURL(file)
        }
    }
}
