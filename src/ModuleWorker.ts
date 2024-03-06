// @ts-expect-error emscripten
import Module from './wasm/module'
import { type ExtendedModule } from './Interfaces'

let MODULE: ExtendedModule

Module().then((emscriptenModule: ExtendedModule) => {
    MODULE = emscriptenModule
})

function strToPtr (str: string): number {
    const size = MODULE.lengthBytesUTF8(str) + 1
    const ptr = MODULE._malloc(size)
    MODULE.stringToUTF8(str, ptr, size)

    return ptr
}

function callWithArgs (strs: string[]): number {
    const ptrs = strs.map(str => strToPtr(str))
    const args = MODULE._malloc(ptrs.length * 4) // 4 bytes per pointer
    ptrs.forEach((ptr, i) => { MODULE.setValue(args + i * 4, ptr, 'i32') })

    const main = MODULE.cwrap('run', 'number', ['number', 'number'])
    const ret = main(ptrs.length, args)

    ptrs.forEach((ptr) => { MODULE._free(ptr) })
    MODULE._free(args)

    return ret
}

onmessage = (event) => {
    if (MODULE === undefined) { return }

    const data = event.data
    const start = performance.now()
    MODULE.FS.writeFile('in', new Uint8Array(data.array))

    if (callWithArgs(['name', '--verbose', 'in', 'out']) !== 0) { return }

    const array = MODULE.FS.readFile('out')
    MODULE.FS.unlink('in')
    MODULE.FS.unlink('out')

    const time = Math.round((performance.now() - start) / 1000)
    postMessage({ uuid: data.uuid, array, time })
}
