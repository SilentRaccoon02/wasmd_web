import { log, addNode, removeNode } from './Document'

enum DataType {
    NODE_UUID = 'node-uuid',
    NODE_LIST = 'node-list',
    NODE_CLOSE = 'node-close',

    P2P_REQ = 'p2p-req',
    P2P_RES = 'p2p-res',
    P2P_ICE = 'p2p-ice',
    P2P_OFFER = 'p2p-offer',
    P2P_ANSWER = 'p2p-answer'
}

interface Data {
    type: DataType
    from: string | undefined
    to: string
    data: any | undefined
}

interface IP2P {
    connection: RTCPeerConnection | undefined
    channel: RTCDataChannel | undefined
}

type IAction = (data: Data) => void

export default class Connections {
    private _uuid: string | undefined = undefined
    private readonly _server = new WebSocket('ws://localhost:2512')
    private readonly _nodes = new Map<string, IP2P>()
    private readonly _actions = new Map<DataType, IAction>()

    public constructor () {
        this._server.binaryType = 'arraybuffer'
        this._server.onopen = () => { log('server : open') }
        this._server.onclose = () => { log('server : close') }
        this._server.onerror = (error) => { console.log(error) }
        this._server.onmessage = (message) => {
            const jsonString = new TextDecoder().decode(message.data)
            const data = JSON.parse(jsonString)
            this._actions.get(data.type)?.(data)
        }

        this._actions.set(DataType.NODE_UUID, (data) => { this._uuid = data.to })
        this._actions.set(DataType.NODE_LIST, (data) => {
            data.data.forEach((uuid: string) => {
                this.sendViaServer({ type: DataType.P2P_REQ, from: this._uuid, to: uuid, data: undefined })
                this._nodes.set(uuid, { connection: undefined, channel: undefined })
            })
        })
        this._actions.set(DataType.NODE_CLOSE, (data) => {
            log(`server : close ${data.data}`)
            this._nodes.delete(data.data)
            removeNode(data.data)
        })

        this._actions.set(DataType.P2P_REQ, this.reqP2P)
        this._actions.set(DataType.P2P_RES, this.resP2P)
        this._actions.set(DataType.P2P_ICE, this.iceP2P)
        this._actions.set(DataType.P2P_OFFER, this.offerP2P)
        this._actions.set(DataType.P2P_ANSWER, this.answerP2P)
    }

    public readonly sendTestP2P = (): void => {
        for (const node of this._nodes.values()) {
            node.channel?.send(`p2p    : test from ${this._uuid}`)
        }
    }

    private sendViaServer (data: Data): void {
        const jsonString = JSON.stringify(data)
        const bytes = new TextEncoder().encode(jsonString)
        this._server.send(bytes)
    }

    private readonly reqP2P = (data: Data): void => {
        if (data.from === undefined) {
            return
        }

        const uuid = data.from
        const connection = new RTCPeerConnection()

        connection.onicecandidate = (ice) => {
            this.sendViaServer({ type: DataType.P2P_ICE, from: this._uuid, to: uuid, data: ice.candidate })
        }

        connection.ondatachannel = (channelEvent) => {
            const node = this._nodes.get(uuid)
            const channel = channelEvent.channel

            channel.onopen = () => {
                log(`p2p    : open ${uuid}`)
                addNode(uuid)
            }
            channel.onclose = () => { log(`p2p: close ${uuid}`) }
            channel.onerror = (error) => { console.log(error) }
            channel.onmessage = (message) => { log(message.data) }

            if (node !== undefined) {
                node.channel = channel
            }
        }

        this._nodes.set(uuid, { connection, channel: undefined })
        this.sendViaServer({ type: DataType.P2P_RES, from: this._uuid, to: uuid, data: undefined })
    }

    private readonly resP2P = (data: Data): void => {
        if (data.from === undefined) {
            return
        }

        const uuid = data.from
        const connection = new RTCPeerConnection()
        const channel = connection.createDataChannel('channel')

        connection.onicecandidate = (ice) => {
            this.sendViaServer({ type: DataType.P2P_ICE, from: this._uuid, to: uuid, data: ice.candidate })
        }

        channel.onopen = () => {
            log(`p2p    : open ${uuid}`)
            addNode(uuid)
        }
        channel.onclose = () => { log(`p2p: close ${uuid}`) }
        channel.onerror = (error) => { console.log(error) }
        channel.onmessage = (message) => { log(message.data) }
        this._nodes.set(uuid, { connection, channel })

        connection.createOffer()
            .then(async (offer) => { await connection.setLocalDescription(offer) })
            .then(() => {
                this.sendViaServer({
                    type: DataType.P2P_OFFER,
                    from: this._uuid,
                    to: uuid,
                    data: connection.localDescription
                })
            }).catch((reason) => { console.log(reason) })
    }

    private readonly iceP2P = (data: Data): void => {
        if (data.from === undefined) {
            return
        }

        const uuid = data.from
        const connection = this._nodes.get(uuid)?.connection

        connection?.addIceCandidate(data.data)
            .catch((reason) => { console.log(reason) })
    }

    private readonly offerP2P = (data: Data): void => {
        if (data.from === undefined) {
            return
        }

        const uuid = data.from
        const connection = this._nodes.get(uuid)?.connection

        connection?.setRemoteDescription(data.data)
            .catch((reason) => { console.log(reason) })

        connection?.createAnswer()
            .then(async (answer) => { await connection.setLocalDescription(answer) })
            .then(() => {
                this.sendViaServer({
                    type: DataType.P2P_ANSWER,
                    from: this._uuid,
                    to: uuid,
                    data: connection.localDescription
                })
            }).catch((reason) => { console.log(reason) })
    }

    private readonly answerP2P = (data: Data): void => {
        if (data.from === undefined) {
            return
        }

        const uuid = data.from
        const connection = this._nodes.get(uuid)?.connection

        connection?.setRemoteDescription(data.data)
            .catch((reason) => { console.log(reason) })
    }
}
