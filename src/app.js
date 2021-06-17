const express = require('express')
const path = require('path')
const app = express()
const url = require('url')
const bodyParser = require('body-parser')
const serv = require('http').createServer(app)
const io = require('socket.io')(serv, {})

const port = 8000

const static_path = path.join(__dirname, '../public')
const template_path = path.join(__dirname, '../templates')

app.set('view engine', 'hbs')
app.set('views', template_path)

app.use(express.static(static_path))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.get('/', (req, res) => {
    res.render('1_hero')
})

app.get('/landing', (req, res) => {
    res.render('2_landing')
})

app.get('/help', (req, res) => {
    res.render('help')
})

app.post('/name', (req, res) => {
    res.redirect(url.format({
        pathname: '/menu',
        query: req.body
    }))
})

app.post('/menu', (req, res) => {
    let room  = true

    if (req.body.roomname == '') room = false
    res.render('3_menu', {
        username: req.body.username,
        room: room,
        roomname: req.body.roomname
    })
})

app.get('/singlePlayer', (req, res) => {
    res.render('single')
})

app.get('/room/:user', (req, res) => {
    res.render('lobby', {
        username: req.params.user
    })
})

const rooms = {}
const roomName = []

app.get('/bubbleBuster/:user/:room', (req, res) => {
    res.render('prototype', {
        player: req.params.user,
        room: req.params.room
    })
})

class Player {
    constructor(x, y, id, room, team) {
        this.id = id
        this.team = team
        this.room = room
        this.x = x
        this.y = y
        this.radius = 30
        this.color = team == 'red' ? 'rgba(255, 0, 0, 0.8)' : 'rgba(0, 0, 255, 0.8)'
        this.speed = 2
        this.alive = true
        this.sheild = false
        this.keys = {
            right: false,
            left: false,
            up: false,
            down: false
        }
        this.armour = 50
        this.strokeStyle = 'rgba(255, 255, 255, 1)'
        this.lineWidth = 0
    }

    update() {

        if(this.armour <= 0) this.sheild = false

        if(this.sheild) this.armour -= 0.01
        else checkArrowColision(this)

        if(this.radius <= 8) {

            if(this.team == 'red') {
                rooms[this.room].Blue.score += 2
            }
            else if(this.team == 'blue') rooms[this.room].Red.score += 2

            playerRemove(this)
        }

        if ((this.keys.up) && (this.radius - this.y < 0)) {
            
            if(blockColision(this, 'u', this.room))
                this.y -= this.speed
            if(playerSpike(this)) {
                createParticles(this, this, this.room)
                playerRemove(this)
            }
        }
    
        if ((this.keys.down) && (this.radius + this.y < rooms[this.room].canvasHeight)) {

            if(blockColision(this, 'b', this.room))
                this.y += this.speed
            if(playerSpike(this)) {
                createParticles(this, this, this.room)
                playerRemove(this)
            }
        }
    
        if ((this.keys.left) && (this.radius - this.x < 0)) {

            if(blockColision(this, 'l', this.room))
                this.x -= this.speed
            if(playerSpike(this)) {
                createParticles(this, this, this.room)
                playerRemove(this)
            }
        }
    
        if ((this.keys.right) && (this.radius + this.x < rooms[this.room].canvasWidth)) {
    
            if(blockColision(this, 'r', this.room))
                this.x += this.speed
            if(playerSpike(this)) {
                createParticles(this, this, this.room)
                playerRemove(this)
            }
        }
    }
}

function onPlayerConnect(socket, name, team) {
    
    var player = new Player(0, 0, name, socket.room, team)
    rooms[socket.room].players[name] = player
    rooms[socket.room].initPack.player.push({
        id: player.id,
        x: player.x,
        y: player.y,
        color: player.color,
        lineWidth: player.lineWidth,
        strokeStyle: player.strokeStyle
    })

    socket.on('keyPress', data => {
        player.keys[data.key] = data.bool
    })

    socket.on('sheild', data => {
        player.sheild = data.bool
    })

    socket.on('shoot', data => {

        if(player.alive) {
            const angle = Math.atan2(data.dirY - player.y, data.dirX - player.x)
            
            if(data.bomb) {
                const velocity = {
                    x: 6* Math.cos(angle),
                    y: 6* Math.sin(angle)
                }
                rooms[data.room].explosives.push(new Explosive(player, player.x, player.y, data.dirX, data.dirY, velocity, Math.hypot(data.dirX - player.x, data.dirY - player.y)))
            } else {
                const velocity = {
                    x: 11* Math.cos(angle),
                    y: 11* Math.sin(angle)
                }
                rooms[data.room].projectiles.push(new Projectile(player, player.x, player.y, player.color, velocity))
                rooms[data.room].sfx.push(data.soundFile)
            }
        }                                           
    }) 
}

function playerUpdate(room) {
    var pack = []

    for(let i in rooms[room].players) {
        var player = rooms[room].players[i]

        if(player.radius < 8) playerRemove(player)

        if(player.alive) {
            player.update()

            if(player.sheild && player.armour > 0) {
               pack.push({
                id: player.id,
                sheild: true,
                x: player.x,
                y: player.y,
                radius: player.radius,
                lineWidth: player.armour,
                strokeStyle: 'rgba(255, 255, 255, 0.7)'
               }) 
            }
            else {
                pack.push({
                    id: player.id,
                    sheild: false,
                    x: player.x,
                    y: player.y,
                    radius: player.radius,
                    lineWidth: 0,
                    strokeStyle: 'rgba(255, 255, 255, 0)'
                })
            }
        }
    }

    return pack
}

function playerRemove(player) {

    player.radius = 0
    player.x = -30
    player.y = -30
    player.alive = false
    player.spike = false
    playerRespawn(player)
}

function playerRespawn(player) {

    let reviver = rooms[player.room].Red
    if(player.team == 'blue') reviver = rooms[player.room].Blue

    if(reviver.working) {
        setTimeout(() => {
            player.alive = true
            player.y = rooms[player.room].canvasHeight /2
            player.x = player.team == 'red' ? 50 : rooms[player.room].canvasWidth - 50
            player.radius = 30
        }, 5000)  
    }
}

function playerSpike(player) {

    if((player.y <= player.radius +10) || (player.y >= rooms[player.room].canvasHeight - player.radius -10) || (player.x <= player.radius +10) || (player.x >= rooms[player.room].canvasWidth - player.radius -10)) {
        
        return true
    }

    return false
}

class Projectile {
    constructor(origin, x, y, color, velocity) {
        this.origin = origin
        this.x = x
        this.y = y
        this.radius = 5.5
        this.color = color
        this.velocity = velocity
        this.alive = true
    }

    update() {
        this.x += this.velocity.x
        this.y += this.velocity.y
    }
}

function removeProjectile(index, room) {
    setTimeout(() => {
        rooms[room].projectiles.splice(index, 1)
    }, 0)
}

function checkProjectile(proj, index, room) {

    if(!blockColision(proj, 'p', room)) {
        createParticles(proj, proj, room)
        removeProjectile(index, room)

        return false
    }
    
    let Red = rooms[room].Red
    if(proj.origin.team != Red.id) {
        if(Math.hypot(Red.x - proj.x, Red.y - proj.y) - Red.radius - proj.radius < 0) {
            createParticles(proj, proj, room)
            setTimeout(() => {
                rooms[room].Red.radius -= 0.1
            }, 0)
            removeProjectile(index, room)

            return false
        }
    } else {
        let Blue = rooms[room].Blue
        if(Math.hypot(Blue.x - proj.x, Blue.y - proj.y) - Blue.radius - proj.radius < 0) {
            createParticles(proj, proj, room)
            setTimeout(() => {
                rooms[room].Blue.radius -= 0.1
            }, 0)
            removeProjectile(index, room)

            return false
        }
    }

    if(proj.x + proj.radius < 0 || proj.x - proj.radius > rooms[room].canvasWidth || proj.y + proj.radius < 0 || proj.y - proj.radius > rooms[room].canvasHeight) {
        removeProjectile(index, room)
        
        return false
    }
   
    for(let i in rooms[room].players) {

        let player = rooms[room].players[i]

        if(player.team == proj.origin.team) continue

        if((Math.hypot(proj.x - player.x, proj.y - player.y) - proj.radius - player.radius < 0) && proj.origin != player && player.alive) {

            if(player.sheild) {
                createParticles(proj, proj, room)
            } else {
                createParticles(player, proj, room)
                setTimeout(() => {
                    player.radius -= 1
                }, 0)
            }
            removeProjectile(index, room)
            
            return false
        }
    }

    return true
}

function projectileUpdate(room) {
    var pack = []

    rooms[room].projectiles.forEach((proj, index) => {
        setTimeout(() => {
            proj.update()
        }, 0)

        if(checkProjectile(proj, index, room)) {
            pack.push({
                index: index,
                y: proj.y,
                x: proj.x,
                color: proj.color,
                radius: proj.radius,
            })
        }
    })

    return pack
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

    update() {
        this.velocity.x *= friction
        this.velocity.y *= friction
        this.x += this.velocity.x
        this.y += this.velocity.y
        this.alpha -= 0.01
    } 
}

function createParticles(enemy, proj, room) {

    if(enemy.alive) {
        for(let i = 0; i < Math.ceil(enemy.radius *0.2); i++) {
            rooms[room].particles.push(new Particle(proj.x, proj.y, Math.random() *2, enemy.color, 
                { x: (Math.random() -0.5) * (Math.random() *6),
                  y: (Math.random() -0.5) * (Math.random() *6)}))
        }    
    }
}

function particleUpdate(room) {
    var pack = []

    rooms[room].particles.forEach((particle, index) => {
        setTimeout(() => {
            particle.update()
        }, 0)

        if(particle.alpha > 0) {
            pack.push({
                y: particle.y,
                x: particle.x,
                color: particle.color,
                radius: particle.radius,
                alpha: particle.alpha
            })
        }
        else rooms[room].particles.splice(index, 1)
    })

    return pack       
}

class Explosive {
    constructor(origin, launch_x, launch_y, target_x, target_y, velocity, distance) {
        this.origin = origin
        this.radius = 30
        this.color = 'white'
        this.x = launch_x
        this.y = launch_y
        this.launch_x = launch_x
        this.launch_y = launch_y
        this.target_x = target_x
        this.target_y = target_y
        this.velocity = velocity
        this.distance = distance
        this.size = 1.5
    }

    update() {
        setTimeout(() => {
            this.radius += this.size
            this.y += this.velocity.y
            this.x += this.velocity.x
            
        }, 0)

        if(Math.hypot(this.launch_x - this.x, this.launch_y - this.y) >= this.distance /2) this.size = -1.5
    }
}

function removeExplosive(index, room) {
    setTimeout(() => {
        rooms[room].explosives.splice(index, 1)
    }, 0)
}

function checkExplosive(explosive, index, room) {

    if(Math.hypot(explosive.x - explosive.target_x, explosive.y - explosive.target_y) - explosive.radius /2 <= 0) {
        createArrows(explosive, room)
        removeExplosive(index, room)
        
        return false
    }

    return true
}

function explosiveUpdate(room) {
    var pack = []

    rooms[room].explosives.forEach((explosive, index) => {
        setTimeout(() => {
            explosive.update()
        }, 0)

        if(checkExplosive(explosive, index, room)) {
            pack.push({
                y: explosive.y,
                x: explosive.x,
                color: explosive.color,
                radius: explosive.radius,
            })
        }
    })

    return pack
}

function getSupply() {
//     let choice = Math.floor(Math.random() * 101)

//     if(choice > 15) {
//         if(choice < 40) return 'health'
//         if(choice < 50) return 'bomb'
//         if(choice < 70) return 'sheild'
//         if(choice < 90) return 'boost'
//         if(choice < 95) return 'tornado'

//         return 'nuke'
//     }
}

function updateSupply() {
//     var pack = []
//     var supply = (Math.floor(Math.random() *100) > 98) ? getSupply() : ''
//     pack.push({
//         x: Math.random() * canvasWidth,
//         y: Math.random() * canvasHeight,
//         supply: supply
//     })

//     return pack
}

const acceleration = 1.05

class Arrow {
    constructor(origin, x, y, radius, color, velocity) {
        this.origin = origin
        this.x = x
        this.y = y
        this.originX = x
        this.originY = y
        this.radius = radius
        this.color = color
        this.velocity = velocity
        this.alpha = 1
    }
    update() {
        this.velocity.x *= acceleration
        this.velocity.y *= acceleration
        this.x += this.velocity.x
        this.y += this.velocity.y
    } 
}

function createArrows(exp, room) {

    for(let i = 0; i < 60; i++) {
        
        rooms[room].arrows.push(new Arrow(exp.origin, exp.target_x, exp.target_y, Math.random() *12, 'white', 
            { x: (Math.random() -0.5) * (Math.random() *7),
              y: (Math.random() -0.5) * (Math.random() *7)}))
    }    
}

function arrowUpdate(room) {
    var pack = []

    rooms[room].arrows.forEach((arrow, index) => {
        setTimeout(() => {
            arrow.update()
        }, 0)

        if(Math.hypot(arrow.x - arrow.originX, arrow.y - arrow.originY) < 250) {
            pack.push({
                y: arrow.y,
                x: arrow.x,
                color: arrow.color,
                radius: arrow.radius,
                alpha: arrow.alpha
            })
        }
        else rooms[room].arrows.splice(index, 1)
    })

    return pack       
}

function checkArrowColision(player) {
    let damageRate = 1
    
    if(player.sheild) {
        damageRate = 0.3
    }

    rooms[player.room].arrows.forEach(arrow => {
        let Red = rooms[player.room].Red

        if(Math.hypot(Red.x - arrow.x, Red.y - arrow.y) - Red.radius - arrow.radius < 0) {
            setTimeout(() => {
                rooms[player.room].Red.radius -= 0.001
            }, 0)
        }

        let Blue = rooms[player.room].Blue

        if(Math.hypot(Blue.x - arrow.x, Blue.y - arrow.y) - Blue.radius - arrow.radius < 0) {
            setTimeout(() => {
                rooms[player.room].Blue.radius -= 0.001
            }, 0)
        }
        
        if(Math.hypot(player.x - arrow.x, player.y - arrow.y) - player.radius - arrow.radius < 1) {
            
            createParticles(player, player, player.room)
            player.radius  = (player.radius <= 8) ? 0 : player.radius - 0.2* arrow.radius *damageRate

            if(player instanceof Dummy && player.radius <= 8) {
                if(arrow.origin.team == 'red') rooms[player.room].Red.score += 1
                else rooms[player.room].Blue.score += 1
            }
        }
    })
}

function blockCreate(room) {
    
    for(let i = 0; i < 4; i++) {
        
        if(i < 2) {
            let posX = i == 0 ? rooms[room].canvasWidth /3 : rooms[room].canvasWidth - rooms[room].canvasWidth /3 -20
            rooms[room].blocks.push({
                color: 'white',
                x: posX,
                y: rooms[room].canvasHeight /5,
                width: 20,
                height: 80
           })
        }
        else {
            let posX = i == 2 ? rooms[room].canvasWidth /3 : rooms[room].canvasWidth - rooms[room].canvasWidth /3 -20
            rooms[room].blocks.push({
                color: 'white',
                x: posX,
                y: rooms[room].canvasHeight - rooms[room].canvasHeight /5 -120,
                width: 20,
                height: 80
           })
        }
        rooms[room].initPack.block.push(rooms[room].blocks[i])
    }
}

function removeBlock(index, room) {
    rooms[room].removePack.block.push(index)
    rooms[room].blocks.splice(index, 1)
}

function blockColision(entity, s, room) {

    let p = entity.x
    let q = entity.y
    let r = entity.radius

    for(let i = 0; i < rooms[room].blocks.length; i++) {
        let b = rooms[room].blocks[i]

        if(s == 'p' || s == 'e') {

            if((p + r >= b.x && p + r <= b.x + b.width && q <= b.y + b.height + r && q >= b.y - r) || (q >= b.y + b.height && q - r <= b.y + b.height && q - r >= b.y && p >= b.x - r && p <= b.x + b.width + r) || (q <= b.y && q + r >= b.y && q + r <= b.y + b.height && p >= b.x - r && p <= b.x + b.width + r) || (p - r <= b.x + b.width && p - r >= b.x && q - r <= b.y + b.height && q >= b.y - r)) {

                if(s == 'p') {
                    b.width -= 0.5
                    io.sockets.in(room).emit('block', i)
                }

                if(b.width <= 5) {
                    // rooms[room].removePack.block.push(i)
                    // rooms[room].blocks.splice(i, 1)
                    removeBlock(i, room)
                }
                // else rooms[room].updateBlock.push(i)

                return false
            }
        }

        //right
        if(s == 'r')  {

            if(p + r >= b.x && p + r <= b.x + b.width && q <= b.y + b.height + r && q >= b.y - r) {
                return false
            }
        }

        //up
        if(s == 'u') {
            
            if(q >= b.y + b.height && q - r <= b.y + b.height && q - r >= b.y && p >= b.x - r && p <= b.x + b.width + r) {
                return false
            }
        }
        
        //bottom
        if(s == 'b') {
            
            if(q <= b.y && q + r >= b.y && q + r <= b.y + b.height && p >= b.x - r && p <= b.x + b.width + r) {
                return false
            }
        }

        // left
        if(s == 'l') {

            if(p - r <= b.x + b.width && p - r >= b.x && q - r <= b.y + b.height && q >= b.y - r) return false
        }

        
    }
    return true
}

class Dummy {
    constructor(x, y, radius, color, velocity, room) {
        this.x = x
        this.y = y
        this.room = room
        this.radius = radius       
        this.color = color
        this.velocity = velocity
        this.alive = true
    }

    update() {

        this.x += this.velocity.x
        this.y += this.velocity.y
    }
}

function createDummy(room) {
    setInterval(() => {

    let radius = Math.random() * (30 - 7) + 7
    let x, y

    if(Math.random() < 0.5) {
        x = Math.random() < 0.5 ? 0 - radius : rooms[room].canvasWidth + radius
        y = Math.random() * rooms[room].canvasHeight
    }
    else {
        y = Math.random() < 0.5 ? 0 - radius : rooms[room].canvasHeight + radius
        x = Math.random() * rooms[room].canvasWidth 
    }

    const color = `hsl(${Math.random() * 360}, 50%, 50%)`
    let angle = Math.atan2(rooms[room].canvasHeight /2 -y, Math.random() * (rooms[room].canvasWidth *0.75 - rooms[room].canvasWidth *0.25) + rooms[room].canvasWidth *0.25 -x)
    const velocity = {
        x: Math.cos(angle),
        y: Math.sin(angle)
    }
    
    if(y <= rooms[room].canvasHeight /2 - rooms[room].Red.radius || y >= rooms[room].canvasHeight /2 + rooms[room].Red.radius)
    rooms[room].dummies.push(new Dummy(x, y, radius, color, velocity, room))
    }, 1000)
}

function removeDummy(index, room) {
    setTimeout(() => {
        rooms[room].dummies.splice(index, 1)
    }, 0)
}

function checkDummy(proj, index, room) {

    if(checkArrowColision(proj)) return false

    if(!blockColision(proj, 'e', room)) {
        return false
    }

    if(proj.x + proj.radius < 0 || proj.x - proj.radius > rooms[room].canvasWidth || proj.y + proj.radius < 0 || proj.y - proj.radius > rooms[room].canvasHeight) {
        removeDummy(index, room)
        return false
    }

    for(let i in rooms[room].projectiles) {
        let p = rooms[room].projectiles[i]

        if((Math.hypot(p.x - proj.x, p.y - proj.y) - p.radius - proj.radius) <= 1) {
            createParticles(proj, p, room)
            removeProjectile(i, room)

            if(proj.radius - 10 > 0) proj.radius -= 3
            else { 
                if(p.origin.team == 'blue') rooms[room].Blue.score += 1
                else rooms[room].Red.score += 1
                return false
            }
        }
    }

    for(let i in rooms[room].players) {
        var player = rooms[room].players[i]

        if((Math.hypot(proj.x - player.x, proj.y - player.y) - proj.radius - player.radius < 0)) {

            if(!player.sheild) {
                player.radius = 0
                playerRemove(player)
            }
            return false
        }
    }
    return true
}

function dummyUpdate(room) {
    var pack = []

    rooms[room].dummies.forEach((proj, index) => {
        proj.update()

        if(checkDummy(proj, index, room) && proj.radius != 0) {
            pack.push({
                y: proj.y,
                x: proj.x,
                color: proj.color,
                radius: proj.radius,
            })
        }
        else removeDummy(index, room)
    })

    return pack
}

function createRoomState(room) {
    rooms[room] = {
        start: false,
        team: 'red',
        playerList: [],
        sfx: [],
        canvasHeight: 0,
        canvasWidth: 0,
        Red: {
            id: 'red',
            x: 0,
            radius: 120,
            score: 0,
            working: true
        },
        Blue: {
            id: 'blue',
            radius: 120,
            score: 0,
            working: true
        },
        players: {},
        projectiles: [],
        dummies: [],
        arrows: [],
        particles: [],
        explosives: [],
        blocks: [],
        initPack: {player: [], projectile: [], block: []},
        removePack: {player: [], projectile: [], block: []}
    }
}

io.on('connection', socket => {
    console.log('connection...')
    socket.on('roomJoin', data => {
        socket.room = data.roomName

        if(!roomName.includes(data.roomName)) {
            roomName.push(data.roomName)
            createRoomState(data.roomName)
        } else {
        }

        if(!rooms[data.roomName].start) {
            socket.join(data.roomName)
            rooms[socket.room].playerList.push({
                    player: data.playerName,
                    team: rooms[socket.room].team
                })
        } else {
            socket.emit('unvalidRoom', data.playerName)
        }
        
        io.sockets.in(socket.room).emit('playerJoined', rooms[socket.room].playerList)
        onPlayerConnect(socket, data.playerName, rooms[socket.room].team)
        rooms[socket.room].team = rooms[socket.room].team == 'blue' ? 'red' : 'blue'

        socket.on('gameStart', data => {
            if(rooms[socket.room].playerList.length > 1) { 
                setTimeout(() => {
                    game(data.room)
                }, 2000)
                io.sockets.in(data.room).emit('game', {
                    players: rooms[data.room].players, 
                    blocks: rooms[data.room].blocks 
                })
            } else {
                io.sockets.in(socket.room).emit('lessPlayer', {})
            }
        })
    })
    
    socket.on('boundaries', data => {
        rooms[data.room].canvasWidth = data.width
        rooms[data.room].canvasHeight = data.height
        rooms[data.room].Red.y = rooms[data.room].canvasHeight /2
        rooms[data.room].Blue.y = rooms[data.room].canvasHeight /2
        rooms[data.room].Blue.x = rooms[data.room].canvasWidth
        rooms[data.room].players[data.name].x = (rooms[data.room].players[data.name].team == 'blue') ? rooms[data.room].canvasWidth - 50 : 50
        rooms[data.room].players[data.name].y = (rooms[data.room].canvasHeight /2)
        
    })

})

function game(room) {
    rooms[room].start = true
    blockCreate(room)
    let intervalID = setInterval(() => {

        if(rooms[room].Red.score >= 5) {
            setTimeout(() => {
                clearInterval(intervalID)
                io.sockets.in(room).emit('gameOver', 'RED WINS')
            }, 1000)
        }

        if(rooms[room].Blue.score >= 5) {
            setTimeout(() => {
                clearInterval(intervalID)
                io.sockets.in(room).emit('gameOver', 'BLUE WINS')
            }, 1000)
        }

        if(rooms[room].Red.radius <= 40) {
            rooms[room].Blue.score += 15
            rooms[room].Blue.working = false
            rooms[room].Blue.radius = 0
        }

        if(rooms[room].Blue.radius <= 40) {
            rooms[room].Red.score += 15
            rooms[room].Red.working = false
            rooms[room].Red.radius = 0
        }

        var displayPack = {
            particle: particleUpdate(room),
            supply: updateSupply(room),
            explosive: explosiveUpdate(room),
            arrow: arrowUpdate(room),
            projectile: projectileUpdate(room),
            dummy: dummyUpdate(room),
        }
        var pack = {
            RedRadius: rooms[room].Red.radius,
            BlueRadius: rooms[room].Blue.radius,
            player: playerUpdate(room),
            redScore: rooms[room].Red.score,
            blueScore: rooms[room].Blue.score
        }

        io.sockets.in(room).emit('init', rooms[room].initPack)
        io.sockets.in(room).emit('update', pack)
        io.sockets.in(room).emit('display', displayPack)
        io.sockets.in(room).emit('remove', rooms[room].removePack)

        rooms[room].initPack.player = []
        rooms[room].initPack.block = []
        rooms[room].removePack.player = []
        rooms[room].removePack.block = []
        rooms[room].sfx = []
    }, 10)

    createDummy(room)
}

serv.listen(port, () => {
    console.log('listening at 8000')
})