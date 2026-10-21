/** Selfie de exemplo desenhada no navegador (ilustração, não é foto de ninguém). */
export function sampleSelfie(): string {
    const canvas = document.createElement('canvas')
    canvas.width = 480
    canvas.height = 600
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''
    ctx.fillStyle = '#dfe7f3'
    ctx.fillRect(0, 0, 480, 600)
    ctx.fillStyle = '#c7d3e6'
    ctx.fillRect(0, 430, 480, 170)
    // ombros
    ctx.fillStyle = '#3b5b8c'
    ctx.beginPath()
    ctx.ellipse(240, 600, 190, 150, 0, Math.PI, 0)
    ctx.fill()
    // pescoço
    ctx.fillStyle = '#c98f6b'
    ctx.fillRect(208, 380, 64, 70)
    // cabelo atrás
    ctx.fillStyle = '#b9b4ad'
    ctx.beginPath()
    ctx.ellipse(240, 270, 140, 160, 0, 0, Math.PI * 2)
    ctx.fill()
    // rosto
    ctx.fillStyle = '#d9a07b'
    ctx.beginPath()
    ctx.ellipse(240, 285, 105, 130, 0, 0, Math.PI * 2)
    ctx.fill()
    // franja
    ctx.fillStyle = '#b9b4ad'
    ctx.beginPath()
    ctx.ellipse(240, 185, 110, 55, 0, Math.PI, 0)
    ctx.fill()
    // olhos
    ctx.fillStyle = '#2b2b2b'
    for (const x of [200, 280]) {
        ctx.beginPath()
        ctx.arc(x, 275, 7, 0, Math.PI * 2)
        ctx.fill()
    }
    // sorriso
    ctx.strokeStyle = '#8a4b3a'
    ctx.lineWidth = 5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.arc(240, 330, 34, 0.15 * Math.PI, 0.85 * Math.PI)
    ctx.stroke()
    return canvas.toDataURL('image/jpeg', 0.85)
}

export function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error('Não foi possível ler a foto.'))
        reader.readAsDataURL(file)
    })
}
