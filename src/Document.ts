export function log (str: string, cls: string = 'log'): void {
    const logs = document.getElementById('logs')
    const count = logs?.childElementCount ?? 0

    if (count >= 20) { logs?.removeChild(logs.children[0]) }

    const log = document.createElement('div')
    log.className = cls
    log.innerText = `> ${str}`
    logs?.appendChild(log)
}
