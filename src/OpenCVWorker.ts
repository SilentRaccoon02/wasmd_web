// @ts-expect-error emscripten
import Module from './wasm/module'
import { type ExtendedModule } from './Interfaces'

let MODULE: ExtendedModule

Module().then((emscriptenModule: ExtendedModule) => {
    MODULE = emscriptenModule
})

onmessage = (event) => {
    if (MODULE === undefined) { return }

    const data = event.data
    const processImage = MODULE.cwrap('run', 'number', ['number', 'number', 'number'])

    const dataSize = data.inData.length * data.inData.BYTES_PER_ELEMENT
    const inPointer = MODULE._malloc(dataSize)
    MODULE.HEAPU8.set(data.inData, inPointer)

    const outPointer = processImage(inPointer, data.width, data.height)
    const outData = MODULE.HEAPU8.subarray(outPointer, outPointer + dataSize)
    const outImage = new ImageData(new Uint8ClampedArray(outData), data.width, data.height)

    MODULE._free(inPointer)
    MODULE._free(outPointer)

    postMessage({ uuid: data.uuid, outImage, width: data.width, height: data.height })
}
