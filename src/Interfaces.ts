export enum DataType {
    SET_UUID = 'set-uuid',
    NODE_UUID = 'node-uuid',
    NODE_LIST = 'node-list',
    NODE_CLOSE = 'node-close',
    SERVER_UUID = 'server-uuid',
    SERVER_LIST = 'server-list',

    P2P_REQ = 'p2p-req',
    P2P_RES = 'p2p-res',
    P2P_ICE = 'p2p-ice',
    P2P_OFFER = 'p2p-offer',
    P2P_ANSWER = 'p2p-answer',
    P2P_CHUNK = 'p2p-chunk',
    P2P_COMPLETE = 'p2p-complete',
    P2P_SPEED = 'p2p-speed',

    FILE_PROCESS = 'file-process',
    FILE_RESULT = 'file-result',
    MODULE_STATE = 'module-state',

    WS_COMPLETE = 'ws-complete',
    WS_SPEED = 'ws-speed'
}

export interface Data {
    type: DataType
    from: string | undefined
    to: string
    data: any | undefined
}

export type IAction = (data: Data) => void

export interface ConnectionState {
    signaling: RTCSignalingState | undefined
    connection: RTCPeerConnectionState | undefined
    speed: number | undefined
}

export interface ModuleState {
    queued: number
    complete: number
    benchmark: number
}

export interface SchedulerState {
    deviation: number
    thresh: number
}

export interface ExtendedModule extends EmscriptenModule {
    lengthBytesUTF8: typeof lengthBytesUTF8
    stringToUTF8: typeof stringToUTF8
    setValue: typeof setValue
    cwrap: typeof cwrap
    FS: typeof FS
}
