// FAQ estendido: modo defensivo.
// Nesta tela, as abas e a renderizacao principal ficam no HTML.
// Este arquivo so ativa a extensao se a aba/estrutura antiga de FAQ existir.

(function () {
  function startModule() {
    if (!window.OfficialContentPage) {
      setTimeout(startModule, 200);
      return;
    }

    const hasLegacyFaqTab = document.getElementById('official-faq');
    const hasLegacyFaqContainer = document.getElementById('faq-items');
    if (!hasLegacyFaqTab || !hasLegacyFaqContainer) {
      return;
    }

    const Page = window.OfficialContentPage;
    const originalFillFaq = typeof Page.fillFaq === 'function' ? Page.fillFaq.bind(Page) : null;

    Page.addFaqItem = function () {
      if (typeof originalFillFaq === 'function') {
        originalFillFaq();
      }
    };
  }

  if (document.readyState === 'complete') {
    startModule();
  } else {
    window.addEventListener('load', startModule);
  }
})();
