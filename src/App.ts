// @ts-expect-error emscripten
import Module from './wasm/module'

interface EmscriptenModule {
    cwrap: typeof cwrap
    addFunction: typeof addFunction
}

export class App {
    public constructor () {
        Module().then((module: EmscriptenModule) => {
            this.test(module)
        })
    }

    public test (module: EmscriptenModule): void {
        const testAdd = module.cwrap('testAdd', 'number', ['number', 'number'])
        console.log(`add: ${testAdd(20.0, 10.0)}`)
        const multiply = module.addFunction((a, b) => { return a * b }, 'fff')
        const testMultiply = module.cwrap('testMultiply', null, ['string'])
        testMultiply(multiply.toString())
    }
}
