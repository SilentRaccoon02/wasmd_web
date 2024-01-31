// @ts-expect-error emscripten
import Module from './wasm/module'

interface ExtendedModule extends EmscriptenModule {
    cwrap: typeof cwrap
    addFunction: typeof addFunction
}

export class App {
    public constructor () {
        Module().then((module: ExtendedModule) => {
            this.test(module)
        })
    }

    private test (module: ExtendedModule): void {
        const testAdd = module.cwrap('testAdd', 'number', ['number', 'number'])
        console.log(`add: ${testAdd(20.0, 10.0)}`)

        const multiply = module.addFunction((a, b) => { return a * b }, 'fff')
        const testMultiply = module.cwrap('testMultiply', null, ['string'])
        testMultiply(multiply.toString())

        const array = new Int8Array([2, 4, 6])
        const buffer = module._malloc(array.length * array.BYTES_PER_ELEMENT)
        module.HEAP8.set(array, buffer)
        const testAccumulate = module.cwrap('testAccumulate', 'number', ['number', 'number'])
        console.log(`accumulate: ${testAccumulate(buffer, array.length)}`)
    }
}
