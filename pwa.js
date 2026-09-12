(() => {
  'use strict';
  const standalone = window.matchMedia('(display-mode: standalone)');
  const fullScreen = window.matchMedia('(display-mode: fullscreen)');
  const isInstalled = () => standalone.matches || fullScreen.matches || navigator.standalone === true;
  const installButtons = [];
  let installPrompt = null;
  let opener = null;

  const dialog = document.createElement('dialog');
  dialog.className = 'pwa-dialog';
  dialog.setAttribute('aria-labelledby', 'pwa-install-title');
  dialog.innerHTML = `
    <button type="button" class="pwa-close" aria-label="Κλείσιμο οδηγιών">×</button>
    <h2 id="pwa-install-title">Το ITSUPP στο κινητό σου</h2>
    <p>Πρόσθεσε το εικονίδιο στην αρχική οθόνη και συνδέσου με τον υπάρχοντα λογαριασμό σου.</p>
    <button type="button" class="btn-primary pwa-native-install" hidden>Εγκατάσταση ITSUPP</button>
    <p class="pwa-hint pwa-install-status" role="status" hidden></p>
    <section>
      <h3>iPhone / iPad</h3>
      <ol>
        <li>Άνοιξε το ITSUPP στο <strong>Safari</strong>.</li>
        <li>Πάτησε <strong>Κοινή χρήση</strong> (αν χρειάζεται, πρώτα <strong>⋯</strong>) και μετά <strong>Προσθήκη στην οθόνη Αφετηρίας</strong>.</li>
        <li>Ενεργοποίησε <strong>Άνοιγμα ως εφαρμογής Ιστού</strong>, αν εμφανίζεται, και πάτησε <strong>Προσθήκη</strong>.</li>
      </ol>
    </section>
    <section>
      <h3>Android</h3>
      <ol>
        <li>Άνοιξε το ITSUPP στο <strong>Chrome</strong>.</li>
        <li>Πάτησε <strong>⋮</strong> και βρες την <strong>Εγκατάσταση εφαρμογής</strong> ή την <strong>Προσθήκη στην αρχική οθόνη</strong>. Η ονομασία διαφέρει ανά έκδοση.</li>
        <li>Επιβεβαίωσε την εγκατάσταση.</li>
      </ol>
    </section>
    <p class="pwa-hint">Για σύνδεση, προβολή και αποθήκευση των δεδομένων χρειάζεται Internet.</p>`;
  document.body.append(dialog);
  const promptButton = dialog.querySelector('.pwa-native-install');
  const status = dialog.querySelector('.pwa-install-status');

  const syncInstallState = () => {
    installButtons.forEach(button => { button.hidden = isInstalled(); });
    promptButton.hidden = !installPrompt || isInstalled();
  };
  const closeDialog = () => {
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
    if (opener && opener.isConnected) opener.focus();
  };
  const addInstallButton = (parent, nav = false) => {
    if (!parent) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `pwa-install-link${nav ? ' pwa-nav-install' : ''}`;
    button.textContent = 'Εγκατάσταση στο κινητό';
    button.addEventListener('click', () => {
      opener = button;
      syncInstallState();
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    });
    parent.append(button);
    installButtons.push(button);
  };
  addInstallButton(document.querySelector('#auth-view'));
  addInstallButton(document.querySelector('#staff-nav'), true);
  // Clients have no staff sidebar. Keep the same installation help in their portal.
  addInstallButton(document.querySelector('#view-portal'));
  dialog.querySelector('.pwa-close').addEventListener('click', closeDialog);
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) closeDialog();
  });
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    syncInstallState();
  });
  promptButton.addEventListener('click', async () => {
    if (!installPrompt) return;
    const prompt = installPrompt;
    installPrompt = null;
    promptButton.hidden = true;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      status.textContent = choice.outcome === 'accepted'
        ? 'Ακολούθησε τις οδηγίες του κινητού για να ολοκληρωθεί η εγκατάσταση.'
        : 'Μπορείς να εγκαταστήσεις το ITSUPP αργότερα από το μενού του browser.';
    } catch {
      status.textContent = 'Χρησιμοποίησε τις οδηγίες για το κινητό σου παρακάτω.';
    }
    status.hidden = false;
  });
  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    installButtons.forEach(button => { button.hidden = true; });
    closeDialog();
  });
  standalone.addEventListener('change', syncInstallState);
  fullScreen.addEventListener('change', syncInstallState);
  syncInstallState();

  // Contain every table, including tables injected later by the existing app.
  const wrapTables = () => {
    document.querySelectorAll('table').forEach(table => {
      if (table.parentElement.classList.contains('pwa-table-scroll')) return;
      const wrapper = document.createElement('div');
      wrapper.className = 'pwa-table-scroll';
      wrapper.tabIndex = 0;
      wrapper.setAttribute('role', 'region');
      wrapper.setAttribute('aria-label', 'Πίνακας — κύλιση οριζόντια για όλες τις στήλες');
      table.before(wrapper);
      wrapper.append(table);
    });
  };
  wrapTables();
  new MutationObserver(records => {
    if (records.some(record => Array.from(record.addedNodes).some(node =>
      node.nodeType === 1 && (node.tagName === 'TABLE' || node.querySelector('table'))
    ))) wrapTables();
  }).observe(document.body, {childList: true, subtree: true});

  // Use the real top bar height after wrapping, rotation or standalone safe-area changes.
  const topbar = document.querySelector('.topbar');
  const syncTopbar = () => {
    if (topbar && topbar.offsetHeight) document.documentElement.style.setProperty('--topbar-h', `${topbar.offsetHeight}px`);
  };
  if (topbar && 'ResizeObserver' in window) new ResizeObserver(syncTopbar).observe(topbar);
  window.addEventListener('resize', syncTopbar);
  syncTopbar();
  const themeMeta = document.querySelector('#pwa-theme-color');
  const syncTheme = () => {
    if (themeMeta) themeMeta.content = document.documentElement.dataset.theme === 'dark' ? '#0E1516' : '#F5F8F8';
  };
  new MutationObserver(syncTheme).observe(document.documentElement, {attributes:true, attributeFilter:['data-theme']});
  syncTheme();

  const offlineBanner = document.createElement('p');
  offlineBanner.className = 'pwa-offline-banner';
  offlineBanner.setAttribute('role', 'status');
  offlineBanner.textContent = 'Δεν υπάρχει σύνδεση στο Internet. Οι αλλαγές δεν αποθηκεύονται. Συνδέσου ξανά πριν συνεχίσεις.';
  document.body.prepend(offlineBanner);
  const syncConnection = () => { offlineBanner.hidden = navigator.onLine; };
  window.addEventListener('online', syncConnection);
  window.addEventListener('offline', syncConnection);
  syncConnection();

  if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.register('./sw.js', {scope:'./', updateViaCache:'none'}).catch(error => {
      // Installation remains optional; never interrupt the existing application.
      console.warn('ITSUPP installation support:', error.message);
    });
  }
})();
