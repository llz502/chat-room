'use strict'

var http = require('http')
var fs = require('fs');
var path = require('path')
var express = require('express')
var socketIo = require('socket.io')

var app = express()
app.use(express.static(path.join(__dirname,'./public')))
var server = http.Server(app)
var io = new socketIo(server,{
  pingTimeout:1000*10,//default 1000*60 超时时间
  pingInterval:1000*2,//default 1000*2.5 ping的频率
  transports:['websocket','polling'],
  allowUpgrades:true,//default true 传输方式是否允许升级
  httpCompression:true,//default true 使用加密
  path:'/socket.io',//客户端socket.io文件存放目录
  serveClient:true//是否提供客户端的socket.io-clinet
})

//用户认证
io.set('authorization',(handshakeData, accept) => {
  if(handshakeData.headers.cookie){
    handshakeData.headers.userId = Date.now()
    accept(null,true)
  }else{
    accept('Authorization Error',false)
  }
})

//通信开始连接
var getUserList = (usersMap) => {
  var userList = []
  for(let client of usersMap.values()){
    userList.push(client.userName)
  }
  return userList
}
var usersMap = new Map()
io.on('connection',(socket) => {
  // console.log(socket.handshake.headers.userId)
  socket.on('server.online',(userName) => {
    socket.userName = userName
    io.emit('client.online',userName)
  })  
  socket.on('server.newMsg', (msgObj) => {
    console.log(msgObj)
    msgObj.now = Date.now()
    msgObj.userName = socket.userName
    io.emit('client.newMsg',msgObj)
  })
  socket.on('server.getOnlineList', () => {
    socket.emit('client.onlineList',getUserList(usersMap))
  })
  socket.on('server.sendfile', (fileMsgObj) => {
    var filePath = path.resolve(__dirname, `./public/files/${fileMsgObj.fileName}`);
    fs.writeFileSync(filePath, fileMsgObj.file, 'binary');
    io.emit('client.file', {
      userName: socket.userName,
      now: Date.now(),
      data: fileMsgObj.fileName,
      clientId: fileMsgObj.clinetId
    });
  });
  socket.on('disconnect', () => {
    usersMap.delete(socket.id)
    socket.broadcast.emit('client.offline',socket.userName)
  })
  console.log(55)
  usersMap.set(socket.id,socket)
  for(let client of usersMap.values()){
    if(client.id !== socket.id){
      client.emit('online','welcome new freind come here!')
    }
  }
})

server.listen('8080',(err) => {
  if(err){
    return console.log(err)
  }
  console.log('server started,listening port %s',server.address().port)
})