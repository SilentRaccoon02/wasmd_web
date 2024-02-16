import { type ModuleState, THIS_NODE } from './Interfaces'

export class ModuleAdapter {
    private readonly _moduleWorker = new Worker(new URL('./ModuleWorker.ts', import.meta.url))
    private readonly _completeImages = new Array<File>()
    private _queuedCounter = 0
    private _completeCounter = 0

    public onUpdateState = (uuid: string, state: ModuleState): void => {}

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
                    const file = new File([blob], `${this._completeCounter}.jpg`)
                    this._completeImages.push(file)
                    this._completeCounter++
                    this.onUpdateState(THIS_NODE, {
                        queued: this._queuedCounter,
                        complete: this._completeCounter
                    })
                }
            })
        }
    }

    public processImage (inFile: File): void {
        const inImage = new Image()
        const URLReader = new FileReader()
        URLReader.readAsDataURL(inFile)
        URLReader.onload = () => { inImage.src = URLReader.result as string }

        inImage.onload = () => {
            this._queuedCounter++
            this.onUpdateState(THIS_NODE, {
                queued: this._queuedCounter,
                complete: this._completeCounter
            })

            const canvas = document.createElement('canvas')
            const context = canvas.getContext('2d') as CanvasRenderingContext2D
            canvas.width = inImage.width
            canvas.height = inImage.height
            context.drawImage(inImage, 0, 0)

            const inData = context.getImageData(0, 0, inImage.width, inImage.height).data
            this._moduleWorker.postMessage({ inData, width: inImage.width, height: inImage.height })
        }
    }

    public getResult (): File[] {
        return this._completeImages
    }
}
