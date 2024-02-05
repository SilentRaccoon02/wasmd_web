import { type ExtendedModule } from './Interfaces'

export class ModuleAdapter {
    private readonly _module: ExtendedModule
    private readonly _resultImages = null

    public constructor (module: ExtendedModule) {
        this._module = module
    }

    public testModule (): void {
        const testArray = this._module.cwrap('testArray', 'number', ['number', 'number'])

        const inData = new Uint8Array([2, 4, 6, 8])
        const dataSize = inData.length * inData.BYTES_PER_ELEMENT
        const inPointer = this._module._malloc(dataSize)
        this._module.HEAPU8.set(inData, inPointer)

        const outPointer = testArray(inPointer, inData.length)
        const outData = this._module.HEAPU8.subarray(outPointer, outPointer + dataSize)
        console.log(outData)

        this._module._free(inPointer)
        this._module._free(outPointer)
    }

    public processImage (inFile: File): void {
        const inImage = new Image()
        const URLReader = new FileReader()
        URLReader.readAsDataURL(inFile)
        URLReader.onload = () => { inImage.src = URLReader.result as string }

        inImage.onload = () => {
            const processImage = this._module.cwrap('processImage', 'number', ['number', 'number', 'number'])

            const canvas = document.createElement('canvas')
            const context = canvas.getContext('2d') as CanvasRenderingContext2D
            canvas.width = inImage.width
            canvas.height = inImage.height
            context.drawImage(inImage, 0, 0)

            const inData = context.getImageData(0, 0, inImage.width, inImage.height).data
            const dataSize = inData.length * inData.BYTES_PER_ELEMENT
            const inPointer = this._module._malloc(dataSize)
            this._module.HEAPU8.set(inData, inPointer)

            const outPointer = processImage(inPointer, inImage.width, inImage.height)
            const outData = this._module.HEAPU8.subarray(outPointer, outPointer + dataSize)
            const outImage = new ImageData(new Uint8ClampedArray(outData), inImage.width, inImage.height)
            context.putImageData(outImage, 0, 0)
            document.body.appendChild(canvas)

            this._module._free(inPointer)
            this._module._free(outPointer)
        }
    }
}
