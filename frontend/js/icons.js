const paths = {
  dashboard: 'M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z',
  inventory: 'M20 6h-4.18C15.4 4.84 14.3 4 13 4h-2C9.7 4 8.6 4.84 8.18 6H4v14h16V6ZM11 6h2v2h-2V6Zm7 12H6V8h2.18C8.6 9.16 9.7 10 11 10h2c1.3 0 2.4-.84 2.82-2H18v10Z',
  move: 'M7 7h11l-3-3 1.4-1.4L21.8 8l-5.4 5.4L15 12l3-3H7V7Zm10 10H6l3 3-1.4 1.4L2.2 16l5.4-5.4L9 12l-3 3h11v2Z',
  repair: 'M22 19.6 19.6 22l-6.1-6.1 2.4-2.4 6.1 6.1ZM14.7 6.3l3-3c.4-.4 1-.4 1.4 0l1.6 1.6c.4.4.4 1 0 1.4l-3 3-3-3ZM3 21v-3.8l10.6-10.6 3.8 3.8L6.8 21H3Z',
  request: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2Zm-8 14H7v-2h4v2Zm6-4H7v-2h10v2Zm0-4H7V7h10v2Z',
  reports: 'M5 3h14v18H5V3Zm3 4v2h8V7H8Zm0 4v2h8v-2H8Zm0 4v2h5v-2H8Z',
  settings: 'M19.4 13.5c.1-.5.1-1 .1-1.5s0-1-.1-1.5l2.1-1.6-2-3.5-2.5 1a7.3 7.3 0 0 0-2.6-1.5L14 2h-4l-.4 2.9C8.6 5.2 7.7 5.7 7 6.4l-2.5-1-2 3.5 2.1 1.6c-.1.5-.1 1-.1 1.5s0 1 .1 1.5l-2.1 1.6 2 3.5 2.5-1c.8.7 1.6 1.2 2.6 1.5L10 22h4l.4-2.9c1-.3 1.9-.8 2.6-1.5l2.5 1 2-3.5-2.1-1.6ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z',
  photo: 'M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2ZM8.5 11.5l2.5 3.01L14.5 10l4.5 6H5l3.5-4.5Z',
  check: 'M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2Z',
};

export function icon(name, className = 'icon') {
  const path = paths[name] || paths.dashboard;
  return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${path}"></path></svg>`;
}
