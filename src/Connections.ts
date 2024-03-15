import { DataType, type Data, type ConnectionState, type IAction } from './Interfaces'
import { v4 as uuidv4 } from 'uuid'

interface IP2P {
    connection: RTCPeerConnection | undefined
    channel: RTCDataChannel | undefined
}

interface IStorages {
    type: DataType
    from: string
    current: number
    chunks: string[]
    time: number
}

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

    private static readonly chunkSize = 1024 * 128

    private _uuid: string | undefined
    private readonly _server = new WebSocket(`ws://${window.location.host}`)
    private readonly _nodes = new Map<string, IP2P>()
    private readonly _actions = new Map<DataType, IAction>()
    private readonly _storages = new Map<string, IStorages>()

    public onUUID = (uuid: string): void => {}
    public onOpen = (uuid: string): void => {}
    public onAddLog = (text: string): void => {}
    public onAddNode = (uuid: string): void => {}
    public onRemoveNode = (uuid: string): void => {}
    public onUpdateState = (uuid: string, state: ConnectionState): void => {}
    public onReceiveViaP2P = (data: Data): void => {}

    public constructor () {
        this._server.binaryType = 'arraybuffer'
        this._server.onopen = () => { this.onAddLog('websocket opened') }
        this._server.onclose = () => { this.onAddLog('websocket closed') }
        this._server.onerror = (error) => { console.log(error) }
        this._server.onmessage = (message) => {
            const jsonString = new TextDecoder().decode(message.data)
            const data = JSON.parse(jsonString)
            this._actions.get(data.type)?.(data)
        }

        this._actions.set(DataType.NODE_UUID, (data) => {
            this._uuid = data.to
            this.onUUID(data.to)
        })
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
        this._actions.set(DataType.P2P_CHUNK, this.onChunkP2P)
        this._actions.set(DataType.P2P_SPEED, this.onSpeedP2P)
        this._actions.set(DataType.FILE_PROCESS, this.receiveViaP2P)
        this._actions.set(DataType.FILE_RESULT, this.receiveViaP2P)
        this._actions.set(DataType.MODULE_STATE, this.receiveViaP2P)
    }

    public sendViaServer (type: DataType, to: string, data: any): void {
        const jsonString = JSON.stringify({ type, from: this._uuid, to, data })
        const bytes = new TextEncoder().encode(jsonString)
        this._server.send(bytes)
    }

    public sendViaP2P (type: DataType, to: string, data: any, chunk = false): void {
        if (to === '') {
            for (const uuid of this._nodes.keys()) {
                this.sendViaP2P(type, uuid, data)
            }

            return
        }

        const node = this._nodes.get(to)
        if (node === undefined) { return }
        if (node.connection?.connectionState !== 'connected') { return }

        const jsonData = chunk ? '' : JSON.stringify(data)

        if (jsonData.length > Connections.chunkSize) {
            const storageId = uuidv4()
            const count = Math.floor(jsonData.length / Connections.chunkSize)
            const last = jsonData.length - count * Connections.chunkSize

            const chunks = new Array<string>(count + 1)
            let offset = 0

            for (let i = 0; i < count; ++i) {
                chunks[i] = jsonData.substring(offset, offset + Connections.chunkSize)
                offset += Connections.chunkSize
            }

            chunks[count] = jsonData.substring(offset, offset + last)

            const sendChunk = (current: number, value: string): void => {
                if (node.channel !== undefined &&
                    node.channel.bufferedAmount > node.channel.bufferedAmountLowThreshold) {
                    const callback = (): void => {
                        if (node.channel === undefined) { return }
                        node.channel.removeEventListener('bufferedamountlow', callback)
                        sendChunk(current, value)
                    }

                    node.channel.addEventListener('bufferedamountlow', callback)
                    return
                }

                this.sendViaP2P(DataType.P2P_CHUNK, to,
                    { storageId, type, total: count + 1, current, value, time: Date.now() }, true)
            }

            for (let current = 0; current < chunks.length; ++current) {
                sendChunk(current, chunks[current])
            }

            return
        }

        const jsonString = JSON.stringify({ type, from: this._uuid, to, data })
        const bytes = new TextEncoder().encode(jsonString)
        node.channel?.send(bytes)
    }

    private readonly onReqP2P = (data: Data): void => {
        if (data.from === undefined) { return }

        const uuid = data.from
        const connection = new RTCPeerConnection(Connections.configuration)

        connection.onicecandidate = (ice) => {
            this.sendViaServer(DataType.P2P_ICE, uuid, ice.candidate)
            const candidate = ice.candidate?.candidate

            if (candidate !== undefined) {
                this.onAddLog(`ice > ${candidate.substring(10)}`)
            } else {
                this.onAddLog('ice > no candidates left')
            }
        }

        connection.ondatachannel = (channelEvent) => {
            const node = this._nodes.get(uuid)
            const channel = channelEvent.channel
            channel.binaryType = 'arraybuffer'

            channel.onopen = () => {
                this.onOpen(uuid)
                this.onAddLog(`connection opened ${uuid}`)
            }

            channel.onclose = () => { this.onAddLog(`connection closed ${uuid}`) }
            channel.onerror = (error) => { console.log(error) }
            channel.onmessage = this.onChannelMessage

            if (node !== undefined) { node.channel = channel }
        }

        connection.onsignalingstatechange = () => {
            this.onUpdateState(uuid, {
                signaling: connection.signalingState,
                connection: connection.connectionState,
                speed: undefined
            })
        }

        connection.onconnectionstatechange = () => {
            this.onUpdateState(uuid, {
                signaling: connection.signalingState,
                connection: connection.connectionState,
                speed: undefined
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
        channel.binaryType = 'arraybuffer'

        connection.onicecandidate = (ice) => {
            this.sendViaServer(DataType.P2P_ICE, uuid, ice.candidate)
            const candidate = ice.candidate?.candidate

            if (candidate !== undefined) {
                this.onAddLog(`ice > ${candidate.substring(10)}`)
            } else {
                this.onAddLog('ice > no candidates left')
            }
        }

        connection.onsignalingstatechange = () => {
            this.onUpdateState(uuid, {
                signaling: connection.signalingState,
                connection: connection.connectionState,
                speed: undefined
            })
        }

        connection.onconnectionstatechange = () => {
            this.onUpdateState(uuid, {
                signaling: connection.signalingState,
                connection: connection.connectionState,
                speed: undefined
            })
        }

        channel.onopen = () => {
            this.onOpen(uuid)
            this.onAddLog(`connection opened ${uuid}`)
        }

        channel.onclose = () => { this.onAddLog(`connection closed ${uuid}`) }
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
        const candidate = data.data?.candidate

        if (candidate !== undefined) {
            this.onAddLog(`ice < ${candidate.substring(10)}`)
        } else {
            this.onAddLog('ice < no candidates left')
        }

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

    private readonly onChunkP2P = (data: Data): void => {
        if (data.from === undefined) { return }

        if (this._storages.get(data.data.storageId) === undefined) {
            this._storages.set(data.data.storageId, {
                type: data.data.type,
                from: data.from,
                current: 0,
                chunks: new Array<string>(data.data.total),
                time: -1
            })
        }

        const storage = this._storages.get(data.data.storageId)
        if (storage === undefined) { return }

        storage.chunks[data.data.current] = data.data.value
        storage.current++

        if (storage.time === -1) {
            storage.time = data.data.time
        }

        if (storage.current === storage.chunks.length) {
            const result = storage.chunks.join('')
            const seconds = (Date.now() - storage.time) / 1000
            const megabytes = result.length / (1024 * 1024)
            const speed = megabytes / seconds

            this.onUpdateState(data.from, {
                signaling: undefined,
                connection: undefined,
                speed
            })

            this.sendViaP2P(DataType.P2P_SPEED, storage.from, speed)
            if (this._uuid === undefined) { return }

            this.onReceiveViaP2P({
                type: storage.type,
                from: storage.from,
                to: this._uuid,
                data: JSON.parse(result)
            })

            this._storages.delete(data.data.storageId)
        }
    }

    private readonly onSpeedP2P = (data: Data): void => {
        if (data.from === undefined) { return }

        this.onUpdateState(data.from, {
            connection: undefined,
            signaling: undefined,
            speed: data.data
        })
    }

    private readonly onChannelMessage = (message: MessageEvent): void => {
        const jsonString = new TextDecoder().decode(message.data)
        const data = JSON.parse(jsonString)
        this._actions.get(data.type)?.(data)
    }

    private readonly receiveViaP2P = (data: Data): void => {
        if (data.from !== undefined) { this.onReceiveViaP2P(data) }
    }
}
