import Module from './wasm/wasmd_cpp';

Module().then((module) => {
    const add = module.cwrap('add', 'number', ['number', 'number']);
    const result = add(25, 12);
    console.log(result);
});
