const game = document.querySelector('.game')
const body = document.querySelector('body')
const userBack = document.querySelector('.user-bg')
const about = document.querySelector('.about')
const log = document.querySelector('.log')
const canvas = document.querySelector('canvas')
const form = document.querySelector('.data-form')
const back = document.querySelector('.back')
const name = document.querySelector('#name')
const login = document.querySelector('#login')
const change = document.querySelector('#change')

game.addEventListener('click', () => {
    game.classList.add('user')
    body.style.overflowX = "hidden"
    userBack.style.display = "block"
    setTimeout(() => {
        back.style.display = "block"
        form.style.display = "block"
        log.style.display = "block"
        game.innerHTML = ""
        game.classList.remove('game')
        canvas.height = 0
        about.style.display = "none"
    }, 600)
    let op = parseInt(window.getComputedStyle(userBack).getPropertyValue('opacity'))
    let ID = setInterval(() => {

        if(op > 1) {
            clearInterval(ID)
            return
        }
        else {
            op += 0.2
        }
        userBack.style.opacity = op + ""
    }, 100)
})

back.addEventListener('click', () => {
    userBack.style.display = "none"
    back.style.display = "none"
    form.style.display = "none"
    game.classList.remove('user')
    game.classList.add('game')
    log.style.display = "none"
    setTimeout(() => {
        game.innerHTML = '<img src="assets/images/bubble-buster.png" alt="">'
    }, 500)
    body.style.overflowX = "hidden"
    about.style.display = "block"
    canvas.height = 800
    userBack.style.opacity = "0"
})

let go = true

login.addEventListener('click', () => {
    
    if(go) {
        name.style.visibility = "hidden"
        change.innerText = 'Single '
        // login.innerText = 'Sign-up'
        go = false
    }
    else {
        name.style.visibility = "visible"
        change.innerText = 'Multiplayer '
        // login.innerText = 'Sign-in'
        go = true
    }
})