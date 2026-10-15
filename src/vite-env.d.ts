/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*?url' {
  const content: string;
  export default content;
}
