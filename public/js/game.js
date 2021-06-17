const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')
const booster = document.querySelector('.booster')
const sheild = document.querySelector('.sheild')
const score = document.querySelector('.score')
let timePlay = performance.now()
let enemyTime = 700

let keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    w: false,
    a: false,
    s: false,
    d: false,
    W: false,
    A: false,
    S: false,
    D: false
};
let prop = { 
    speed: 4, 
    sheild: false,
    booster: false,
    spikes: false 
};
let play = true

document.addEventListener('keydown', keyDown);
document.addEventListener('keyup', keyUp);

let flames = []
    
function keyDown(e) {
    e.preventDefault();

    if((e.key == "r" || e.key == " " || e.key == "R") && (parseInt(window.getComputedStyle(booster).getPropertyValue('width')) > 10) && (!prop.booster)) {
        prop.speed = 15
        prop.booster = true
        player.radius = 0
        for(let i = 0; i < 160; i++) {
            const size = (Math.random() *5) +1
            flames.push(new Flames(player.x, player.y, size, 'blue'))//`hsl(${Math.random() *360}, 40%, 50%)`))
        }
    }        

    if((e.key == "q" || e.key == "Q") && (!prop.sheild)) prop.sheild = true

    keys[e.key] = true
}

function keyUp(e) {
    e.preventDefault();
    keys[e.key] = false

    if(e.key == " ") {
        prop.booster = false
        prop.speed = 4
        flames = []
        player.radius = 30
    }
}

canvas.width = innerWidth
canvas.height = innerHeight


class Player {
    constructor(x, y, radius, color) {
        this.x = x
        this.y = y
        this.radius = radius
        this.color = color
    }

    draw() {
        c.beginPath()
        c.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false)
        c.fillStyle = this.color
        c.fill()
    }

    update() {

        if ((keys.ArrowUp || keys.w || keys.W) && player.radius - player.y < 0){
            player.y -= prop.speed
        }
    
        if ((keys.ArrowDown || keys.s || keys.S) && player.radius + player.y < canvas.height) {
            player.y += prop.speed
        }
    
        if ((keys.ArrowLeft || keys.a || keys.A) && player.radius - player.x < 0) {
            player.x -= prop.speed
        }
    
        if ((keys.ArrowRight || keys.d || keys.D) && player.radius + player.x < canvas.width) {
            player.x += prop.speed
        }
    }
}

const player = new Player(canvas.width /2, canvas.height /2, 30, 'blue')
let projectiles = []
let enemies = []
let particles = []

class Projectile {
    constructor(x, y, radius, color, velocity) {
        this.x = x
        this.y = y
        this.radius = radius
        this.color = color
        this.velocity = velocity
    }

    draw() {
        c.beginPath()
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

class Enemy {
    constructor(x, y, radius, color, velocity) {
        this.x = x
        this.y = y
        this.radius = radius
        this.color = color
        this.velocity = velocity
    }

    draw() {
        c.beginPath()
        try {
            c.arc(this.x, this.y, this.radius, 0, Math.PI *2, false)
        }
        catch {
            c.arc(this.x, this.y, 0, 0, Math.PI *2, false)
        }
        c.fillStyle = this.color
        c.fill()
    }

    update() {
        this.draw()
        this.x += this.velocity.x
        this.y += this.velocity.y
    }
}

const friction = 0.99

class Particle {
    constructor(x, y, radius, color, velocity) {
        this.x = x
        this.y = y
        this.radius = radius
        this.color = color
        this.velocity = velocity
        this.alpha = 1
    }

    draw() {
        c.save()
        c.globalAlpha = this.alpha
        c.beginPath()
        c.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false)
        c.fillStyle = this.color
        c.fill()
        c.restore()
    }

    update() {
        this.draw()
        this.velocity.x *= friction
        this.velocity.y *= friction
        this.x += this.velocity.x
        this.y += this.velocity.y
        this.alpha -= 0.01
    }
}

class Flames {
    constructor (x, y, size, color) {
        this.x = x
        this.y = y
        this.size = size
        this.color = color
        this.radians = Math.random() * Math.PI *2
        this.velocity = 0.2 
        this.radius = Math.random() * (70 - 0) + 0
        this.lastPlayer = {x: x, y: y}
        this.color = 'rgba(255, 255, 255, 0.35)'
    }

    update() {
        const prev = {x: this.x, y: this.y}
        this.radians += this.velocity;
        this.lastPlayer.x += (player.x - this.lastPlayer.x) *0.5
        this.lastPlayer.y += (player.y - this.lastPlayer.y) *0.5
        this.x = this.lastPlayer.x + Math.cos(this.radians) * this.radius
        this.y = this.lastPlayer.y + Math.sin(this.radians) * this.radius
        this.draw(prev)
    }

    draw(prev) {
        c.beginPath();
        c.strokeStyle = this.color
        c.lineWidth = this.size
        c.moveTo(prev.x, prev.y)
        c.lineTo(this.x, this.y)
        c.stroke()
        c.closePath()
    }
}

function generateEnemies() {

    setInterval(() => { 

    // console.log(performance.now() - timePlay)
    console.log(enemyTime)

        if(performance.now() - timePlay >= 4000) {
            // console.log('here')
            timePlay = performance.now()
            enemyTime = (enemyTime <= 200) ? 200 : enemyTime -30
        }

        if(play) {
            let radius = Math.random() * (30 - 7) + 7
            let x, y

            if(radius < 0) radius = 0

            if(Math.random() < 0.5) {
                x = Math.random() < 0.5 ? 0 - radius : canvas.width + radius
                y = Math.random() * canvas.height
            }
            else {
                y = Math.random() < 0.5 ? 0 - radius : canvas.height + radius
                x = Math.random() * canvas.width 
            }

            const color = `hsl(${Math.random() * 360}, 50%, 50%)`
            let angle = Math.atan2(player.y -y, player.x -x)
            const velocity = {
                x: Math.cos(angle),
                y: Math.sin(angle)
            }
            
            enemies.push(new Enemy(x, y, radius, color, velocity))
        }

        
    }, enemyTime)
}

let animationId
let points = 0

function animate() {
    animationId = requestAnimationFrame(animate)
    c.fillStyle = 'rgba(0, 0, 0, 0.2)'
    c.fillRect(0, 0, canvas.width, canvas.height)

    if(play) {
        player.draw()
        player.update()
    }
    particles.forEach((particle, index) => {

        if(particle.alpha <= 0) particles.splice(index, 1)
        else particle.update()
    })

    if(prop.booster) {
        flames.forEach(flame => {
            flame.update()
        })
    }
    else {
        flames = []
    }

    projectiles.forEach((proj, index) => {
        proj.update()

        if(proj.x + proj.radius < 0 || proj.x - proj.radius > canvas.width || proj.y + proj.radius < 0 || proj.y - proj.radius > canvas.height) {
            setTimeout(() => {
                projectiles.splice(index, 1)
            }, 0)
        }
    })

    enemies.forEach((enemy, enemyIndex) => {
        enemy.update()

        // booster kill
        if((prop.speed == 15)) {

            if(Math.hypot(player.x - enemy.x, player.y - enemy.y) - player.radius - enemy.radius < 120) {
                angle = Math.atan2(player.y - enemy.y, player.x - enemy.x)

                enemy.velocity.x = 5* Math.cos(angle)
                enemy.velocity.y = 5* Math.sin(angle)
                enemy.radius -= 0.2

                if(Math.hypot(player.x - enemy.x, player.y - enemy.y) - player.radius - enemy.radius < 35) {

                    // explosion
                    for(let i = 0; i < enemy.radius *2; i++) {
                        particles.push(new Particle(enemy.x, enemy.y, Math.random() *2, enemy.color, 
                            { x: (Math.random() -0.5) * (Math.random() *6),
                              y: (Math.random() -0.5) * (Math.random() *6)}))
                    }
                    
                    setTimeout(() => {
                        enemies.splice(enemyIndex, 1)
                    }, 0)
        
                    // bursting enemy and score
                    if(enemy.radius > 15) {
                        points += 60
                        score.innerText = points
                    }
                    else {
                        points += 20
                        score.innerText = points
                    }
                } 
            }
        }

        // sheild kill
        if((Math.hypot(player.x - enemy.x, player.y - enemy.y) - player.radius - enemy.radius < 1) && (prop.sheild)) {
            
            // explosion
            for(let i = 0; i < enemy.radius *2; i++) {
                particles.push(new Particle(enemy.x, enemy.y, Math.random() *2, enemy.color, 
                { x: (Math.random() -0.5) * (Math.random() *6),
                    y: (Math.random() -0.5) * (Math.random() *6)}))
                }

            setTimeout(() => {
                    enemies.splice(enemyIndex, 1)
            }, 0)

            // bursting enemy and score
            if(enemy.radius > 15) {
                points += 60
                score.innerText = points
            }
            else {
                points += 20
                score.innerText = points
            }
            setTimeout(() => {
                prop.sheild = false
            }, 5000)
        }
        
        // game over
        if((((Math.hypot(player.x - enemy.x, player.y - enemy.y) - player.radius - enemy.radius < 1) && (prop.speed != 15) && !prop.sheild)) || player.radius < 0){
            player.radius = 0
            play = false
            setTimeout(() => {
                document.querySelector('.notify').style.display = 'block'
                cancelAnimationFrame(animationId)
            }, 600)
        }
        
        // projectile hitting enemy
        projectiles.forEach((projectile, projectileIndex) => {

            if (Math.hypot(projectile.x - enemy.x, projectile.y - enemy.y) - projectile.radius - enemy.radius < 1) {

                // explosion
                for(let i = 0; i < enemy.radius *2; i++) {
                    particles.push(new Particle(projectile.x, projectile.y, Math.random() *2, enemy.color, 
                        { x: (Math.random() -0.5) * (Math.random() *6),
                          y: (Math.random() -0.5) * (Math.random() *6)}))
                }

                // bursting enemy and score
                if(enemy.radius - 10 > 5) {
                    points += 10
                    score.innerText = points
                    gsap.to(enemy, { 
                        radius: enemy.radius - 10
                    })
                    // enemy.radius -= 10
                    setTimeout(() => {
                        projectiles.splice(projectileIndex, 1)
                    }, 0)
                }
                else {
                    points += 20
                    score.innerText = points
                    setTimeout(() => {
                        enemies.splice(enemyIndex, 1)
                        projectiles.splice(projectileIndex, 1)
                    }, 0)
                }
            }
        })

        if(enemy.x + enemy.radius < 0 || enemy.x - enemy.radius > canvas.width || enemy.y + enemy.radius < 0 || enemy.y - enemy.radius > canvas.height) {
            setTimeout(() => {
                enemies.splice(enemyIndex, 1)
            }, 0)
        }
    })
}

document.addEventListener('mousedown', shoot) 

function shoot(e) {
    const angle = Math.atan2(e.clientY - player.y, e.clientX - player.x)
    const velocity = {
        x: 8 * Math.cos(angle),
        y: 8 * Math.sin(angle)
    }
    projectiles.push(
        new Projectile(player.x, player.y, 5, 'red', velocity)
    )
    const audio = new Audio("https://s3-us-west-2.amazonaws.com/s.cdpn.io/630634/bubble.mp3")
    audio.play()
}

animate()
generateEnemies(enemyTime)

function restart() {
    document.querySelector('.notify').style.display = 'none'
    player.radius = 30
    prop.booster = false
    booster.style.width = 100 + "%"
    particles = []
    enemies = []
    projectiles = []
    player.x = innerWidth /2
    player.y = innerHeight /2
    score.innerText = 0
    points = 0
    play = true
    timePlay = performance.now()
    enemyTime = 700
    animate()
}





