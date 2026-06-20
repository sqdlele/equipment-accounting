import { isAuthenticated, loadMe } from './auth.js';

const routes = [];
let outlet;
let renderLayout;

export function setupRouter({ root, layout }) {
  outlet = root;
  renderLayout = layout;
  window.addEventListener('popstate', () => render());
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[data-link]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href || href.startsWith('http')) return;
    event.preventDefault();
    navigate(href);
  });
}

export function addRoute(pattern, handler, options = {}) {
  if (pattern === '*') {
    routes.push({ pattern, regex: /^.*$/, names: [], handler, options });
    return;
  }
  const names = [];
  const regex = new RegExp(`^${pattern.replace(/:[^/]+/g, (m) => {
    names.push(m.slice(1));
    return '([^/]+)';
  })}/?$`);
  routes.push({ pattern, regex, names, handler, options });
}

export function navigate(path, replace = false) {
  if (replace) history.replaceState({}, '', path);
  else history.pushState({}, '', path);
  render();
}

export async function render() {
  const path = window.location.pathname;
  const route = routes.find((r) => r.regex.test(path)) || routes.find((r) => r.pattern === '*');
  const match = route?.regex?.exec(path);
  const params = {};
  route?.names?.forEach((name, idx) => { params[name] = match[idx + 1]; });

  if (route?.options?.public) {
    outlet.innerHTML = await route.handler({ params, query: new URLSearchParams(location.search) });
    return;
  }

  if (!isAuthenticated()) {
    navigate('/login', true);
    return;
  }

  await loadMe();
  const pageHtml = await route.handler({ params, query: new URLSearchParams(location.search) });
  outlet.innerHTML = renderLayout(pageHtml);
}
