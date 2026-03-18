// js/components-loader.js
async function carregarComponentes() {
  const load = async (id, file, options = {}) => {
    const target = document.getElementById(id);
    if (!target) return;

    try {
      const response = await fetch(`components/${file}`);
      if (!response.ok) {
        console.error(`Erro ao carregar ${file}`);
        return;
      }

      const html = await response.text();
      if (options.append) {
        target.insertAdjacentHTML('afterbegin', html);
      } else {
        target.innerHTML = html;
      }
    } catch (e) {
      console.error(e);
    }
  };

  await Promise.all([
    load('component-head', 'head.html', { append: true }),
    load('component-header', 'header.html'),
    load('component-sidebar', 'sidebar.html'),
    load('component-footer', 'footer.html')
  ]);

  if (typeof $ !== 'undefined') {
    $('[data-widget="treeview"]').Treeview('init');
    $('[data-widget="pushmenu"]').PushMenu('init');
  }
}

document.addEventListener('DOMContentLoaded', carregarComponentes);
