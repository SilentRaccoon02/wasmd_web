import './styles.css'
import { Connections } from './Connections'
import { DataType } from './Interfaces'
import { updateStates } from './Document'
import { App } from './App'

const app = new App()
const connections = new Connections()
const test = document.getElementById('test')

if (test !== null) {
    test.onclick = () => {
        connections.sendViaP2P(DataType.P2P_TEST, '', undefined)
    }
}

setInterval(() => { updateStates(connections.states()) }, 500)
