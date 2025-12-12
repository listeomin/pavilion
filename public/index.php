<?php
// index.php
?>
<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Hhrrr Chat</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Ubuntu+Mono&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/base.css?v=4">
<link rel="stylesheet" href="css/chat.css?v=4">
<link rel="stylesheet" href="css/input.css?v=4">
<link rel="stylesheet" href="css/format-menu.css?v=4">
</head>
<body>
<div class="wrap">
  <h1>Беседка</h1>
  <div id="chat-log" aria-live="polite"></div>
  <div id="format-menu">
    <button data-format="bold" title="Bold">B</button>
    <button data-format="italic" title="Italic">i</button>
    <button data-format="code" class="mono" title="Code">code</button>
  </div>
  <form id="sendForm">
    <div class="you">
      <span id="you-label">Вы:</span>
      <div id="text" contenteditable="true" data-placeholder="напишите что-нибудь"></div>
    </div>
    <button type="submit" id="sendBtn">[отправить]</button>
  </form>
</div>
<script type="module" src="js/main.js?v=5"></script>
</body>
</html>
