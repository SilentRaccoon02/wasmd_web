import { type ExtendedModule } from './Interfaces'

export class App {
    private readonly _module: ExtendedModule
    private readonly _inputImages = document.getElementById('input-images') as HTMLInputElement
    private readonly _queuedImage = document.getElementById('queued-image') as HTMLCanvasElement
    private readonly _resultImage = document.getElementById('result-image') as HTMLCanvasElement

    public constructor (module: ExtendedModule) {
        this._module = module
        this.testModule()

        this._inputImages.onchange = () => {
            if (this._inputImages.files === null) { return }
            this.processFile(this._inputImages.files[0])
        }
    }

    private testModule (): void {
        const testAdd = this._module.cwrap('testAdd', 'number', ['number', 'number'])
        console.log(`add: ${testAdd(20.0, 10.0)}`)

        const multiply = this._module.addFunction((a, b) => { return a * b }, 'fff')
        const testMultiply = this._module.cwrap('testMultiply', null, ['string'])
        testMultiply(multiply.toString())

        const inputData = new Uint8Array([20, 40, 60])
        const inputPointer = this._module._malloc(inputData.length * inputData.BYTES_PER_ELEMENT)
        this._module.HEAPU8.set(inputData, inputPointer)
        const testArray = this._module.cwrap('testArray', null, ['number', 'number', 'number'])
        testArray(inputPointer, inputData.length, 20)
        const outputData = this._module.HEAPU8.subarray(inputPointer, inputPointer + inputData.length * inputData.BYTES_PER_ELEMENT)
        this._module._free(inputPointer)
        console.log(outputData)
    }

    private processFile (file: File): void {
        const image = new Image()
        const URLReader = new FileReader()
        URLReader.readAsDataURL(file)
        URLReader.onload = () => { image.src = URLReader.result as string }

        image.onload = () => {
            const processImage = this._module.cwrap('processImage', 'number', ['number', 'number', 'number'])
            const queuedContext = this._queuedImage.getContext('2d')
            const resultContext = this._resultImage.getContext('2d')
            if (queuedContext === null || resultContext === null) { return }

            this._queuedImage.width = image.width
            this._queuedImage.height = image.height
            this._resultImage.width = image.width
            this._resultImage.height = image.height

            queuedContext.drawImage(image, 0, 0)
            const inputData = queuedContext.getImageData(0, 0, image.width, image.height).data
            const inputPointer = this._module._malloc(inputData.length * inputData.BYTES_PER_ELEMENT)
            this._module.HEAPU8.set(inputData, inputPointer)

            const outputPointer = processImage(inputPointer, image.width, image.height)
            const outputData = this._module.HEAPU8.subarray(outputPointer, outputPointer + inputData.length * inputData.BYTES_PER_ELEMENT)
            const outputImage = new ImageData(new Uint8ClampedArray(outputData), image.width, image.height)
            resultContext.putImageData(outputImage, 0, 0)

            this._module._free(inputPointer)
            this._module._free(outputPointer)
        }
    }
}
