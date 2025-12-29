// Documentation page JavaScript

// Load html2pdf library
const script = document.createElement('script');
script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
document.head.appendChild(script);

// PDF download functionality
document.getElementById('download-pdf').addEventListener('click', async () => {
  const button = document.getElementById('download-pdf');
  const originalText = button.textContent;

  // Check if library is loaded
  if (typeof html2pdf === 'undefined') {
    alert('Библиотека PDF загружается, попробуйте через секунду...');
    return;
  }

  try {
    button.textContent = 'Генерация PDF...';
    button.disabled = true;

    // Get the content
    const element = document.querySelector('.wrap');

    // PDF options
    const opt = {
      margin: [15, 15, 15, 15],
      filename: 'Лицензионное_соглашение_Мурмурация.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Clone element and prepare for PDF
    const clone = element.cloneNode(true);

    // Remove buttons from clone
    const actions = clone.querySelector('.doc-actions');
    if (actions) actions.remove();

    // Remove navigation from clone
    const nav = document.querySelector('.main-nav');
    const navClone = nav ? nav.cloneNode(true) : null;

    // Generate PDF
    await html2pdf().set(opt).from(clone).save();

    button.textContent = originalText;
    button.disabled = false;
  } catch (error) {
    console.error('Ошибка при генерации PDF:', error);
    alert('Произошла ошибка при создании PDF. Попробуйте еще раз.');
    button.textContent = originalText;
    button.disabled = false;
  }
});

// Email button (placeholder)
document.getElementById('send-email').addEventListener('click', () => {
  alert('Функция отправки на почту находится в разработке');
});
