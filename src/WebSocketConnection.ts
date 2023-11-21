import type DataObject from './DataObject';

export default class WebSocketConnection {
    private readonly _webSocket: WebSocket;

    public constructor () {
        this._webSocket = new WebSocket('ws://localhost:2512');
        this._webSocket.binaryType = 'arraybuffer';
        this.bind();
    }

    private bind (): void {
        this._webSocket.onopen = (event: Event) => {
            console.log(event);
        };

        this._webSocket.onclose = (event: CloseEvent) => {
            console.log(event);
        };

        this._webSocket.onmessage = (event: MessageEvent) => {
            const jsonString: string = new TextDecoder().decode(event.data);
            const dataObject: DataObject = JSON.parse(jsonString);
            console.log(dataObject);
        };
    }
}
