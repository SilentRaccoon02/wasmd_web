interface DataObject {
    type: string
    from: string | undefined
    to: string
    data: any | undefined
}

// interface IP2P {
//     connection: RTCPeerConnection
//     channel: RTCDataChannel
// }

type IAction = (dataObject: DataObject) => void

export default class Connections {
    private _uuid: string | undefined = undefined
    private readonly _server = new WebSocket('ws://localhost:2512')
    private readonly _actions = new Map<string, IAction>()

    public constructor () {
        this._server.binaryType = 'arraybuffer'
        this._server.onopen = (event) => { console.log(event) }
        this._server.onclose = (event) => { console.log(event) }
        this._server.onerror = (event) => { console.log(event) }
        this._server.onmessage = (event) => {
            const jsonString = new TextDecoder().decode(event.data)
            const dataObject = JSON.parse(jsonString)
            this._actions.get(dataObject.type)?.(dataObject)
        }

        this._actions.set('uuid', (dataObject) => { this._uuid = dataObject.to })
        this._actions.set('nodes', (dataObject) => {
            dataObject.data.forEach((uuid: string) => { this.initP2P(uuid) })
        })
    }

    private sendViaServer (dataObject: DataObject): void {
        const jsonString = JSON.stringify(dataObject)
        const bytes = new TextEncoder().encode(jsonString)
        this._server.send(bytes)
    }

    private initP2P (uuid: string): void {
        console.log(uuid)
    }

    private acceptP2P (dataObject: DataObject): void {

    }
}
