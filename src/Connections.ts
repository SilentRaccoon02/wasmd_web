import { DataType, type Data, type ConnectionState } from './Interfaces'

interface IP2P {
    connection: RTCPeerConnection | undefined
    channel: RTCDataChannel | undefined
}

type IAction = (data: Data) => void

export class Connections {
    private static readonly configuration = {
        iceServers: [
            {
                urls: `turn:${window.location.hostname}:3478`,
                username: 'user',
                credential: 'password'
            }
        ]
    }

    private _uuid: string | undefined = undefined
    private readonly _server = new WebSocket(`ws://${window.location.host}`)
    private readonly _nodes = new Map<string, IP2P>()
    private readonly _actions = new Map<DataType, IAction>()

    public onAddLog = (text: string): void => {}
    public onAddNode = (uuid: string): void => {}
    public onRemoveNode = (uuid: string): void => {}
    public onUpdateState = (uuid: string, state: ConnectionState): void => {}

    public constructor () {
        this._server.binaryType = 'arraybuffer'
        this._server.onopen = () => { this.onAddLog('ws: open') }
        this._server.onclose = () => { this.onAddLog('ws: close') }
        this._server.onerror = (error) => { console.log(error) }
        this._server.onmessage = (message) => {
            const jsonString = new TextDecoder().decode(message.data)
            const data = JSON.parse(jsonString)
            this._actions.get(data.type)?.(data)
        }

        this._actions.set(DataType.NODE_UUID, (data) => { this._uuid = data.to })
        this._actions.set(DataType.NODE_LIST, (data) => {
            data.data.forEach((uuid: string) => {
                this.sendViaServer(DataType.P2P_REQ, uuid, undefined)
                this._nodes.set(uuid, { connection: undefined, channel: undefined })
                this.onAddNode(uuid)
            })
        })
        this._actions.set(DataType.NODE_CLOSE, (data) => {
            const uuid = data.data
            this.onAddLog(`ws: close ${uuid}`)
            this._nodes.delete(uuid)
            this.onRemoveNode(uuid)
        })
        this._actions.set(DataType.P2P_REQ, this.onReqP2P)
        this._actions.set(DataType.P2P_RES, this.onResP2P)
        this._actions.set(DataType.P2P_ICE, this.onIceP2P)
        this._actions.set(DataType.P2P_OFFER, this.onOfferP2P)
        this._actions.set(DataType.P2P_ANSWER, this.onAnswerP2P)
        this._actions.set(DataType.P2P_TEST, (data) => {
            if (data.from === undefined) { return }
            this.onAddLog(`p2p: test ${data.from}`)
        })
    }

    public sendViaServer (type: DataType, to: string, data: any): void {
        const jsonString = JSON.stringify({ type, from: this._uuid, to, data })
        const bytes = new TextEncoder().encode(jsonString)
        this._server.send(bytes)
    }

    public sendViaP2P (type: DataType, to: string, data: any): void {
        if (to === '') {
            for (const uuid of this._nodes.keys()) {
                this.sendViaP2P(type, uuid, data)
            }
        } else {
            const node = this._nodes.get(to)
            if (node === undefined) { return }
            if (node.connection?.connectionState !== 'connected') { return }

            const jsonString = JSON.stringify({ type, from: this._uuid, to, data })
            const bytes = new TextEncoder().encode(jsonString)
            node.channel?.send(bytes)
        }
    }

    private readonly onReqP2P = (data: Data): void => {
        if (data.from === undefined) { return }

        const uuid = data.from
        const connection = new RTCPeerConnection(Connections.configuration)

        connection.onicecandidate = (ice) => {
            this.onAddLog(`ice: > ${ice.candidate?.candidate}`)
            this.sendViaServer(DataType.P2P_ICE, uuid, ice.candidate)
        }

        connection.ondatachannel = (channelEvent) => {
            const node = this._nodes.get(uuid)
            const channel = channelEvent.channel

            channel.onopen = () => { this.onAddLog(`p2p: open ${uuid}`) }
            channel.onclose = () => { this.onAddLog(`p2p: close ${uuid}`) }
            channel.onerror = (error) => { console.log(error) }
            channel.onmessage = this.onChannelMessage

            if (node !== undefined) { node.channel = channel }
        }

        connection.onsignalingstatechange = () => {
            this.onUpdateState(uuid, {
                signaling: connection.signalingState,
                connection: connection.connectionState
            })
        }

        connection.onconnectionstatechange = () => {
            this.onUpdateState(uuid, {
                signaling: connection.signalingState,
                connection: connection.connectionState
            })
        }

        this.onAddNode(uuid)
        this._nodes.set(uuid, { connection, channel: undefined })
        this.sendViaServer(DataType.P2P_RES, uuid, undefined)
    }

    private readonly onResP2P = (data: Data): void => {
        if (data.from === undefined) { return }

        const uuid = data.from
        const connection = new RTCPeerConnection(Connections.configuration)
        const channel = connection.createDataChannel('channel')

        connection.onicecandidate = (ice) => {
            this.onAddLog(`ice: > ${ice.candidate?.candidate}`)
            this.sendViaServer(DataType.P2P_ICE, uuid, ice.candidate)
        }

        connection.onsignalingstatechange = () => {
            this.onUpdateState(uuid, {
                signaling: connection.signalingState,
                connection: connection.connectionState
            })
        }

        connection.onconnectionstatechange = () => {
            this.onUpdateState(uuid, {
                signaling: connection.signalingState,
                connection: connection.connectionState
            })
        }

        channel.onopen = () => { this.onAddLog(`p2p: open ${uuid}`) }
        channel.onclose = () => { this.onAddLog(`p2p: close ${uuid}`) }
        channel.onerror = (error) => { console.log(error) }
        channel.onmessage = this.onChannelMessage
        this._nodes.set(uuid, { connection, channel })

        connection.createOffer()
            .then(async (offer) => { await connection.setLocalDescription(offer) })
            .then(() => {
                this.sendViaServer(DataType.P2P_OFFER, uuid, connection.localDescription)
            }).catch((reason) => { console.log(reason) })
    }

    private readonly onIceP2P = (data: Data): void => {
        if (data.from === undefined) { return }

        const uuid = data.from
        const connection = this._nodes.get(uuid)?.connection
        this.onAddLog(`ice: < ${data.data?.candidate}`)

        connection?.addIceCandidate(data.data)
            .catch((reason) => { console.log(reason) })
    }

    private readonly onOfferP2P = (data: Data): void => {
        if (data.from === undefined) { return }

        const uuid = data.from
        const connection = this._nodes.get(uuid)?.connection

        connection?.setRemoteDescription(data.data)
            .catch((reason) => { console.log(reason) })

        connection?.createAnswer()
            .then(async (answer) => { await connection.setLocalDescription(answer) })
            .then(() => {
                this.sendViaServer(DataType.P2P_ANSWER, uuid, connection.localDescription)
            }).catch((reason) => { console.log(reason) })
    }

    private readonly onAnswerP2P = (data: Data): void => {
        if (data.from === undefined) { return }

        const uuid = data.from
        const connection = this._nodes.get(uuid)?.connection

        connection?.setRemoteDescription(data.data)
            .catch((reason) => { console.log(reason) })
    }

    private readonly onChannelMessage = (message: MessageEvent): void => {
        const jsonString = new TextDecoder().decode(message.data)
        const data = JSON.parse(jsonString)
        this._actions.get(data.type)?.(data)
    }
}
