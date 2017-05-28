let express = require('express');
let path = require('path');
let Message = require('./model').Message;
/*express是一个函数，调用后会返回一个HTTP的监听函数*/
let app = express();
/*把node_modules作为静态文件根目录*/
app.use(express.static(path.resolve('../node_modules')));
/*当客户端用get方式访问‘/’路径的时候，服务器端返回index.html文件*/
app.get('/',function (req,res) {
    res.sendFile(path.resolve('index.html'));
});
/*
app.listen(8080);*/
/*创建一个HTTP服务器*/
let server = require('http').createServer(app);
/*创建一个IO，并且把server作为参数传入进来*/
let io = require('socket.io')(server);
let sockets = {};
/*监听客户端的连接，当连接到来的时候执行对应的函数*/
io.on('connection',function (socket) {
    let username;
    let currentRoom;
    /*当服务器端接收到客户端的消息的之后执行回调函数，msg就是对应的消息*/
    socket.on('message',function (msg) {
        if(username){
            let reg = /@([^\s]+) (.+)/;
            let result = msg.match(reg);
            if(result){
                let toUser = result[1];
                let content = result[2];
                socket.send({username,content,createAt : new Date().toLocaleString()});
                sockets[toUser].send({username,content,createAt : new Date().toLocaleString()});
            }else{
                Message.create({username,content:msg},function (err,message) {
                    if(currentRoom){
                        io.in(currentRoom).emit('message',message);
                    }else{
                        io.emit('message',message);/*广播给所有人*/
                    }
                });
            }
        }else{
            username = msg;
            sockets[username] = socket;
            io.emit('message',{username:'系统',content:`欢迎${username}来到聊天室`,createAt:new Date().toLocaleString()});/*广播给所有人*/
        }
    });
    /*服务器监听到消息，客户端想获取最近的20条数据*/
    socket.on('getAllMessages',function () {
        /*查询出最近的20条数据并发送给客户端*/
        Message.find().sort({createAt:-1}).limit(20).exec(function (err,messages) {
            messages.reverse();
            socket.emit('allMessages',messages);
        })
    });
    /*监听客户想加入房间的事件*/
    socket.on('join',function (roomName) {
        /*如果此客户端此时在某个房间内，则让他离开这个房间*/
        if(currentRoom){
            socket.leave(currentRoom);
        }
        /*让此socket对象进入此房间*/
       socket.join(roomName);
       currentRoom = roomName;
    });
    /*监听客户端想删除某个消息的事件*/
    socket.on('delete',function (id) {
        Message.remove({_id:id},function (err,result) {
           io.emit('deleted',id);
        });
    })
});
server.listen(8080);
/*
* 一：实现匿名聊天
*    1. 给按钮绑定事件或者给表单绑定事件
*    2. 在提交表单的时候1取消默认事件，2获取消息内容发送
* 给服务器
*    3. 服务器接收到客户端发送过来的消息，广播给所有的客户端
*    4. 其他客户端收到消息后会把放到消息列表里边显示
*
* 二：实现具名聊天
*     1. 当客户端连接上服务器之后，第一次说的话会作为他的用户名。
*     2. 以后每次这个客户端再发言，那么就会认为是此用户名发的言
*
* 三：实现私人聊天
* 四：实现消息持久化
* 五：在页面加载完成后显示最近20条历史消息
* 六：建立房间
* */