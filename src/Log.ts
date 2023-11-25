export default function log (str: string): void {
    const logs = document.getElementById('logs')
    const log = document.createElement('div')
    log.className = 'log'
    log.appendChild(document.createTextNode(`> ${str}`))
    logs?.appendChild(log)
}
