export function log (str: string): void {
    const logs = document.getElementById('logs')
    const log = document.createElement('div')
    const text = document.createTextNode(`> ${str}`)
    log.className = 'log'
    log.appendChild(text)
    logs?.appendChild(log)

    const bottom = document.getElementById('bottom')
    bottom?.scrollIntoView()
}

export function addNode (uuid: string): void {
    const nodes = document.getElementById('nodes')
    const node = document.createElement('div')
    const text = document.createTextNode(uuid)
    node.className = 'node'
    node.id = uuid
    node.appendChild(text)
    nodes?.appendChild(node)
}

export function removeNode (uuid: string): void {
    const node = document.getElementById(uuid)
    node?.remove()
}
