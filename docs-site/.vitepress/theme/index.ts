import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';

import HomeHero from './components/HomeHero.vue';
import FeatureGrid from './components/FeatureGrid.vue';
import StepList from './components/StepList.vue';
import CapabilityBoard from './components/CapabilityBoard.vue';
import CallToAction from './components/CallToAction.vue';
import './custom.css';

/**
 * 文档站主题：默认主题的结构 + 自定义首页组件 + 全局样式覆盖。
 * 首页用 `layout: page` 组合这些组件，文档页继续走默认的 doc 布局。
 */
export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('HomeHero', HomeHero);
    app.component('FeatureGrid', FeatureGrid);
    app.component('StepList', StepList);
    app.component('CapabilityBoard', CapabilityBoard);
    app.component('CallToAction', CallToAction);
  },
} satisfies Theme;
