const sendToAll = (wss,message)=>{
    console.log(message)
      wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(message));
            }
        });
}
module.exports = {sendToAll}