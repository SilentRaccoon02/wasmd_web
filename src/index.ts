// @ts-expect-error emscripten
import Module from './wasm/module'
import Connections from './Connections'
import './styles.css'

interface EmscriptenModule {
    cwrap: typeof cwrap
    addFunction: typeof addFunction
}

Module().then((module: EmscriptenModule) => {
    const add = module.cwrap('add', 'number', ['number', 'number'])
    console.log(`add: ${add(25.0, 12.0)}`)
    const multiply = module.addFunction((a, b) => { return a * b }, 'fff')
    const run = module.cwrap('run', null, ['string'])
    run(multiply.toString())
})

const connections = new Connections()
const test = document.getElementById('test')

if (test !== null) {
    test.onclick = connections.sendTestP2P
}
