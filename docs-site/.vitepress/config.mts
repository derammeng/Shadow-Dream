import { defineConfig } from 'vitepress';

const base = process.env.DOCS_BASE || '/';

export default defineConfig({
  lang: 'zh-CN',
  title: 'Shadow Dream',
  description: '影梦 · 把 QQ 接入 OneBot 11 的轻量运行时',
  base,
  cleanUrls: true,
  // 代码块统一用深色底 + 浅色语法，和首页终端卡片保持一致。
  markdown: {
    theme: { light: 'vitesse-dark', dark: 'vitesse-dark' },
  },
  head: [
    ['meta', { name: 'theme-color', content: '#fdfbff' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}logo.svg` }],
    ['link', { rel: 'apple-touch-icon', href: `${base}logo.svg` }],
  ],
  vite: {
    server: {
      // 编辑器 / 工具在写文件时会留下临时目录，Windows 下监听它们会抛 EBUSY。
      watch: {
        ignored: ['**/*.tmpdir/**', '**/*.tmp', '**/.vitepress/cache/**', '**/.vitepress/dist/**'],
      },
    },
  },
  themeConfig: {
    logo: { src: '/logo.svg', width: 30, height: 30 },
    nav: [
      { text: '指南', link: '/guide/introduction', activeMatch: '/guide/' },
      { text: 'API', link: '/api/onebot', activeMatch: '/api/' },
      { text: '更新日志', link: 'https://github.com/derammeng/Shadow-Dream/blob/main/CHANGELOG.md' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: '开始',
          items: [
            { text: 'Shadow Dream 是什么', link: '/guide/introduction' },
            { text: '安装', link: '/guide/install' },
            { text: '启动', link: '/guide/start' },
          ],
        },
        {
          text: '使用',
          items: [
            { text: 'WebUI 与 token', link: '/guide/webui' },
            { text: 'QQNT 插件', link: '/guide/qqnt' },
            { text: 'Linux 无头运行', link: '/guide/headless' },
            { text: '接入 Koishi', link: '/guide/koishi' },
          ],
        },
        {
          text: '上线',
          items: [
            { text: '公网安全', link: '/guide/public' },
            { text: '常见问题', link: '/guide/troubleshooting' },
          ],
        },
      ],
      '/api/': [
        {
          text: '接口',
          items: [
            { text: 'OneBot 11', link: '/api/onebot' },
            { text: 'WebUI API', link: '/api/webui' },
          ],
        },
      ],
    },
    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: '搜索文档', buttonAriaLabel: '搜索文档' },
          modal: {
            displayDetails: '显示详情',
            resetButtonTitle: '清除查询',
            backButtonTitle: '返回',
            noResultsText: '没有找到结果',
            footer: {
              selectText: '选择',
              selectKeyAriaLabel: '回车',
              navigateText: '切换',
              navigateUpKeyAriaLabel: '上箭头',
              navigateDownKeyAriaLabel: '下箭头',
              closeText: '关闭',
              closeKeyAriaLabel: 'Esc',
            },
          },
        },
      },
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/derammeng/Shadow-Dream' },
    ],
    editLink: {
      pattern: 'https://github.com/derammeng/Shadow-Dream/edit/main/docs-site/:path',
      text: '在 GitHub 上编辑此页',
    },
    docFooter: { prev: '上一页', next: '下一页' },
    outline: { level: [2, 3], label: '本页目录' },
    lastUpdated: {
      text: '最后更新',
      formatOptions: { dateStyle: 'short', timeStyle: 'short' },
    },
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '菜单',
    darkModeSwitchLabel: '主题',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式',
    footer: {
      message: 'Shadow Dream · 影梦 · 把 QQ 接进 OneBot 11',
      copyright: 'MIT License · 与腾讯无关',
    },
  },
});
