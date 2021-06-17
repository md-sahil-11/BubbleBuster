function ready() {
    const bubbleImage = document.querySelector('.bubble-img')
    const about = document.querySelector('.about')
    const help = document.querySelector('.help')
    const canvas = document.querySelector('canvas')
    const c = canvas.getContext('2d')

    canvas.height = parseInt(window.getComputedStyle(about).getPropertyValue('height'))
    canvas.width = innerWidth

    console.log(canvas.height)

    let interval
    let bubbles = []

    bubbleImage.addEventListener('mouseout', oscillate)

    function oscillate() {
        let up = true
        interval = setInterval(() => {

            if(up) {
                bubbleImage.style.top = 125 + "px"
                up = false
            }
            else {
                bubbleImage.style.top = 130 + "px"
                up = true
            }
        }, 500)
    }

    oscillate()

    bubbleImage.addEventListener('mouseover', () => {
        bubbleImage.style.top = 128 + "px"
        clearInterval(interval)

    })

    help.addEventListener('click', () => {
        window.location.href = '/help'
    })

    // canvas animation

    class Bubble {
        constructor(x, y, radius, color, velocity) {
            this.x = x
            this.y = y
            this.radius = radius
            this.color = color
            this.velocity = velocity
        }

        draw() {
            c.beginPath()
            c.globalAlpha = 0.7
            c.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false)
            c.fillStyle = this.color
            c.fill()
        }

        update() {
            this.draw()
            this.x += this.velocity.x
            this.y += this.velocity.y
        }
    }

    function generateBubble() {
        setInterval(() => {
            // const radius = Math.random() *(21 -10) +10
            const radius = 20
            let x, y

            y = Math.random() < 0.5 ? 0 - radius : canvas.height + radius
            x = Math.random() * (canvas.width - canvas.width /2) + canvas.width /2

            let color = Math.random() <= 0.5 ? '#1bbc96' : '#f8f5f5'
            let dest = Math.random() * (14 /16 * canvas.width - 11 /16 * canvas.width) + canvas.width * 11 /16
            let angle = Math.atan2(canvas.height /2 - y, dest - x)
            const velocity = {
                x: Math.cos(angle),
                y: Math.sin(angle)
            }

            bubbles.push(new Bubble(x, y, radius, color, velocity))
        }, 150)
    }

    document.addEventListener('mousemove', response)

    function response(e) {
        bubbles.forEach((bubble, index) => {
            const dist = Math.hypot(e.clientX - bubble.x, e.clientY - bubble.y)

            if(dist < 200) {
                bubble.velocity.x *= 1.05
                bubble.velocity.y *= 1.05
            }
        })
    }
    
    function animate() {
        animationId = requestAnimationFrame(animate)
        c.fillStyle = 'rgba(24, 27, 26)'
        c.fillRect(0, 0, canvas.width, canvas.height)

        bubbles.forEach((bubble, index) => {
            bubble.update()

            if((bubble.radius - bubble.y > canvas.height) || bubble.radius + bubble.y < 0) {
                bubbles.splice(index, 1)
            }
        })
    }
    animate()
    generateBubble()
}