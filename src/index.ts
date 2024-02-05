// @ts-expect-error emscripten
import Module from './wasm/module'

import './styles.css'
import { App } from './App'
import { type ExtendedModule } from './Interfaces'

Module().then((module: ExtendedModule) => {
    // eslint-disable-next-line
    const app = new App(module)
})
