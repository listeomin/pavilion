<?php
// Auto-detect BASE_PATH from request URI
function get_base_path() {
    $uri = $_SERVER['REQUEST_URI'] ?? '';
    if (strpos($uri, '/pavilion/') === 0) {
        return '/pavilion';
    }
    return '';
}

$basePath = get_base_path();
?>
<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<base href="<?php echo htmlspecialchars($basePath); ?>/">
<title>Лицензионное соглашение | Мурмурация</title>
<link rel="icon" href="assets/favicon.png" sizes="any">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Ubuntu+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/colors.css?v=1">
<link rel="stylesheet" href="css/base.css?v=6">
<link rel="stylesheet" href="css/navigation.css?v=7">
<link rel="stylesheet" href="css/doc.css?v=1">
</head>
<body>
<nav class="main-nav">
  <a href="./" class="nav-item">Мурмурация</a>
  <span class="nav-separator">|</span>
  <a href="branches" class="nav-item">Ветки</a>
  <span class="nav-separator">|</span>
  <a href="messages" class="nav-item">Послания</a>
  <span class="nav-separator">|</span>
  <a href="nest" class="nav-item">Гнездо</a>
</nav>
<div class="wrap">
  <div id="header-container">
    <h1>Лицензионное соглашение</h1>
  </div>

  <div class="doc-content">
    <p class="doc-date">Последнее обновление: 29.12.2025</p>
    <p class="doc-intro">Пожалуйста, внимательно ознакомьтесь с этим соглашением перед использованием нашего продукта.</p>

    <section class="doc-section">
      <h2>1. Общие положения</h2>
      <p><strong>1.1.</strong> Используя продукт компании, вы соглашаетесь с условиями этого соглашения.</p>
      <p><strong>1.2.</strong> Этот продукт находится на стадии разработки и предоставляется в информационных целях о текущей архитектуре безопасности.</p>
    </section>

    <section class="doc-section">
      <h2>2. Данные пользователя</h2>
      <p><strong>2.1.</strong> Все данные, которые вы создаете или загружаете в продукт, являются вашими личными данными.</p>
      <p><strong>2.2.</strong> Пользователь имеет право в любой момент сделать резервную копию (бэкап) всех своих данных по запросу.</p>
    </section>

    <section class="doc-section">
      <h2>3. Ограничения и риски</h2>
      <p><strong>3.1.</strong> Компания оставляет за собой право удалить все данные пользователя в случае угрозы безопасности разработчиков или системы («если нам жопа»).</p>
      <p><strong>3.2.</strong> Удаление данных осуществляется для защиты жизни и безопасности разработчиков и системы, а не для наказания пользователя.</p>
      <p><strong>3.3.</strong> Пользователь понимает и соглашается с тем, что в этом случае компания не несет ответственности за потерю данных.</p>
    </section>

    <section class="doc-section">
      <h2>4. Ответственность пользователя</h2>
      <p><strong>4.1.</strong> Пользователь подтверждает, что понимает концепцию безопасности продукта и принимает риск возможного удаления данных в критических ситуациях.</p>
      <p><strong>4.2.</strong> Пользователь несет ответственность за своевременное создание резервных копий, если хочет сохранить свои данные.</p>
    </section>

    <section class="doc-section">
      <h2>5. Заключительные положения</h2>
      <p><strong>5.1.</strong> Это соглашение регулируется принципами безопасности и философией продукта, а не отдельными техническими функциями, которые будут добавлены в будущем.</p>
      <p><strong>5.2.</strong> Компания оставляет за собой право вносить изменения в соглашение, уведомляя пользователей через доступные каналы.</p>
    </section>
  </div>

  <div class="doc-actions">
    <button id="download-pdf" class="doc-button primary">Скачать в PDF</button>
    <button id="send-email" class="doc-button secondary" disabled title="Функция в разработке">Отправить на почту</button>
  </div>
</div>

<script src="js/doc.js?v=1"></script>
</body>
</html>
