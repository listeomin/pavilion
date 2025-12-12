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
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Ubuntu+Mono&display=swap" rel="stylesheet">
<style>
  body { 
    font-family: Georgia, serif; 
    margin: 0; 
    padding: 0; 
    height: 100vh;
    overflow: hidden;
    background: #fff;
  }
  
  .wrap { 
    margin: 0 auto; 
    width: 100%; 
    max-width: 720px; 
    height: 100vh;
    padding: 120px 16px 160px; 
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
  }
  
  h1 {
    font-family: Georgia, serif;
    font-size: 38px;
    font-weight: normal;
    margin: 0 0 48px 0;
    color: rgba(0, 0, 0, 0.8);
  }
  
  #chat-log { 
    flex: 1;
    overflow-y: auto;
    margin-bottom: 48px;
    padding-right: 8px;
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE and Edge */
  }
  
  #chat-log::before {
    content: '';
    position: sticky;
    top: 0;
    left: 0;
    right: 0;
    height: 40px;
    background: linear-gradient(to bottom, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0) 100%);
    pointer-events: none;
    z-index: 1;
    display: block;
    margin-bottom: -40px;
  }
  
  #chat-log::-webkit-scrollbar {
    display: none; /* Chrome, Safari, Opera */
  }
  
  .msg { 
    margin: 0 0 16px 0; 
    font-size: 18px;
    line-height: 1.6;
    color: rgba(0, 0, 0, 0.8);
    opacity: 0;
    animation: fadeIn 0.3s ease-in forwards;
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .meta { 
    font-weight: normal;
  }
  
  .msg-text {
    display: inline;
  }
  
  .you { 
    margin-bottom: 8px; 
    font-size: 18px;
    color: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: baseline;
    gap: 4px;
  }
  
  .you-placeholder {
    color: rgba(0, 0, 0, 0.4);
    font-style: italic;
  }
  
  form { 
    display: block;
    margin-top: auto;
  }
  
  #text { 
    flex: 1;
    padding: 0;
    margin: 0;
    font-family: Georgia, serif;
    font-size: 18px;
    border: none;
    outline: none;
    background: transparent;
    color: rgba(0, 0, 0, 0.8);
    caret-color: rgba(0, 0, 0, 0.8);
    overflow-y: auto;
    overflow-x: hidden;
    min-height: 24px;
    max-height: 200px;
    line-height: 1.4;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
  
  #text:empty:before {
    content: attr(data-placeholder);
    color: rgba(0, 0, 0, 0.4);
    font-style: italic;
    pointer-events: none;
  }
  
  #text strong {
    font-weight: bold;
  }
  
  #text em {
    font-style: italic;
  }
  
  #text code {
    font-family: 'Ubuntu Mono', monospace;
    font-size: 16px;
    background: rgba(0, 0, 0, 0.05);
    padding: 1px 4px;
    border-radius: 3px;
  }
  
  button { 
    display: block;
    padding: 0;
    margin: 12px 0 0 0;
    font-family: 'Ubuntu Mono', monospace;
    font-size: 18px;
    border: none;
    background: transparent;
    color: rgba(0, 0, 0, 0.4);
    cursor: pointer;
    transition: all 0.2s;
    opacity: 0;
    pointer-events: none;
  }
  
  button.visible {
    opacity: 1;
    pointer-events: all;
  }
  
  button:hover { 
    color: rgba(0, 0, 0, 0.8);
  }
  
  code {
    font-family: 'Ubuntu Mono', monospace;
    font-size: 16px;
    background: rgba(0, 0, 0, 0.05);
    padding: 1px 4px;
    border-radius: 3px;
  }
  
  strong {
    font-weight: bold;
  }
  
  em {
    font-style: italic;
  }
  
  #format-menu {
    position: absolute;
    display: none;
    background: rgba(0, 0, 0, 0.85);
    border-radius: 6px;
    padding: 4px 6px;
    gap: 12px;
    align-items: center;
    z-index: 1000;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.15s;
  }
  
  #format-menu.visible {
    display: flex;
    pointer-events: all;
    opacity: 1;
  }
  
  #format-menu button {
    all: unset;
    font-family: Georgia, serif;
    font-size: 16px;
    color: rgba(255, 255, 255, 0.9);
    cursor: pointer;
    padding: 2px 4px;
    margin: 0;
    opacity: 1;
    pointer-events: all;
    transition: color 0.15s;
  }
  
  #format-menu button:hover {
    color: rgba(255, 255, 255, 1);
  }
  
  #format-menu button.mono {
    font-family: 'Ubuntu Mono', monospace;
    font-size: 14px;
  }
</style>
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
<script src="js/config.js?v=3"></script>
<script src="js/main.js?v=3"></script>
</body>
</html>
