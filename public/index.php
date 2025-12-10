<?php
// index.php
// Minimal page. Place in chat/index.php
?>
<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Hhrrr Chat</title>
<style>
  body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, Arial; margin: 0; padding: 0; display:flex; height:100vh; }
  .wrap { margin:auto; width:100%; max-width:720px; padding:16px; box-sizing:border-box; }
  #chat-log { height:70vh; overflow:auto; border:1px solid #ddd; padding:12px; background:#fafafa; }
  .msg { margin:6px 0; font-size:14px; }
  .meta { color:#666; font-size:12px; margin-right:6px; }
  form { display:flex; gap:8px; margin-top:8px; }
  input[type="text"] { flex:1; padding:8px; font-size:14px; }
  button { padding:8px 12px; }
  .you { margin-bottom:8px; color:#333; font-weight:600; }
</style>
</head>
<body>
<div class="wrap">
  <div class="you" id="you">Загрузка...</div>
  <div id="chat-log" aria-live="polite"></div>

  <form id="sendForm">
    <input id="text" type="text" autocomplete="off" placeholder="Написать сообщение..." />
    <button type="submit">Отправить</button>
  </form>
</div>
<script src="js/main.js"></script>
</body>
</html>
