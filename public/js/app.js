$(function(){
  $(window).on('resize',function(){
    var clientHeight = document.documentElement.clientHeight
    $('.app-user-list-body').height(clientHeight - 210)
    $('.app-chat-body').height(clientHeight - 100)
  }).resize()
  // 定义变量
  var userName
  var $appChatContent = $('.app-chat-content')
  var $elTemplate = $('#el_template')
  var $elInputMsg = $('#el_input_msg')
  var $elBtnSend = $('#el_btn_send')
  var $elBtnSendfile = $('#el_btn_sendfile')
  var $elUserList = $('#table_userlist')
  var $elBtnFileSend = $('#el_btn_file_send')
  var $elBtnFileCancel = $('#el_btn_file_cancel')
  var $elFileUploadElements = $('.app-file-container, .backup');  
  var  client = io.connect('http://localhost:8080',{
    reconnectionAttempts:5,//最多重连次数
    reconnection:true,//是否重连
    reconnectionDelay:5000,//重连延迟，多久重连
    reconnectionDelayMax:10000,//最大延迟时间
    timeout:5000,//超时时间
    autoConnect:true//自动连接
  })
  //工具方法
  function writeMsg(type,msg,title,isSelf){
    title = title || ((type === 'system') ? '系统消息' : 'User')
    console.log(title)
    var template = $elTemplate.html()
    .replace('${title}',title)
    .replace('${bgClass}',type === 'system' ? 'label-danger' : 'label-info')
    .replace(/\${pullRight}/g,isSelf ? 'pull-right':'')
    .replace('${textRight}',isSelf ? 'text-right':'')
    .replace('${info-icon}',type === 'system' ? 'glyphicon-info-sign' : 'glyphicon-user')
    .replace('${time}','00:00:01')
    .replace('${msg}',msg)
    $appChatContent.append($(template))
  }

  function sendMsg(msg, type){
    var msgObj = {
      type: type || 'text',
      data: msg,
      clientId: client.id
    }
    client.emit('server.newMsg', msgObj)
  }
  $elBtnSend.on('click',function(){
    var value = $elInputMsg.val()
    if(value){
      sendMsg(value)
      $elInputMsg.val('')
    }
  })
  $elBtnSendfile.on('click', function(){
    $('.app-file-container, .backup').show()
  })
  $elBtnFileCancel.on('click', function(){
    $elFileUploadElements.hide();
  });
  $elBtnFileSend.on('click', function(){
    var files = document.getElementById('el_file').files;
    if(files.length === 0){
      return window.alert('Must select a file.');
    }
    var file = files[0];
    //发送文件
    client.emit('server.sendfile', {
      clientId: client.id,
      file: file,
      fileName: file.name
    });
    $elFileUploadElements.hide();
  });
  $(document).on('paste', function(e){
    var originalEvent = e.originalEvent
    var items
    if(originalEvent.clipboardData && originalEvent.clipboardData.items){
      items = originalEvent.clipboardData.items
    }
    if(items){
      for(var i = 0,len = items.length; i< len; i++){
        var item = items[i]
        if(item.kind === 'file'){
          var pasteFile = item.getAsFile()
          if(pasteFile.size > 1024 * 1024){
            return
          }
          var reader = new FileReader()
          reader.onloadend = function(){
            var imgBase64Str = reader.result
            console.log('imgBase64Str',imgBase64Str)
            sendMsg(imgBase64Str, 'image')
          }
          // 读取数据
          reader.readAsDataURL(pasteFile)
        }
      }
    }
  })
  // 输入昵称
  do{
    userName = window.prompt('请输入您的昵称：')
  }while(!userName);
  $('#span_userName').text(userName)
  client.emit('server.online',userName)
  client.on('client.newMsg',function(msgObj){
    console.log('client.newMsg',msgObj)
    if(msgObj.type === 'image'){
      msgObj.data = '<img src="' + msgObj.data + '" alt="image" >'
    }
    writeMsg('user',msgObj.data,msgObj.userName,msgObj.clientId === client.id)
    $appChatContent[0].scrollTop = $appChatContent[0].scrollHeight// 滚动条与顶部的距离设置为滚动隐藏区域的高度
  })
  client.on('client.online', function(userName){
    writeMsg('system','[' + userName + '] 上线了 ') 
  })
  client.on('client.offline', function(userName){
    writeMsg('system','[' + userName + '] 下线了 ') 
  })
  client.on('client.onlineList', function(userList){
    $elUserList.find('tr').not(':eq(0)').remove()
    userList.forEach(function(userName){
      var $tr = $('<tr><td>' + userName + '</td></tr>')
      $elUserList.append($tr)
    })
  })
  var intervalId = setInterval(function(){
    client.emit('server.getOnlineList')
    //如果client断开，那么就停止刷新在线列表
    // if(client){
    //   clearInterval(intervalId)
    // }
  }, 10*1000)
  // client.on('reconnect',function(count){
  //   console.log('reconnect',count)
  // })
  // client.on('reconnect_attempt',function(count){
  //   console.log('reconnect_attempt',count)
  // })
  // client.on('reconnecting',function(count){
  //   console.log('reconnecting',count)
  // })
  // client.on('reconnect_error',function(err){
  //   console.log('reconnect_error',err)
  // })
  // client.on('reconnect_failed',function(){
  //   console.log('reconnect_failed')
  // })
  // client.on('error',function(error){
  //   console.log(error)
  // })

})



