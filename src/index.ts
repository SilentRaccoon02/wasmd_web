// @ts-expect-error emscripten
import Module from './wasm/module'

import './styles.css'
import { App } from './App'
import { Connections } from './Connections'
import { DataType, type ExtendedModule } from './Interfaces'
import { log, updateStates } from './Document'

Module().then((module: ExtendedModule) => {
    // TODO init all here
    log('WASM: initialized', 'log-green')

    // eslint-disable-next-line
    const app = new App(module)
})

const connections = new Connections()
const test = document.getElementById('test')

if (test !== null) {
    test.onclick = () => {
        connections.sendViaP2P(DataType.P2P_TEST, '', undefined)
    }
}

setInterval(() => { updateStates(connections.states()) }, 500)
