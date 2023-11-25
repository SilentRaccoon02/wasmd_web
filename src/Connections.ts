import type DataObject from './DataObject';

interface IP2P {
    connection: RTCPeerConnection;
    channel: RTCDataChannel;
}

type IAction = (dataObject: DataObject) => void;

export default class Connections {
    private _uuid: string | undefined = undefined;
    private readonly _server: WebSocket = new WebSocket('ws://localhost:2512');
    private readonly _actions = new Map<string, IAction>();

    public constructor () {
        this._server.binaryType = 'arraybuffer';
        this._server.onopen = (event: Event) => { console.log(event); };
        this._server.onclose = (event: CloseEvent) => { console.log(event); };
        this._server.onerror = (event: Event) => { console.log(event); };
        this._server.onmessage = (event: MessageEvent) => {
            const jsonString: string = new TextDecoder().decode(event.data);
            const dataObject: DataObject = JSON.parse(jsonString);
            this._actions.get(dataObject.type)?.(dataObject);
        };

        this._actions.set('uuid', (dataObject: DataObject) => { this._uuid = dataObject.to; });
        this._actions.set('nodes', (dataObject: DataObject) => {
            dataObject.data.forEach((uuid: string) => { this.initP2P(uuid); });
        });
    }

    private sendViaServer (dataObject: DataObject): void {
        const jsonString: string = JSON.stringify(dataObject);
        const bytes: Uint8Array = new TextEncoder().encode(jsonString);
        this._server.send(bytes);
    }

    private initP2P (uuid: string): void {
        console.log(uuid);
    }

    private acceptP2P (dataObject: DataObject): void {

    }
}
