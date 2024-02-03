export enum DataType {
    NODE_UUID = 'node-uuid',
    NODE_LIST = 'node-list',
    NODE_CLOSE = 'node-close',

    P2P_REQ = 'p2p-req',
    P2P_RES = 'p2p-res',
    P2P_ICE = 'p2p-ice',
    P2P_OFFER = 'p2p-offer',
    P2P_ANSWER = 'p2p-answer',
    P2P_TEST = 'p2p-test'
}

export interface Data {
    type: DataType
    from: string | undefined
    to: string
    data: any | undefined
}

export interface State {
    signaling: RTCSignalingState | undefined
    connection: RTCPeerConnectionState | undefined
}

export interface ExtendedModule extends EmscriptenModule {
    cwrap: typeof cwrap
    addFunction: typeof addFunction
}
