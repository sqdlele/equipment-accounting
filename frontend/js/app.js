import { setupRouter, addRoute, render, navigate } from './router.js';
import { bindLayout, layout } from './layout.js';
import {
  adminPage, assetDetailPage, assetFormPage, assetsPage, dashboardPage,
  loginPage, movementsPage, repairDetailPage, repairsPage, reportsPage,
  warehousePage,
} from './pages/index.js';

const root = document.getElementById('app');

setupRouter({ root, layout });
bindLayout();

addRoute('/login', loginPage, { public: true });
addRoute('/', dashboardPage);
addRoute('/assets', assetsPage);
addRoute('/assets/new', assetFormPage);
addRoute('/assets/:id', assetDetailPage);
addRoute('/assets/:id/edit', assetFormPage);
addRoute('/movements', movementsPage);
addRoute('/warehouse-stock', warehousePage);
addRoute('/repairs', repairsPage);
addRoute('/repairs/:id', repairDetailPage);
addRoute('/reports', reportsPage);
addRoute('/admin', adminPage);
addRoute('*', () => {
  navigate('/', true);
  return '';
});

render();
