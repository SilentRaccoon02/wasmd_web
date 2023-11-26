import log from './Log'

interface DataObject {
    type: string
    from: string | undefined
    to: string
    data: any | undefined
}

// TODO add enum

interface IP2P {
    connection: RTCPeerConnection | undefined
    channel: RTCDataChannel | undefined
}

type IAction = (dataObject: DataObject) => void

export default class Connections {
    private _uuid: string | undefined = undefined
    private readonly _server = new WebSocket('ws://localhost:2512')
    private readonly _nodes = new Map<string, IP2P>()
    private readonly _actions = new Map<string, IAction>()

    public constructor () {
        this._server.binaryType = 'arraybuffer'
        this._server.onopen = () => { log('server: open') }
        this._server.onclose = () => { log('server: close') }
        this._server.onerror = (error) => { console.log(error) }
        this._server.onmessage = (message) => {
            const jsonString = new TextDecoder().decode(message.data)
            const dataObject = JSON.parse(jsonString)
            this._actions.get(dataObject.type)?.(dataObject)
            log(`server: ${dataObject.type} from ${dataObject.from}`)
        }

        this._actions.set('uuid', (dataObject) => { this._uuid = dataObject.to })
        this._actions.set('close', (dataObject) => { this._nodes.delete(dataObject.data) })
        this._actions.set('nodes', (dataObject) => {
            dataObject.data.forEach((uuid: string) => {
                this.sendViaServer({ type: 'p2p-req', from: this._uuid, to: uuid, data: undefined })
                this._nodes.set(uuid, { connection: undefined, channel: undefined })
            })
        })
        this._actions.set('p2p-req', this.reqP2P)
        this._actions.set('p2p-res', this.resP2P)
        this._actions.set('p2p-ice', this.iceP2P)
        this._actions.set('p2p-offer', this.offerP2P)
        this._actions.set('p2p-answer', this.answerP2P)
    }

    private sendViaServer (dataObject: DataObject): void {
        log(`sendViaServer: ${dataObject.type} to ${dataObject.to}`)
        const jsonString = JSON.stringify(dataObject)
        const bytes = new TextEncoder().encode(jsonString)
        this._server.send(bytes)
    }

    private readonly reqP2P = (dataObject: DataObject): void => {
        if (dataObject.from === undefined) {
            return
        }

        const uuid = dataObject.from
        const connection = new RTCPeerConnection()

        connection.onicecandidate = (ice) => {
            this.sendViaServer({ type: 'p2p-ice', from: this._uuid, to: uuid, data: ice.candidate })
        }

        connection.ondatachannel = (channelEvent) => {
            const node = this._nodes.get(uuid)
            const channel = channelEvent.channel

            channel.onopen = () => { log('p2p: open') }
            channel.onclose = () => { log('p2p: close') }
            channel.onerror = (error) => { console.log(error) }
            channel.onmessage = (message) => { log(message.data) }

            if (node !== undefined) {
                node.channel = channel
            }
        }

        this._nodes.set(uuid, { connection, channel: undefined })
        this.sendViaServer({ type: 'p2p-res', from: this._uuid, to: uuid, data: undefined })
    }

    private readonly resP2P = (dataObject: DataObject): void => {
        if (dataObject.from === undefined) {
            return
        }

        const uuid = dataObject.from
        const connection = new RTCPeerConnection()
        const channel = connection.createDataChannel('channel')

        connection.onicecandidate = (ice) => {
            this.sendViaServer({ type: 'p2p-ice', from: this._uuid, to: uuid, data: ice.candidate })
        }

        channel.onopen = () => { log('p2p: open') }
        channel.onclose = () => { log('p2p: close') }
        channel.onerror = (error) => { console.log(error) }
        channel.onmessage = (message) => { log(message.data) }
        this._nodes.set(uuid, { connection, channel })

        connection.createOffer()
            .then(async (offer) => { await connection.setLocalDescription(offer) })
            .then(() => {
                this.sendViaServer({
                    type: 'p2p-offer',
                    from: this._uuid,
                    to: uuid,
                    data: connection.localDescription
                })
            }).catch((reason) => { console.log(reason) })
    }

    private readonly iceP2P = (dataObject: DataObject): void => {
        if (dataObject.from === undefined) {
            return
        }

        const uuid = dataObject.from
        const connection = this._nodes.get(uuid)?.connection

        connection?.addIceCandidate(dataObject.data)
            .catch((reason) => { console.log(reason) })
    }

    private readonly offerP2P = (dataObject: DataObject): void => {
        if (dataObject.from === undefined) {
            return
        }

        const uuid = dataObject.from
        const connection = this._nodes.get(uuid)?.connection

        connection?.setRemoteDescription(dataObject.data)
            .catch((reason) => { console.log(reason) })

        connection?.createAnswer()
            .then(async (answer) => { await connection.setLocalDescription(answer) })
            .then(() => {
                this.sendViaServer({
                    type: 'p2p-answer',
                    from: this._uuid,
                    to: uuid,
                    data: connection.localDescription
                })
            }).catch((reason) => { console.log(reason) })
    }

    private readonly answerP2P = (dataObject: DataObject): void => {
        if (dataObject.from === undefined) {
            return
        }

        const uuid = dataObject.from
        const connection = this._nodes.get(uuid)?.connection

        connection?.setRemoteDescription(dataObject.data)
            .catch((reason) => { console.log(reason) })
    }
}
