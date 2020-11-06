// controllers file for the rootRoutes requests
/* checkServer - returns a message to confirm that the server is operational */
function checkServer(){
    return new Promise((resolve,reject)=>{
        try{
            let confirmMessage = 'Server Online'
            resolve(confirmMessage)
        }
        catch(err){
            reject(err)
        }
    })
}

module.exports={
    checkServer:checkServer
}