// A distinct route is required for logout. The root URL ("/") is shared by
// app/index.tsx and (tabs)/index.tsx, so redirecting there from inside the tabs
// can resolve back to the tabs layout and create an infinite redirect loop.
export { default } from './index';
