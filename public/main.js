$(function () {
  let FADE_TIME = 150;
  let TYPING_TIMER_LENGTH = 400;
  let COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
  ];

  let $window = $(window);
  let $usernameInput = $('.usernameInput');
  let $messages = $('.messages');
  let $inputMessage = $('.inputMessage');

  let $loginPage = $('.login.page');
  let $chatPage = $('.chat.page');

  let username;
  let connected = false;
  let typing = false;
  let lastTypingTime;
  let $currentInput = $usernameInput.focus();

  let video = document.getElementById('output');

  function loadCam(stream) {
    video.srcObject = stream;
    console.log('good!!');
  }

  function loadCamFail(stream) {
    console.error('fail')
  }

  function viewVideo(video, context) {
    context.drawImage(video, 0, 0, context.width, context.height);
    socket.emit('stream', canvas.toDataURL('image/webp'));
  }

  let socket = io();

  // let canvas = document.getElementById("preview");
  // let context = canvas.getContext("2d");

  // canvas.width = 400;
  // canvas.height = 300;

  // context.width = canvas.width;
  // context.height = canvas.height;

  navigator.getUserMedia = (navigator.getUserMedia || 
    navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msgGetUserMedia) 

  if (navigator.getUserMedia) {
    navigator.getUserMedia({ video: true, audio: true}, loadCam, loadCamFail)
  }

  setInterval(() => {
    viewVideo(video, context);
  }, 500)

  function addParticipantsMessage(data) {
    let message = '';
    if (data.numUsers === 1) {
      message += "there's 1 participant";
    } else {
      message += "there are " + data.numUsers + " participants";
    }
    log(message);
  }

  function setUsername() {
    username = cleanInput($usernameInput.val().trim());

    if (username) {
      $loginPage.fadeOut();
      $chatPage.show();
      $loginPage.off('click');
      $currentInput = $inputMessage.focus();

      socket.emit('add user', username);
    }
  }

  function sendMessage() {
    let message = $inputMessage.val();
    message = cleanInput(message);
    if (message && connected) {
      $inputMessage.val('');
      addChatMessage({
        username: username,
        message: message
      });
      socket.emit('new message', message);
    }
  }

  function log(message, options) {
    let $el = $('<li>').addClass('log').text(message);
    addMessageElement($el, options);
  }

  function addChatMessage(data, options) {
    let $typingMessages = getTypingMessages(data);
    options = options || {};
    if ($typingMessages.length !== 0) {
      options.fade = false;
      $typingMessages.remove();
    }

    let $usernameDiv = $('<span class="username"/>')
      .text(data.username)
      .css('color', getUsernameColor(data.username));
    let $messageBodyDiv = $('<span class="messageBody">')
      .text(data.message);

    let typingClass = data.typing ? 'typing' : '';
    let $messageDiv = $('<li class="message"/>')
      .data('username', data.username)
      .addClass(typingClass)
      .append($usernameDiv, $messageBodyDiv);

    addMessageElement($messageDiv, options);
  }

  function addChatTyping(data) {
    data.typing = true;
    data.message = 'is typing';
    addChatMessage(data);
  }

  function removeChatTyping(data) {
    getTypingMessages(data).fadeOut(function () {
      $(this).remove();
    });
  }

  function addMessageElement(el, options) {
    let $el = $(el);

    if (!options) {
      options = {};
    }
    if (typeof options.fade === 'undefined') {
      options.fade = true;
    }
    if (typeof options.prepend === 'undefined') {
      options.prepend = false;
    }

    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
      $messages.prepend($el);
    } else {
      $messages.append($el);
    }
    $messages[0].scrollTop = $messages[0].scrollHeight;
  }

  function cleanInput(input) {
    return $('<div/>').text(input).text();
  }

  function updateTyping() {
    if (connected) {
      if (!typing) {
        typing = true;
        socket.emit('typing');
      }
      lastTypingTime = (new Date()).getTime();

      setTimeout(function () {
        let typingTimer = (new Date()).getTime();
        let timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
          socket.emit('stop typing');
          typing = false;
        }
      }, TYPING_TIMER_LENGTH);
    }
  }

  function getTypingMessages(data) {
    return $('.typing.message').filter(function (i) {
      return $(this).data('username') === data.username;
    });
  }

  function getUsernameColor(username) {
    let hash = 7;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    let index = Math.abs(hash % COLORS.length);
    return COLORS[index];
  }

  $window.keydown(function (event) {
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
      $currentInput.focus();
    }
    if (event.which === 13) {
      if (username) {
        sendMessage();
        socket.emit('stop typing');
        typing = false;
      } else {
        setUsername();
      }
    }
  });

  $inputMessage.on('input', function () {
    updateTyping();
  });

  $loginPage.click(function () {
    $currentInput.focus();
  });

  $inputMessage.click(function () {
    $inputMessage.focus();
  });

  socket.on('login', function (data) {
    connected = true;
    let message = "Welcome to Quick Chat! – ";
    log(message, {
      prepend: true
    });
    addParticipantsMessage(data);

    Swal.fire("Friend's Link: quick-chat-demo.herokuapp.com/visualizer.html")
    // Swal.fire({
    //   position: 'top-center',
    //   icon: 'success',
    //   title: 'Friend Link: quick-chat-demo.herokuapp.com/visualizer.html',
    //   showConfirmButton: true,
    //   timer: 5500
    // })
  });

  socket.on('new message', function (data) {
    addChatMessage(data);
  });

  socket.on('user joined', function (data) {
    log(data.username + ' joined');
    addParticipantsMessage(data);
  });

  socket.on('user left', function (data) {
    log(data.username + ' left');
    addParticipantsMessage(data);
    removeChatTyping(data);
  });

  socket.on('typing', function (data) {
    addChatTyping(data);
  });

  socket.on('stop typing', function (data) {
    removeChatTyping(data);
  });
});