// @ts-expect-error emscripten
import Module from './wasm/module';
import Connections from './Connections';

interface EmscriptenModule {
    cwrap: typeof cwrap;
    addFunction: typeof addFunction;
}

type IAdd = (_0: number, _1: number) => number;
type IRun = (_0: string) => void;

Module().then((module: EmscriptenModule) => {
    const add: IAdd = module.cwrap('add', 'number', ['number', 'number']);
    console.log(`add: ${add(25.0, 12.0)}`);
    const multiply: number = module.addFunction((a: number, b: number) => { return a * b; }, 'fff');
    const run: IRun = module.cwrap('run', null, ['string']);
    run(multiply.toString());
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const connections: Connections = new Connections();
