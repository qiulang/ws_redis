const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  })
  
  readline.question(`What's your name?`, name => {
    console.log(`Hi ${name}!`)
    readline.close()
    setTimeout(()=> {
      readline.question(`How are you?`, how => {
        console.log(`Good to know you are ${how}!`)
        // readline.close()
      })
    },4000)
  })
  