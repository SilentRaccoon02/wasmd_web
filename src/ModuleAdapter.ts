export class ModuleAdapter {
    private readonly _worker = new Worker(new URL('./ModuleWorker.ts', import.meta.url))
    private readonly _resultImages = new Array<File>()

    private readonly _updateResult: (count: number) => void
    private readonly _updateQueued: (count: number) => void
    private _resultCounter = 0
    private _queuedCounter = 0

    public constructor (updateQueued: (count: number) => void, updateResult: (count: number) => void) {
        this._updateResult = updateResult
        this._updateQueued = updateQueued

        this._worker.onmessage = (event) => {
            const data = event.data

            const canvas = document.createElement('canvas')
            const context = canvas.getContext('2d') as CanvasRenderingContext2D
            canvas.width = data.width
            canvas.height = data.height
            context.putImageData(data.outImage, 0, 0)

            canvas.toBlob((blob) => {
                if (blob !== null) {
                    const file = new File([blob], `${this._resultCounter}.jpg`)
                    this._resultImages.push(file)
                    this._resultCounter++
                    this._updateResult(this._resultCounter)
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
            this._updateQueued(this._queuedCounter)

            const canvas = document.createElement('canvas')
            const context = canvas.getContext('2d') as CanvasRenderingContext2D
            canvas.width = inImage.width
            canvas.height = inImage.height
            context.drawImage(inImage, 0, 0)

            const inData = context.getImageData(0, 0, inImage.width, inImage.height).data
            this._worker.postMessage({ inData, width: inImage.width, height: inImage.height })
        }
    }

    public getResult (): File[] {
        return this._resultImages
    }
}
