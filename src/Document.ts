import { type State } from './Interfaces'

export function log (str: string, cls: string = 'log'): void {
    const logs = document.getElementById('logs')
    const count = logs?.childElementCount ?? 0

    if (count >= 20) { logs?.removeChild(logs.children[0]) }

    const log = document.createElement('div')
    log.className = cls
    log.innerText = `> ${str}`
    logs?.appendChild(log)
}

export function updateStates (states: Map<string, State>): void {
    const nodes = document.getElementById('nodes')

    if (nodes?.children !== undefined) {
        for (const node of nodes.children) {
            if (!states.has(node.id)) { node.remove() }
        }
    }

    for (const entry of states.entries()) {
        const text = `${entry[0]} ${entry[1].signaling} ${entry[1].connection}`
        let node = document.getElementById(entry[0])

        if (node === null) {
            node = document.createElement('div')
            node.className = 'node'
            node.id = entry[0]
            nodes?.appendChild(node)
        }

        node.innerText = text
    }
}
