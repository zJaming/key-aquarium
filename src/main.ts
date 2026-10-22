import { createApp } from "vue";
import App from "./App.vue";
import "./styles.css";

/** 启动 Vue 应用并挂载桌面工具根组件。 */
function bootstrapApp(): void {
  createApp(App).mount("#app");
}

bootstrapApp();

