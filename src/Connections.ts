import type DataObject from './DataObject';

export default class Connections {
    private _uuid: string | undefined;
    private readonly _server: WebSocket;
    private readonly _actions: any;

    public constructor () {
        this._uuid = undefined;
        this._server = new WebSocket('ws://localhost:2512');
        this._server.binaryType = 'arraybuffer';

        this._server.onopen = (event: Event) => { console.log(event); };
        this._server.onclose = (event: CloseEvent) => { console.log(event); };
        this._server.onerror = (event: Event) => { console.log(event); };
        this._server.onmessage = (event: MessageEvent) => {
            const jsonString: string = new TextDecoder().decode(event.data);
            const dataObject: DataObject = JSON.parse(jsonString);
            this._actions[dataObject.type]?.(dataObject);
        };

        this._actions = {
            uuid: (dataObject: DataObject) => { this._uuid = dataObject.to; }
        };
    }

    private sendViaServer (dataObject: DataObject): void {
        const jsonString: string = JSON.stringify(dataObject);
        const bytes: Uint8Array = new TextEncoder().encode(jsonString);
        this._server.send(bytes);
    }
}
